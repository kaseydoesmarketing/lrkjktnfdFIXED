import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'TitleTesterPro2025EncryptionKey!'; // 32 chars
const IV_LENGTH = 16; // For AES, this is always 16
const ALGORITHM = 'aes-256-cbc';

// Ensure key is exactly 32 bytes
const KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

export function encryptToken(token: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Return iv:encrypted format
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('❌ [ENCRYPTION] Failed to encrypt token:', error);
    throw new Error('Failed to encrypt token');
  }
}

export function decryptToken(encryptedToken: string): string {
  try {
    const parts = encryptedToken.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted token format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ [ENCRYPTION] Failed to decrypt token:', error);
    throw new Error('Failed to decrypt token');
  }
}