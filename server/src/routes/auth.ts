import { Router, Request, Response } from 'express';
import { dualOAuthService } from '../auth/dualOAuth.js';
import { db } from '../db/index.js';
import { users, accounts } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/auth/google/read', (req: Request, res: Response) => {
  const authUrl = dualOAuthService.getReadAuthUrl();
  res.redirect(authUrl);
});

router.get('/auth/google/write', (req: Request, res: Response) => {
  const authUrl = dualOAuthService.getWriteAuthUrl();
  res.redirect(authUrl);
});

router.get('/auth/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code required' });
  }

  try {
    const isWriteFlow = state === 'write';
    const tokens = isWriteFlow 
      ? await dualOAuthService.exchangeWriteCode(code as string)
      : await dualOAuthService.exchangeReadCode(code as string);

    const client = isWriteFlow 
      ? dualOAuthService.getWriteClient(tokens.access_token!)
      : dualOAuthService.getReadClient(tokens.access_token!);

    const channelResponse = await client.channels.list({
      part: ['snippet'],
      mine: true
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel) {
      return res.status(400).json({ error: 'No YouTube channel found' });
    }

    const userEmail = 'user@example.com';
    
    let user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    if (user.length === 0) {
      await db.insert(users).values({
        id: crypto.randomUUID(),
        email: userEmail,
        name: channel.snippet?.title || 'YouTube User',
        subscriptionStatus: 'free'
      });
      user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    }

    const userId = user[0].id;
    const encryptedAccessToken = dualOAuthService.encrypt(tokens.access_token!);
    const encryptedRefreshToken = tokens.refresh_token ? dualOAuthService.encrypt(tokens.refresh_token) : null;
    const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600000));

    let account = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1);
    
    if (account.length === 0) {
      await db.insert(accounts).values({
        id: crypto.randomUUID(),
        userId,
        provider: 'google',
        type: 'oauth',
        readAccessToken: isWriteFlow ? null : encryptedAccessToken,
        readRefreshToken: isWriteFlow ? null : encryptedRefreshToken,
        writeAccessToken: isWriteFlow ? encryptedAccessToken : null,
        writeRefreshToken: isWriteFlow ? encryptedRefreshToken : null,
        readTokenExpiresAt: isWriteFlow ? null : expiresAt,
        writeTokenExpiresAt: isWriteFlow ? expiresAt : null,
        youtubeChannelId: channel.id,
        youtubeChannelTitle: channel.snippet?.title,
        youtubeChannelThumbnail: channel.snippet?.thumbnails?.default?.url
      });
    } else {
      const updateData = isWriteFlow ? {
        writeAccessToken: encryptedAccessToken,
        writeRefreshToken: encryptedRefreshToken,
        writeTokenExpiresAt: expiresAt
      } : {
        readAccessToken: encryptedAccessToken,
        readRefreshToken: encryptedRefreshToken,
        readTokenExpiresAt: expiresAt
      };

      await db.update(accounts)
        .set({
          ...updateData,
          youtubeChannelId: channel.id,
          youtubeChannelTitle: channel.snippet?.title,
          youtubeChannelThumbnail: channel.snippet?.thumbnails?.default?.url,
          updatedAt: new Date()
        })
        .where(eq(accounts.userId, userId));
    }

    res.redirect(`http://localhost:3000/dashboard?auth=${isWriteFlow ? 'write' : 'read'}_success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

router.get('/api/auth/user', async (req: Request, res: Response) => {
  try {
    const userEmail = 'user@example.com';
    const user = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
    
    if (user.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const account = await db.select().from(accounts).where(eq(accounts.userId, user[0].id)).limit(1);
    
    res.json({
      user: user[0],
      hasReadAccess: account.length > 0 && !!account[0].readAccessToken,
      hasWriteAccess: account.length > 0 && !!account[0].writeAccessToken,
      youtubeChannel: account.length > 0 ? {
        id: account[0].youtubeChannelId,
        title: account[0].youtubeChannelTitle,
        thumbnail: account[0].youtubeChannelThumbnail
      } : null
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
