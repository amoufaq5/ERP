const TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Sign a payload using HMAC-SHA256 with the Web Crypto API.
 */
export async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a payload signature against an expected HMAC-SHA256 signature.
 */
export async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expected = await signPayload(payload, secret);
  if (expected.length !== signature.length) return false;
  // Constant-time-ish comparison
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Generate an ISO timestamp for replay protection.
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Build a signature header in the format: t=<timestamp>,v1=<signature>
 */
export function buildSignatureHeader(timestamp: string, signature: string): string {
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Parse a signature header back into its components.
 */
export function parseSignatureHeader(
  header: string
): { timestamp: string; signatures: string[] } {
  const parts = header.split(',');
  let timestamp = '';
  const signatures: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith('t=')) {
      timestamp = trimmed.slice(2);
    } else if (trimmed.startsWith('v1=')) {
      signatures.push(trimmed.slice(3));
    }
  }

  return { timestamp, signatures };
}

/**
 * Check whether a timestamp is within the tolerance window (5 minutes)
 * to protect against replay attacks.
 */
export function isTimestampValid(timestamp: string): boolean {
  const ts = new Date(timestamp).getTime();
  const now = Date.now();
  return Math.abs(now - ts) <= TOLERANCE_MS;
}
