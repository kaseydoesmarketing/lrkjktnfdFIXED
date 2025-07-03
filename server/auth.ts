import crypto from 'crypto';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Create a 32-byte key from the encryption key string
function getKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

export function encryptToken(token: string): string {
  if (!token) return '';
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Token encryption failed:', error);
    throw new Error('Token encryption failed');
  }
}

export function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) return '';
  
  try {
    const [ivHex, encryptedHex] = encryptedToken.split(':');
    if (!ivHex || !encryptedHex) {
      throw new Error('Invalid encrypted token format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Token decryption failed:', error);
    throw new Error('Token decryption failed');
  }
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function isValidSession(expires: Date): boolean {
  return new Date() < expires;
}

export const authService = {
  generateSessionToken,
  isValidSession,
  encryptToken,
  decryptToken
};
