import crypto from 'crypto';

// =============================================================================
// Base32 Encoding/Decoding (RFC 4648)
// =============================================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(value >>> bits) & 0x1f];
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  // Add padding
  while (output.length % 8 !== 0) {
    output += '=';
  }

  return output;
}

function base32Decode(encoded: string): Buffer {
  // Remove padding and convert to uppercase
  const stripped = encoded.replace(/=+$/, '').toUpperCase();
  const lookup: Record<string, number> = {};
  for (let i = 0; i < BASE32_ALPHABET.length; i++) {
    lookup[BASE32_ALPHABET[i]] = i;
  }

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < stripped.length; i++) {
    const charValue = lookup[stripped[i]];
    if (charValue === undefined) {
      throw new Error(`Invalid base32 character: ${stripped[i]}`);
    }
    value = (value << 5) | charValue;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      output.push((value >>> bits) & 0xff);
    }
  }

  return Buffer.from(output);
}

// =============================================================================
// TOTP Implementation (RFC 6238 / RFC 4226)
// =============================================================================

/**
 * Generate a cryptographically secure random secret for TOTP.
 * Returns a base32-encoded string representing 20 random bytes.
 */
export function generateSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate a TOTP code using HMAC-SHA1 as specified in RFC 4226 / RFC 6238.
 *
 * @param secret - Base32-encoded secret key
 * @param timestamp - Unix timestamp in milliseconds (defaults to Date.now())
 * @param period - Time step in seconds (defaults to 30)
 * @param digits - Number of digits in the OTP (defaults to 6)
 * @returns The TOTP code as a zero-padded string
 */
export function generateTOTP(
  secret: string,
  timestamp?: number,
  period: number = 30,
  digits: number = 6
): string {
  const time = timestamp ?? Date.now();
  const counter = Math.floor(time / 1000 / period);

  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8);
  // Write as 64-bit big-endian unsigned integer
  let remaining = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = remaining & 0xff;
    remaining = Math.floor(remaining / 256);
  }

  // Decode the base32 secret
  const key = base32Decode(secret);

  // Compute HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const hash = hmac.digest();

  // Dynamic truncation (RFC 4226 Section 5.4)
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  // Generate the OTP value
  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verify a TOTP token against a secret, allowing for clock drift.
 *
 * @param secret - Base32-encoded secret key
 * @param token - The token string to verify
 * @param window - Number of time steps to check in each direction (default 1)
 * @param period - Time step in seconds (defaults to 30)
 * @returns true if the token is valid within the allowed window
 */
export function verifyTOTP(
  secret: string,
  token: string,
  window: number = 1,
  period: number = 30
): boolean {
  if (!token || token.length !== 6) {
    return false;
  }

  const now = Date.now();

  for (let i = -window; i <= window; i++) {
    const checkTime = now + i * period * 1000;
    const expected = generateTOTP(secret, checkTime, period);
    if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// Backup Codes
// =============================================================================

const BACKUP_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate backup codes for account recovery.
 * Returns both the plaintext codes (to display to user once) and their hashed versions (for storage).
 *
 * @param count - Number of backup codes to generate (default 10)
 * @returns Object containing plaintext codes and their SHA-256 hashes
 */
export function generateBackupCodes(count: number = 10): {
  codes: string[];
  hashedCodes: string[];
} {
  const codes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    let code = '';
    const randomBytes = crypto.randomBytes(8);
    for (let j = 0; j < 8; j++) {
      code += BACKUP_CODE_CHARS[randomBytes[j] % BACKUP_CODE_CHARS.length];
    }

    codes.push(code);
    hashedCodes.push(hashBackupCode(code));
  }

  return { codes, hashedCodes };
}

/**
 * Hash a backup code for secure storage using SHA-256.
 */
function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.toLowerCase().trim()).digest('hex');
}

/**
 * Verify a backup code against stored hashed codes.
 * If valid, removes the used code from the remaining set.
 *
 * @param hashedCodes - Array of SHA-256 hashed backup codes
 * @param code - The plaintext code to verify
 * @returns Object with validity status and remaining unused codes
 */
export function verifyBackupCode(
  hashedCodes: string[],
  code: string
): { valid: boolean; remainingCodes: string[] } {
  const hashed = hashBackupCode(code);
  const index = hashedCodes.findIndex((stored) =>
    crypto.timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(hashed, 'hex'))
  );

  if (index === -1) {
    return { valid: false, remainingCodes: [...hashedCodes] };
  }

  // Remove the used code
  const remainingCodes = [...hashedCodes];
  remainingCodes.splice(index, 1);

  return { valid: true, remainingCodes };
}

// =============================================================================
// QR Code URI Generation
// =============================================================================

/**
 * Generate an otpauth:// URI for QR code generation.
 * This URI can be used with authenticator apps like Google Authenticator.
 *
 * @param secret - Base32-encoded secret key
 * @param email - User's email address (used as the account label)
 * @param issuer - Application/company name
 * @returns otpauth:// URI string
 */
export function generateQRCodeURI(
  secret: string,
  email: string,
  issuer: string = 'ERP Platform'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  // Remove padding from secret for URI (most authenticator apps expect no padding)
  const cleanSecret = secret.replace(/=+$/, '');

  return (
    `otpauth://totp/${encodedIssuer}:${encodedEmail}` +
    `?secret=${cleanSecret}` +
    `&issuer=${encodedIssuer}` +
    `&algorithm=SHA1` +
    `&digits=6` +
    `&period=30`
  );
}

// =============================================================================
// Exported helpers for testing / advanced usage
// =============================================================================

export { base32Encode, base32Decode };
