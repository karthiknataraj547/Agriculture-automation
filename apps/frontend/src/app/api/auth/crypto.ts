import crypto from 'crypto';

// AES-256-GCM Secret Key (Derived from high-entropy master key)
const MASTER_SECRET = process.env.ENCRYPTION_SECRET || 'aethercrop-military-grade-aes-256-gcm-key-2026';
const KEY_BYTES = crypto.scryptSync(MASTER_SECRET, 'aether-salt-v1', 32);

/**
 * Military-grade PBKDF2 Password Hashing with Random Salt
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify PBKDF2 Password Hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

/**
 * AES-256-GCM Payload Encryption
 */
export function encryptPayload(data: any): string {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY_BYTES, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return JSON.stringify({
    iv: iv.toString('hex'),
    content: encrypted,
    tag: authTag,
  });
}

/**
 * AES-256-GCM Payload Decryption
 */
export function decryptPayload(encryptedStr: string): any {
  try {
    const { iv, content, tag } = JSON.parse(encryptedStr);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY_BYTES, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (err) {
    console.error('[Crypto] Decryption failed:', err);
    return null;
  }
}
