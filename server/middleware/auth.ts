import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { storage } from '../storage';
import type { User } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const oauth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export function injectSessionToken(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies['sb-access-token'];
  if (token) {
    (global as any).currentRequestToken = token;
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies['sb-access-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Verify the token with Google
    const ticket = await oauth2Client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    }).catch(() => null);
    
    // If ID token verification fails, assume it's an access token
    // In production, you'd want to store user info in session
    if (!ticket) {
      // For now, we'll get user info from the access token
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      const userInfo = await response.json();
      
      // Get user from our database
      const dbUser = await storage.getUserByEmail(userInfo.email);
      
      if (!dbUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      req.user = dbUser;
      next();
    } else {
      const payload = ticket.getPayload();
      
      // Get user from our database
      const dbUser = await storage.getUserByEmail(payload?.email!);
      
      if (!dbUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      req.user = dbUser;
      next();
    }
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}