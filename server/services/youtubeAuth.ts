import { google } from 'googleapis';
import crypto from 'crypto';
import { db } from '../db';

export class YouTubeAuthService {
  private oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    process.env.NODE_ENV === 'production' 
      ? 'https://titletesterpro.com/auth/callback'
      : 'http://localhost:5000/auth/callback'
  );

  async refreshTokenIfNeeded(channelId: string): Promise<string> {
    const channel = await db.db.query(
      'SELECT * FROM channels WHERE id = $1',
      [channelId]
    );

    if (!channel.rows[0]) {
      throw new Error('Channel not found');
    }

    const { access_token_encrypted, refresh_token_encrypted, token_expires_at } = channel.rows[0];
    
    // Decrypt tokens
    const accessToken = this.decrypt(access_token_encrypted);
    const refreshToken = this.decrypt(refresh_token_encrypted);

    // Check if token is expired or will expire soon (5 minutes buffer)
    const expiresAt = new Date(token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
      return accessToken; // Token still valid
    }

    // Refresh the token
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      // Update database with new tokens
      await db.db.query(
        `UPDATE channels 
         SET access_token_encrypted = $1, 
             token_expires_at = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          this.encrypt(credentials.access_token!),
          new Date(credentials.expiry_date!),
          channelId
        ]
      );

      return credentials.access_token!;
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // Mark channel as needing reauthorization
      await db.db.query(
        'UPDATE channels SET is_active = false WHERE id = $1',
        [channelId]
      );
      
      throw new Error('Token refresh failed - reauthorization required');
    }
  }

  async getYouTubeClient(channelId: string) {
    const accessToken = await this.refreshTokenIfNeeded(channelId);
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    return google.youtube({
      version: 'v3',
      auth
    });
  }

  encrypt(text: string): string {
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decrypt(encrypted: string): string {
    if (!encrypted) {
      throw new Error('No encrypted token provided');
    }
    
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      // Generate a key if not provided (for development)
      console.warn('ENCRYPTION_KEY not set, generating temporary key');
      return crypto.scryptSync('temporary-key', 'salt', 32);
    }
    
    // If key is hex encoded
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
      return Buffer.from(key, 'hex');
    }
    
    // Otherwise use key as-is and derive proper length
    return crypto.scryptSync(key, 'salt', 32);
  }

  async storeTokens(
    channelId: string, 
    accessToken: string, 
    refreshToken: string, 
    expiresIn: number
  ) {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    await db.db.query(
      `UPDATE channels 
       SET access_token_encrypted = $1,
           refresh_token_encrypted = $2,
           token_expires_at = $3,
           is_active = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [
        this.encrypt(accessToken),
        this.encrypt(refreshToken),
        expiresAt,
        channelId
      ]
    );
  }
}

export const youtubeAuthService = new YouTubeAuthService();