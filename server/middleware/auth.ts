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
  const token = req.cookies['sb-access-token'];
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // Get user from our database
    const dbUser = await storage.getUserByEmail(user.email!);
    
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Set user on request
    req.user = dbUser;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}