import { google } from 'googleapis';
import crypto from 'crypto';

export class DualOAuthService {
  private readOnlyClient = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    process.env.OAUTH_REDIRECT_URI!
  );

  private writeClient = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_WRITE_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_WRITE_CLIENT_SECRET!,
    process.env.OAUTH_REDIRECT_URI!
  );

  readonly READ_SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  readonly WRITE_SCOPES = [
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  getReadAuthUrl(): string {
    return this.readOnlyClient.generateAuthUrl({
      access_type: 'offline',
      scope: this.READ_SCOPES,
      prompt: 'consent'
    });
  }

  getWriteAuthUrl(): string {
    return this.writeClient.generateAuthUrl({
      access_type: 'offline',
      scope: this.WRITE_SCOPES,
      prompt: 'consent'
    });
  }

  async exchangeReadCode(code: string) {
    const { tokens } = await this.readOnlyClient.getToken(code);
    return tokens;
  }

  async exchangeWriteCode(code: string) {
    const { tokens } = await this.writeClient.getToken(code);
    return tokens;
  }

  async refreshReadToken(refreshToken: string) {
    this.readOnlyClient.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.readOnlyClient.refreshAccessToken();
    return credentials;
  }

  async refreshWriteToken(refreshToken: string) {
    this.writeClient.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.writeClient.refreshAccessToken();
    return credentials;
  }

  getReadClient(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.youtube({ version: 'v3', auth });
  }

  getWriteClient(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.youtube({ version: 'v3', auth });
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
      console.warn('ENCRYPTION_KEY not set, generating temporary key');
      return crypto.scryptSync('temporary-key', 'salt', 32);
    }
    
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
      return Buffer.from(key, 'hex');
    }
    
    return crypto.scryptSync(key, 'salt', 32);
  }
}

export const dualOAuthService = new DualOAuthService();
