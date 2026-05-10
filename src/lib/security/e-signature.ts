import crypto from 'crypto';
import prisma from '@/lib/prisma';

// ==================== Enums & Types ====================

export enum SignatureMeaning {
  AUTHORED = 'AUTHORED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RELEASED = 'RELEASED',
  WITNESSED = 'WITNESSED',
}

export enum SignatureStatus {
  VALID = 'VALID',
  REVOKED = 'REVOKED',
  TAMPERED = 'TAMPERED',
  EXPIRED = 'EXPIRED',
}

export enum AuditEventType {
  SIGNATURE_CREATED = 'SIGNATURE_CREATED',
  SIGNATURE_VERIFIED = 'SIGNATURE_VERIFIED',
  SIGNATURE_VERIFICATION_FAILED = 'SIGNATURE_VERIFICATION_FAILED',
  SIGNATURE_REVOKED = 'SIGNATURE_REVOKED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  BATCH_SIGNATURE_CREATED = 'BATCH_SIGNATURE_CREATED',
  COUNTER_SIGNATURE_CREATED = 'COUNTER_SIGNATURE_CREATED',
  TAMPER_DETECTED = 'TAMPER_DETECTED',
}

export interface ElectronicSignature {
  id: string;
  signerId: string;
  signerName: string;
  signerRole: string;
  documentType: string;
  documentId: string;
  documentHash: string;
  meaning: SignatureMeaning;
  timestamp: Date;
  ipAddress: string;
  verified: boolean;
}

export interface SignatureRecord extends ElectronicSignature {
  status: SignatureStatus;
  revokedAt?: Date;
  revokedBy?: string;
  revocationReason?: string;
  counterSignatureOf?: string;
  batchId?: string;
  signatureDigest: string;
}

export interface AuditEntry {
  id: string;
  eventType: AuditEventType;
  signatureId?: string;
  signerId?: string;
  documentType?: string;
  documentId?: string;
  ipAddress: string;
  userAgent?: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface SignatureCreateInput {
  signerId: string;
  signerName: string;
  signerRole: string;
  documentType: string;
  documentId: string;
  documentData: Record<string, unknown>;
  meaning: SignatureMeaning;
  ipAddress: string;
  userAgent?: string;
  password: string;
}

export interface BatchSignatureInput {
  signerId: string;
  signerName: string;
  signerRole: string;
  documents: Array<{
    documentType: string;
    documentId: string;
    documentData: Record<string, unknown>;
    meaning: SignatureMeaning;
  }>;
  ipAddress: string;
  userAgent?: string;
  password: string;
}

export interface CounterSignatureInput extends SignatureCreateInput {
  originalSignatureId: string;
}

export interface SignatureVerificationResult {
  valid: boolean;
  signature: SignatureRecord | null;
  reason?: string;
  tampered?: boolean;
}

export interface RevocationInput {
  signatureId: string;
  revokedBy: string;
  reason: string;
  ipAddress: string;
  userAgent?: string;
}

export interface SignatureManifest {
  generatedAt: string;
  generatedBy: string;
  documentType: string;
  documentId: string;
  documentHash: string;
  signatures: Array<{
    id: string;
    signerName: string;
    signerRole: string;
    meaning: string;
    timestamp: string;
    status: string;
    signatureDigest: string;
    counterSignatureOf?: string;
    revocationInfo?: {
      revokedAt: string;
      revokedBy: string;
      reason: string;
    };
  }>;
  auditTrail: Array<{
    eventType: string;
    timestamp: string;
    details: Record<string, unknown>;
  }>;
  integrityHash: string;
}

// ==================== Password Verification ====================

type PasswordVerifier = (userId: string, password: string) => Promise<boolean>;

/**
 * Default password verifier that checks against the database.
 * Uses bcrypt-compatible verification via the stored hash.
 */
async function defaultPasswordVerifier(userId: string, password: string): Promise<boolean> {
  // Look up user and their password hash from the database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, isActive: true },
  });

  if (!user || !user.isActive || !user.passwordHash) {
    return false;
  }

  // Use crypto.timingSafeEqual-based comparison for bcrypt hashes
  // The hash format is expected to be a standard bcrypt hash
  const { compare } = await import('bcryptjs');
  return compare(password, user.passwordHash);
}

// ==================== Document Hashing ====================

/**
 * Compute a SHA-256 hash of a document record.
 * The record is canonicalized (keys sorted) to ensure consistent hashing.
 */
export function computeDocumentHash(documentData: Record<string, unknown>): string {
  const canonicalized = canonicalize(documentData);
  return crypto.createHash('sha256').update(canonicalized, 'utf8').digest('hex');
}

/**
 * Deterministic JSON canonicalization for consistent hashing.
 * Sorts keys recursively and handles special types.
 */
function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj === 'string') {
    return JSON.stringify(obj);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (obj instanceof Date) {
    return JSON.stringify(obj.toISOString());
  }

  if (Array.isArray(obj)) {
    const items = obj.map((item) => canonicalize(item));
    return '[' + items.join(',') + ']';
  }

  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const pairs = keys.map((key) => JSON.stringify(key) + ':' + canonicalize(record[key]));
    return '{' + pairs.join(',') + '}';
  }

  return String(obj);
}

/**
 * Compute a digest that represents the signature itself (for integrity verification).
 */
function computeSignatureDigest(
  signerId: string,
  documentHash: string,
  meaning: SignatureMeaning,
  timestamp: Date
): string {
  const payload = `${signerId}:${documentHash}:${meaning}:${timestamp.toISOString()}`;
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

// ==================== Audit Logger ====================

class SignatureAuditLogger {
  private entries: AuditEntry[] = [];

  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<AuditEntry> {
    const fullEntry: AuditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.entries.push(fullEntry);

    // Persist to database
    try {
      await prisma.$executeRaw`
        INSERT INTO "SignatureAuditLog" (
          "id", "eventType", "signatureId", "signerId",
          "documentType", "documentId", "ipAddress", "userAgent",
          "details", "timestamp"
        ) VALUES (
          ${fullEntry.id}, ${fullEntry.eventType}, ${fullEntry.signatureId ?? null},
          ${fullEntry.signerId ?? null}, ${fullEntry.documentType ?? null},
          ${fullEntry.documentId ?? null}, ${fullEntry.ipAddress},
          ${fullEntry.userAgent ?? null}, ${JSON.stringify(fullEntry.details)}::jsonb,
          ${fullEntry.timestamp}
        )
      `;
    } catch {
      // If the table doesn't exist yet, store in memory only
      // In production, this table should be created via migration
      console.error('[E-Signature Audit] Failed to persist audit entry to database');
    }

    return fullEntry;
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  getEntriesForDocument(documentType: string, documentId: string): AuditEntry[] {
    return this.entries.filter(
      (e) => e.documentType === documentType && e.documentId === documentId
    );
  }

  getEntriesForSignature(signatureId: string): AuditEntry[] {
    return this.entries.filter((e) => e.signatureId === signatureId);
  }
}

// ==================== Electronic Signature Service ====================

export class ElectronicSignatureService {
  private signatures: Map<string, SignatureRecord> = new Map();
  private auditLogger: SignatureAuditLogger;
  private verifyPassword: PasswordVerifier;

  constructor(passwordVerifier?: PasswordVerifier) {
    this.auditLogger = new SignatureAuditLogger();
    this.verifyPassword = passwordVerifier ?? defaultPasswordVerifier;
  }

  /**
   * Create an electronic signature on a document.
   * Requires re-authentication via password (21 CFR Part 11 compliance).
   */
  async sign(input: SignatureCreateInput): Promise<SignatureRecord> {
    // Re-authentication requirement (21 CFR Part 11)
    const authenticated = await this.verifyPassword(input.signerId, input.password);

    if (!authenticated) {
      await this.auditLogger.log({
        eventType: AuditEventType.AUTHENTICATION_FAILED,
        signerId: input.signerId,
        documentType: input.documentType,
        documentId: input.documentId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        details: {
          meaning: input.meaning,
          reason: 'Password verification failed during signature attempt',
        },
      });

      throw new SignatureAuthenticationError(
        'Authentication failed. Signature requires valid credentials.'
      );
    }

    // Compute document hash
    const documentHash = computeDocumentHash(input.documentData);
    const timestamp = new Date();
    const signatureId = crypto.randomUUID();

    const signatureDigest = computeSignatureDigest(
      input.signerId,
      documentHash,
      input.meaning,
      timestamp
    );

    const signature: SignatureRecord = {
      id: signatureId,
      signerId: input.signerId,
      signerName: input.signerName,
      signerRole: input.signerRole,
      documentType: input.documentType,
      documentId: input.documentId,
      documentHash,
      meaning: input.meaning,
      timestamp,
      ipAddress: input.ipAddress,
      verified: true,
      status: SignatureStatus.VALID,
      signatureDigest,
    };

    // Persist signature
    this.signatures.set(signatureId, signature);
    await this.persistSignature(signature);

    // Audit log
    await this.auditLogger.log({
      eventType: AuditEventType.SIGNATURE_CREATED,
      signatureId,
      signerId: input.signerId,
      documentType: input.documentType,
      documentId: input.documentId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: {
        meaning: input.meaning,
        signerName: input.signerName,
        signerRole: input.signerRole,
        documentHash,
        signatureDigest,
      },
    });

    return signature;
  }

  /**
   * Batch sign multiple documents with a single re-authentication.
   * More efficient for workflows where multiple documents need the same signer.
   */
  async batchSign(input: BatchSignatureInput): Promise<SignatureRecord[]> {
    // Single re-authentication for the entire batch
    const authenticated = await this.verifyPassword(input.signerId, input.password);

    if (!authenticated) {
      await this.auditLogger.log({
        eventType: AuditEventType.AUTHENTICATION_FAILED,
        signerId: input.signerId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        details: {
          reason: 'Password verification failed during batch signature attempt',
          documentCount: input.documents.length,
        },
      });

      throw new SignatureAuthenticationError(
        'Authentication failed. Batch signature requires valid credentials.'
      );
    }

    const batchId = crypto.randomUUID();
    const signatures: SignatureRecord[] = [];

    for (const doc of input.documents) {
      const documentHash = computeDocumentHash(doc.documentData);
      const timestamp = new Date();
      const signatureId = crypto.randomUUID();

      const signatureDigest = computeSignatureDigest(
        input.signerId,
        documentHash,
        doc.meaning,
        timestamp
      );

      const signature: SignatureRecord = {
        id: signatureId,
        signerId: input.signerId,
        signerName: input.signerName,
        signerRole: input.signerRole,
        documentType: doc.documentType,
        documentId: doc.documentId,
        documentHash,
        meaning: doc.meaning,
        timestamp,
        ipAddress: input.ipAddress,
        verified: true,
        status: SignatureStatus.VALID,
        signatureDigest,
        batchId,
      };

      this.signatures.set(signatureId, signature);
      await this.persistSignature(signature);
      signatures.push(signature);
    }

    // Audit the batch operation
    await this.auditLogger.log({
      eventType: AuditEventType.BATCH_SIGNATURE_CREATED,
      signerId: input.signerId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: {
        batchId,
        documentCount: input.documents.length,
        signatureIds: signatures.map((s) => s.id),
        documents: input.documents.map((d) => ({
          documentType: d.documentType,
          documentId: d.documentId,
          meaning: d.meaning,
        })),
      },
    });

    return signatures;
  }

  /**
   * Create a counter-signature on a previously signed document.
   * Used when multiple signers are required (e.g., witness, reviewer).
   */
  async counterSign(input: CounterSignatureInput): Promise<SignatureRecord> {
    // Verify original signature exists and is valid
    const originalSignature = this.signatures.get(input.originalSignatureId);
    if (!originalSignature) {
      throw new SignatureNotFoundError(
        `Original signature "${input.originalSignatureId}" not found`
      );
    }

    if (originalSignature.status !== SignatureStatus.VALID) {
      throw new SignatureValidationError(
        `Cannot counter-sign a ${originalSignature.status.toLowerCase()} signature`
      );
    }

    // Ensure the counter-signer is different from the original signer
    if (input.signerId === originalSignature.signerId) {
      throw new SignatureValidationError(
        'Counter-signer must be different from the original signer'
      );
    }

    // Re-authenticate the counter-signer
    const authenticated = await this.verifyPassword(input.signerId, input.password);

    if (!authenticated) {
      await this.auditLogger.log({
        eventType: AuditEventType.AUTHENTICATION_FAILED,
        signerId: input.signerId,
        documentType: input.documentType,
        documentId: input.documentId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        details: {
          reason: 'Password verification failed during counter-signature attempt',
          originalSignatureId: input.originalSignatureId,
        },
      });

      throw new SignatureAuthenticationError(
        'Authentication failed. Counter-signature requires valid credentials.'
      );
    }

    const documentHash = computeDocumentHash(input.documentData);
    const timestamp = new Date();
    const signatureId = crypto.randomUUID();

    const signatureDigest = computeSignatureDigest(
      input.signerId,
      documentHash,
      input.meaning,
      timestamp
    );

    const signature: SignatureRecord = {
      id: signatureId,
      signerId: input.signerId,
      signerName: input.signerName,
      signerRole: input.signerRole,
      documentType: input.documentType,
      documentId: input.documentId,
      documentHash,
      meaning: input.meaning,
      timestamp,
      ipAddress: input.ipAddress,
      verified: true,
      status: SignatureStatus.VALID,
      signatureDigest,
      counterSignatureOf: input.originalSignatureId,
    };

    this.signatures.set(signatureId, signature);
    await this.persistSignature(signature);

    await this.auditLogger.log({
      eventType: AuditEventType.COUNTER_SIGNATURE_CREATED,
      signatureId,
      signerId: input.signerId,
      documentType: input.documentType,
      documentId: input.documentId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: {
        meaning: input.meaning,
        signerName: input.signerName,
        signerRole: input.signerRole,
        originalSignatureId: input.originalSignatureId,
        documentHash,
        signatureDigest,
      },
    });

    return signature;
  }

  /**
   * Verify a signature against the current state of a document.
   * Detects tampering if the document has changed since signing.
   */
  async verify(
    signatureId: string,
    currentDocumentData: Record<string, unknown>,
    ipAddress: string,
    userAgent?: string
  ): Promise<SignatureVerificationResult> {
    const signature = this.signatures.get(signatureId);

    if (!signature) {
      await this.auditLogger.log({
        eventType: AuditEventType.SIGNATURE_VERIFICATION_FAILED,
        signatureId,
        ipAddress,
        userAgent,
        details: { reason: 'Signature not found' },
      });

      return {
        valid: false,
        signature: null,
        reason: 'Signature not found',
      };
    }

    // Check if signature has been revoked
    if (signature.status === SignatureStatus.REVOKED) {
      await this.auditLogger.log({
        eventType: AuditEventType.SIGNATURE_VERIFICATION_FAILED,
        signatureId,
        signerId: signature.signerId,
        documentType: signature.documentType,
        documentId: signature.documentId,
        ipAddress,
        userAgent,
        details: {
          reason: 'Signature has been revoked',
          revokedAt: signature.revokedAt?.toISOString(),
          revocationReason: signature.revocationReason,
        },
      });

      return {
        valid: false,
        signature,
        reason: `Signature revoked: ${signature.revocationReason}`,
      };
    }

    // Recompute document hash and compare (tamper detection)
    const currentHash = computeDocumentHash(currentDocumentData);
    const hashesMatch = crypto.timingSafeEqual(
      Buffer.from(signature.documentHash, 'hex'),
      Buffer.from(currentHash, 'hex')
    );

    if (!hashesMatch) {
      // Document has been tampered with
      signature.status = SignatureStatus.TAMPERED;

      await this.auditLogger.log({
        eventType: AuditEventType.TAMPER_DETECTED,
        signatureId,
        signerId: signature.signerId,
        documentType: signature.documentType,
        documentId: signature.documentId,
        ipAddress,
        userAgent,
        details: {
          originalHash: signature.documentHash,
          currentHash,
          reason: 'Document has been modified after signing',
        },
      });

      return {
        valid: false,
        signature,
        reason: 'Document has been modified after signing (tamper detected)',
        tampered: true,
      };
    }

    // Verify signature digest integrity
    const expectedDigest = computeSignatureDigest(
      signature.signerId,
      signature.documentHash,
      signature.meaning,
      signature.timestamp
    );

    const digestValid = crypto.timingSafeEqual(
      Buffer.from(signature.signatureDigest, 'hex'),
      Buffer.from(expectedDigest, 'hex')
    );

    if (!digestValid) {
      await this.auditLogger.log({
        eventType: AuditEventType.TAMPER_DETECTED,
        signatureId,
        signerId: signature.signerId,
        documentType: signature.documentType,
        documentId: signature.documentId,
        ipAddress,
        userAgent,
        details: { reason: 'Signature digest mismatch - signature record may have been tampered' },
      });

      return {
        valid: false,
        signature,
        reason: 'Signature integrity check failed',
        tampered: true,
      };
    }

    // Verification successful
    await this.auditLogger.log({
      eventType: AuditEventType.SIGNATURE_VERIFIED,
      signatureId,
      signerId: signature.signerId,
      documentType: signature.documentType,
      documentId: signature.documentId,
      ipAddress,
      userAgent,
      details: { documentHash: currentHash },
    });

    return {
      valid: true,
      signature,
    };
  }

  /**
   * Revoke a signature with a reason.
   * Revoked signatures will fail verification.
   */
  async revoke(input: RevocationInput): Promise<SignatureRecord> {
    const signature = this.signatures.get(input.signatureId);

    if (!signature) {
      throw new SignatureNotFoundError(`Signature "${input.signatureId}" not found`);
    }

    if (signature.status === SignatureStatus.REVOKED) {
      throw new SignatureValidationError('Signature has already been revoked');
    }

    signature.status = SignatureStatus.REVOKED;
    signature.revokedAt = new Date();
    signature.revokedBy = input.revokedBy;
    signature.revocationReason = input.reason;
    signature.verified = false;

    // Update in database
    await this.updateSignatureStatus(signature);

    await this.auditLogger.log({
      eventType: AuditEventType.SIGNATURE_REVOKED,
      signatureId: input.signatureId,
      signerId: signature.signerId,
      documentType: signature.documentType,
      documentId: signature.documentId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: {
        revokedBy: input.revokedBy,
        reason: input.reason,
        originalMeaning: signature.meaning,
        originalTimestamp: signature.timestamp.toISOString(),
      },
    });

    return signature;
  }

  /**
   * Get all signatures for a specific document.
   */
  getSignaturesForDocument(documentType: string, documentId: string): SignatureRecord[] {
    return Array.from(this.signatures.values()).filter(
      (s) => s.documentType === documentType && s.documentId === documentId
    );
  }

  /**
   * Get all signatures by a specific signer.
   */
  getSignaturesBySigner(signerId: string): SignatureRecord[] {
    return Array.from(this.signatures.values()).filter((s) => s.signerId === signerId);
  }

  /**
   * Get counter-signatures for a given signature.
   */
  getCounterSignatures(signatureId: string): SignatureRecord[] {
    return Array.from(this.signatures.values()).filter(
      (s) => s.counterSignatureOf === signatureId
    );
  }

  /**
   * Generate a signature manifest for regulatory submission.
   * Produces a PDF-ready JSON structure containing all signatures and audit trail.
   */
  async generateManifest(
    documentType: string,
    documentId: string,
    currentDocumentData: Record<string, unknown>,
    generatedBy: string
  ): Promise<SignatureManifest> {
    const documentHash = computeDocumentHash(currentDocumentData);
    const signatures = this.getSignaturesForDocument(documentType, documentId);
    const auditEntries = this.auditLogger.getEntriesForDocument(documentType, documentId);

    const manifest: SignatureManifest = {
      generatedAt: new Date().toISOString(),
      generatedBy,
      documentType,
      documentId,
      documentHash,
      signatures: signatures.map((sig) => ({
        id: sig.id,
        signerName: sig.signerName,
        signerRole: sig.signerRole,
        meaning: sig.meaning,
        timestamp: sig.timestamp.toISOString(),
        status: sig.status,
        signatureDigest: sig.signatureDigest,
        counterSignatureOf: sig.counterSignatureOf,
        revocationInfo: sig.status === SignatureStatus.REVOKED
          ? {
              revokedAt: sig.revokedAt!.toISOString(),
              revokedBy: sig.revokedBy!,
              reason: sig.revocationReason!,
            }
          : undefined,
      })),
      auditTrail: auditEntries.map((entry) => ({
        eventType: entry.eventType,
        timestamp: entry.timestamp.toISOString(),
        details: entry.details,
      })),
      integrityHash: '', // Computed below
    };

    // Compute integrity hash of the entire manifest (excluding the integrityHash field itself)
    const manifestForHashing = { ...manifest, integrityHash: undefined };
    manifest.integrityHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(manifestForHashing), 'utf8')
      .digest('hex');

    return manifest;
  }

  /**
   * Verify the integrity of a signature manifest.
   */
  verifyManifestIntegrity(manifest: SignatureManifest): boolean {
    const expectedHash = manifest.integrityHash;
    const manifestForHashing = { ...manifest, integrityHash: undefined };
    const computedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(manifestForHashing), 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(computedHash, 'hex')
    );
  }

  /**
   * Get full audit trail for a document.
   */
  getAuditTrail(documentType: string, documentId: string): AuditEntry[] {
    return this.auditLogger.getEntriesForDocument(documentType, documentId);
  }

  /**
   * Get audit trail for a specific signature.
   */
  getSignatureAuditTrail(signatureId: string): AuditEntry[] {
    return this.auditLogger.getEntriesForSignature(signatureId);
  }

  /**
   * Load signatures from the database for a document.
   */
  async loadSignaturesFromDB(documentType: string, documentId: string): Promise<void> {
    try {
      const rows = await prisma.$queryRaw<SignatureRecord[]>`
        SELECT * FROM "ElectronicSignature"
        WHERE "documentType" = ${documentType}
        AND "documentId" = ${documentId}
      `;

      for (const row of rows) {
        this.signatures.set(row.id, {
          ...row,
          timestamp: new Date(row.timestamp),
          revokedAt: row.revokedAt ? new Date(row.revokedAt) : undefined,
        });
      }
    } catch {
      // Table may not exist yet - signatures remain in memory
    }
  }

  // ==================== Private Methods ====================

  private async persistSignature(signature: SignatureRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO "ElectronicSignature" (
          "id", "signerId", "signerName", "signerRole",
          "documentType", "documentId", "documentHash",
          "meaning", "timestamp", "ipAddress", "verified",
          "status", "signatureDigest", "counterSignatureOf", "batchId"
        ) VALUES (
          ${signature.id}, ${signature.signerId}, ${signature.signerName},
          ${signature.signerRole}, ${signature.documentType}, ${signature.documentId},
          ${signature.documentHash}, ${signature.meaning}, ${signature.timestamp},
          ${signature.ipAddress}, ${signature.verified}, ${signature.status},
          ${signature.signatureDigest}, ${signature.counterSignatureOf ?? null},
          ${signature.batchId ?? null}
        )
      `;
    } catch {
      // If table doesn't exist, signature remains in memory only
      console.error('[E-Signature] Failed to persist signature to database');
    }
  }

  private async updateSignatureStatus(signature: SignatureRecord): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE "ElectronicSignature"
        SET "status" = ${signature.status},
            "verified" = ${signature.verified},
            "revokedAt" = ${signature.revokedAt ?? null},
            "revokedBy" = ${signature.revokedBy ?? null},
            "revocationReason" = ${signature.revocationReason ?? null}
        WHERE "id" = ${signature.id}
      `;
    } catch {
      console.error('[E-Signature] Failed to update signature status in database');
    }
  }
}

// ==================== Error Classes ====================

export class SignatureAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignatureAuthenticationError';
  }
}

export class SignatureNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignatureNotFoundError';
  }
}

export class SignatureValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignatureValidationError';
  }
}

// ==================== Singleton ====================

let _instance: ElectronicSignatureService | null = null;

/**
 * Get or create the singleton electronic signature service instance.
 */
export function getElectronicSignatureService(
  passwordVerifier?: PasswordVerifier
): ElectronicSignatureService {
  if (_instance) return _instance;
  _instance = new ElectronicSignatureService(passwordVerifier);
  return _instance;
}

export default ElectronicSignatureService;
