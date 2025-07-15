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


export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('🔐 [requireAuth] Checking authentication...');
    
    const token = req.cookies['sb-access-token'];
    
    if (!token) {
      console.log('❌ [requireAuth] No sb-access-token cookie found');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('🔐 [requireAuth] Verifying token with Supabase...');
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.log('❌ [requireAuth] Supabase auth error:', error.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (!user) {
      console.log('❌ [requireAuth] No user found');
      return res.status(401).json({ error: 'User not found' });
    }
    
    console.log('✅ [requireAuth] User authenticated:', user.email);
    
    // Get user from our database
    const dbUser = await storage.getUserByEmail(user.email!);
    if (!dbUser) {
      console.log('❌ [requireAuth] User not found in database');
      return res.status(401).json({ error: 'User not found in database' });
    }
    
    req.user = dbUser;
    next();
  } catch (error) {
    console.error('❌ [requireAuth] Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
