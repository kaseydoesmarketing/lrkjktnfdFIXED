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
  // Try to get token from Authorization header first, then cookie
  let token: string | undefined;
  
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    token = req.cookies['sb-access-token'];
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    const dbUser = await storage.getUserByEmail(user.email!);
    
    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    req.user = dbUser;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication check failed' });
  }
}