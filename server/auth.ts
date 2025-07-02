import crypto from 'crypto';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!'; // 32 bytes
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

export function encryptToken(token: string): string {
  if (!token) return '';
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
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
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
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
