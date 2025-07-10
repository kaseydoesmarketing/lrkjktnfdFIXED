import { Request, Response, NextFunction } from 'express';
import { supabase } from '../auth/supabase';
import { storage } from '../storage';
import type { User } from '@shared/schema';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function injectSessionToken(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies['sb-access-token'];
  if (token) {
    (global as any).currentRequestToken = token;
  }
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sbToken = req.cookies['sb-access-token'];
  const sessionToken = req.cookies['session-token'];
  
  if (!sbToken && !sessionToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    let dbUser: any = undefined;
    
    if (sbToken) {
      const { data: { user }, error } = await supabase.auth.getUser(sbToken);
      if (user) dbUser = await storage.getUserByEmail(user.email!);
    }
    
    if (!dbUser && sessionToken) {
      const session = await storage.getSession(sessionToken);
      if (session && storage.isValidSession(session.expires)) {
        dbUser = await storage.getUser(session.userId);
      }
    }
    
    if (!dbUser) return res.status(404).json({ error: 'User not found' });
    
    req.user = dbUser;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication check failed' });
  }
}