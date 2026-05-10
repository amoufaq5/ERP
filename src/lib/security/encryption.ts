import crypto from 'crypto';
import { Prisma } from '@prisma/client';

// ==================== Configuration ====================

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const HKDF_HASH = 'sha256';
const CIPHERTEXT_VERSION = '1';

/**
 * Default PII fields that should be encrypted by model.
 * Keys are Prisma model names, values are arrays of field names.
 */
export const DEFAULT_ENCRYPTED_FIELDS: Record<string, string[]> = {
  Employee: ['ssn', 'bankAccount', 'taxId', 'salary', 'medicalRecord'],
  User: ['ssn', 'bankAccount', 'taxId'],
  Payroll: ['salary', 'bankAccount', 'taxId'],
  Patient: ['medicalRecord', 'ssn'],
};

// ==================== Types ====================

interface EncryptionKey {
  id: string;
  key: Buffer;
  createdAt: Date;
  active: boolean;
}

interface EncryptionKeyConfig {
  id: string;
  masterKey: string; // hex-encoded or base64
  createdAt?: Date;
  active?: boolean;
}

interface EncryptedPayload {
  version: string;
  keyId: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface EncryptionServiceConfig {
  keys: EncryptionKeyConfig[];
  defaultKeyId?: string;
}

// ==================== Key Management ====================

class KeyManager {
  private keys: Map<string, EncryptionKey> = new Map();
  private activeKeyId: string;

  constructor(config: EncryptionServiceConfig) {
    if (!config.keys || config.keys.length === 0) {
      throw new Error('At least one encryption key must be configured');
    }

    for (const keyConfig of config.keys) {
      const rawKey = this.parseKey(keyConfig.masterKey);
      this.keys.set(keyConfig.id, {
        id: keyConfig.id,
        key: rawKey,
        createdAt: keyConfig.createdAt ?? new Date(),
        active: keyConfig.active !== false,
      });
    }

    this.activeKeyId = config.defaultKeyId ?? config.keys[config.keys.length - 1].id;

    if (!this.keys.has(this.activeKeyId)) {
      throw new Error(`Default key ID "${this.activeKeyId}" not found in configured keys`);
    }
  }

  private parseKey(masterKey: string): Buffer {
    // Try hex first, then base64
    if (/^[0-9a-fA-F]{64}$/.test(masterKey)) {
      return Buffer.from(masterKey, 'hex');
    }
    const buf = Buffer.from(masterKey, 'base64');
    if (buf.length >= KEY_LENGTH) {
      return buf.subarray(0, KEY_LENGTH);
    }
    throw new Error('Master key must be at least 32 bytes (64 hex chars or 44 base64 chars)');
  }

  getActiveKey(): EncryptionKey {
    const key = this.keys.get(this.activeKeyId);
    if (!key) {
      throw new Error('Active encryption key not found');
    }
    return key;
  }

  getKey(keyId: string): EncryptionKey | undefined {
    return this.keys.get(keyId);
  }

  setActiveKey(keyId: string): void {
    if (!this.keys.has(keyId)) {
      throw new Error(`Key "${keyId}" not found`);
    }
    this.activeKeyId = keyId;
  }

  addKey(config: EncryptionKeyConfig): void {
    const rawKey = this.parseKey(config.masterKey);
    this.keys.set(config.id, {
      id: config.id,
      key: rawKey,
      createdAt: config.createdAt ?? new Date(),
      active: config.active !== false,
    });
  }

  deactivateKey(keyId: string): void {
    const key = this.keys.get(keyId);
    if (key) {
      key.active = false;
    }
  }

  getAllKeyIds(): string[] {
    return Array.from(this.keys.keys());
  }
}

// ==================== HKDF Key Derivation ====================

function deriveFieldKey(masterKey: Buffer, fieldName: string): Buffer {
  const salt = crypto.createHash('sha256').update(`field-encryption-salt:${fieldName}`).digest();
  const info = Buffer.from(`aes-256-gcm:field:${fieldName}`, 'utf8');
  return Buffer.from(crypto.hkdfSync(HKDF_HASH, masterKey, salt, info, KEY_LENGTH));
}

// ==================== Encryption Service ====================

export class FieldEncryptionService {
  private keyManager: KeyManager;

  constructor(config: EncryptionServiceConfig) {
    this.keyManager = new KeyManager(config);
  }

  /**
   * Encrypt a plaintext value for a specific field.
   * Returns format: version:keyId:iv:authTag:ciphertext (all base64 except version/keyId)
   */
  encrypt(plaintext: string, fieldName: string): string {
    if (!plaintext) return plaintext;

    const activeKey = this.keyManager.getActiveKey();
    const derivedKey = deriveFieldKey(activeKey.key, fieldName);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(derivedKey), iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      CIPHERTEXT_VERSION,
      activeKey.id,
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  /**
   * Decrypt a ciphertext value for a specific field.
   * Parses the version:keyId:iv:authTag:ciphertext format.
   */
  decrypt(ciphertext: string, fieldName: string): string {
    if (!ciphertext) return ciphertext;

    const parsed = this.parseCiphertext(ciphertext);
    if (!parsed) {
      // Not encrypted data - return as-is (supports gradual migration)
      return ciphertext;
    }

    const key = this.keyManager.getKey(parsed.keyId);
    if (!key) {
      throw new Error(`Decryption key "${parsed.keyId}" not found. Key may have been removed.`);
    }

    const derivedKey = deriveFieldKey(key.key, fieldName);
    const iv = Buffer.from(parsed.iv, 'base64');
    const authTag = Buffer.from(parsed.authTag, 'base64');
    const encryptedData = Buffer.from(parsed.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(derivedKey), iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Re-encrypt a value from an old key to the current active key.
   */
  rotateKey(ciphertext: string, fieldName: string): string {
    const plaintext = this.decrypt(ciphertext, fieldName);
    return this.encrypt(plaintext, fieldName);
  }

  /**
   * Batch encrypt multiple values efficiently.
   * Returns a map of field names to encrypted values.
   */
  encryptBatch(fields: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};
    const activeKey = this.keyManager.getActiveKey();

    for (const [fieldName, plaintext] of Object.entries(fields)) {
      if (!plaintext) {
        result[fieldName] = plaintext;
        continue;
      }

      const derivedKey = deriveFieldKey(activeKey.key, fieldName);
      const iv = crypto.randomBytes(IV_LENGTH);

      const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(derivedKey), iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });

      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      result[fieldName] = [
        CIPHERTEXT_VERSION,
        activeKey.id,
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted.toString('base64'),
      ].join(':');
    }

    return result;
  }

  /**
   * Batch decrypt multiple values efficiently.
   */
  decryptBatch(fields: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [fieldName, ciphertext] of Object.entries(fields)) {
      if (!ciphertext) {
        result[fieldName] = ciphertext;
        continue;
      }
      result[fieldName] = this.decrypt(ciphertext, fieldName);
    }

    return result;
  }

  /**
   * Rotate all fields from old key to new key.
   */
  rotateFields(fields: Record<string, string>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [fieldName, ciphertext] of Object.entries(fields)) {
      if (!ciphertext) {
        result[fieldName] = ciphertext;
        continue;
      }
      result[fieldName] = this.rotateKey(ciphertext, fieldName);
    }

    return result;
  }

  /**
   * Check if a value appears to be encrypted.
   */
  isEncrypted(value: string): boolean {
    return this.parseCiphertext(value) !== null;
  }

  /**
   * Get the key ID used to encrypt a value.
   */
  getKeyId(ciphertext: string): string | null {
    const parsed = this.parseCiphertext(ciphertext);
    return parsed?.keyId ?? null;
  }

  /**
   * Add a new key for rotation purposes.
   */
  addKey(config: EncryptionKeyConfig): void {
    this.keyManager.addKey(config);
  }

  /**
   * Set which key to use for new encryptions.
   */
  setActiveKey(keyId: string): void {
    this.keyManager.setActiveKey(keyId);
  }

  /**
   * Deactivate an old key (it can still decrypt but won't be used for new encryptions).
   */
  deactivateKey(keyId: string): void {
    this.keyManager.deactivateKey(keyId);
  }

  private parseCiphertext(value: string): EncryptedPayload | null {
    if (!value || typeof value !== 'string') return null;

    const parts = value.split(':');
    if (parts.length !== 5) return null;

    const [version, keyId, iv, authTag, ciphertext] = parts;

    if (version !== CIPHERTEXT_VERSION) return null;
    if (!keyId || !iv || !authTag || !ciphertext) return null;

    // Basic validation of base64 parts
    try {
      Buffer.from(iv, 'base64');
      Buffer.from(authTag, 'base64');
      Buffer.from(ciphertext, 'base64');
    } catch {
      return null;
    }

    return { version, keyId, iv, authTag, ciphertext };
  }
}

// ==================== Prisma Middleware ====================

/**
 * Create Prisma middleware that transparently encrypts/decrypts specified fields.
 *
 * @param encryptedFields - Map of model names to arrays of field names to encrypt
 * @param service - The FieldEncryptionService instance to use
 *
 * @example
 * ```ts
 * const middleware = createEncryptionMiddleware(
 *   { Employee: ['ssn', 'bankAccount', 'salary'] },
 *   encryptionService
 * );
 * prisma.$use(middleware);
 * ```
 */
export function createEncryptionMiddleware(
  encryptedFields: Record<string, string[]>,
  service: FieldEncryptionService
): Prisma.Middleware {
  const fieldMap = new Map<string, Set<string>>();
  for (const [model, fields] of Object.entries(encryptedFields)) {
    fieldMap.set(model, new Set(fields));
  }

  return async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<unknown>) => {
    const model = params.model;
    if (!model || !fieldMap.has(model)) {
      return next(params);
    }

    const fields = fieldMap.get(model)!;

    // Encrypt on write operations
    if (['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(params.action)) {
      params.args = encryptArgs(params.args, params.action, fields, service);
    }

    const result = await next(params);

    // Decrypt on read operations
    if (result && ['findUnique', 'findFirst', 'findMany', 'create', 'update', 'upsert'].includes(params.action)) {
      return decryptResult(result, fields, service);
    }

    return result;
  };
}

function encryptArgs(
  args: Record<string, unknown>,
  action: string,
  fields: Set<string>,
  service: FieldEncryptionService
): Record<string, unknown> {
  if (!args) return args;

  const clone = { ...args };

  if (action === 'createMany' && clone.data && Array.isArray(clone.data)) {
    clone.data = (clone.data as Record<string, unknown>[]).map((record) =>
      encryptRecord(record, fields, service)
    );
  } else if (action === 'upsert') {
    if (clone.create && typeof clone.create === 'object') {
      clone.create = encryptRecord(clone.create as Record<string, unknown>, fields, service);
    }
    if (clone.update && typeof clone.update === 'object') {
      clone.update = encryptRecord(clone.update as Record<string, unknown>, fields, service);
    }
  } else if (clone.data && typeof clone.data === 'object') {
    if (Array.isArray(clone.data)) {
      clone.data = (clone.data as Record<string, unknown>[]).map((record) =>
        encryptRecord(record, fields, service)
      );
    } else {
      clone.data = encryptRecord(clone.data as Record<string, unknown>, fields, service);
    }
  }

  return clone;
}

function encryptRecord(
  record: Record<string, unknown>,
  fields: Set<string>,
  service: FieldEncryptionService
): Record<string, unknown> {
  const clone = { ...record };
  for (const field of fields) {
    if (field in clone && typeof clone[field] === 'string' && clone[field]) {
      clone[field] = service.encrypt(clone[field] as string, field);
    }
  }
  return clone;
}

function decryptResult(
  result: unknown,
  fields: Set<string>,
  service: FieldEncryptionService
): unknown {
  if (Array.isArray(result)) {
    return result.map((item) => decryptResult(item, fields, service));
  }

  if (result && typeof result === 'object') {
    const record = { ...(result as Record<string, unknown>) };
    for (const field of fields) {
      if (field in record && typeof record[field] === 'string' && record[field]) {
        try {
          record[field] = service.decrypt(record[field] as string, field);
        } catch {
          // If decryption fails, leave the value as-is (may not be encrypted yet)
        }
      }
    }
    return record;
  }

  return result;
}

// ==================== Singleton / Factory ====================

let _instance: FieldEncryptionService | null = null;

/**
 * Get or create the singleton encryption service instance.
 * Configuration is read from environment variables:
 * - ENCRYPTION_KEYS: JSON array of key configs [{id, masterKey, active?}]
 * - ENCRYPTION_DEFAULT_KEY_ID: ID of the key to use for new encryptions
 */
export function getEncryptionService(): FieldEncryptionService {
  if (_instance) return _instance;

  const keysJson = process.env.ENCRYPTION_KEYS;
  if (!keysJson) {
    throw new Error(
      'ENCRYPTION_KEYS environment variable is not set. ' +
      'Expected JSON array: [{"id":"key1","masterKey":"<64 hex chars>"}]'
    );
  }

  let keys: EncryptionKeyConfig[];
  try {
    keys = JSON.parse(keysJson);
  } catch (e) {
    throw new Error('ENCRYPTION_KEYS environment variable contains invalid JSON');
  }

  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error('ENCRYPTION_KEYS must be a non-empty JSON array');
  }

  _instance = new FieldEncryptionService({
    keys,
    defaultKeyId: process.env.ENCRYPTION_DEFAULT_KEY_ID,
  });

  return _instance;
}

/**
 * Create a configured encryption middleware using default PII fields.
 */
export function createDefaultEncryptionMiddleware(): Prisma.Middleware {
  const service = getEncryptionService();
  return createEncryptionMiddleware(DEFAULT_ENCRYPTED_FIELDS, service);
}

export default FieldEncryptionService;
