export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

export function encryptToken(token: string): string {
  // In a real implementation, use proper encryption
  // For now, using base64 encoding as placeholder
  return Buffer.from(token).toString('base64');
}

export function decryptToken(encryptedToken: string): string {
  // Decrypt the token - placeholder implementation
  return Buffer.from(encryptedToken, 'base64').toString();
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

export function isValidSession(expires: Date): boolean {
  return new Date() < expires;
}
