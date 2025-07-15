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
      console.log('🔄 [AUTH-MIDDLEWARE] Token validation failed, attempting refresh:', error?.message);
      
      const refreshToken = req.cookies['sb-refresh-token'];
      if (refreshToken) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: refreshToken
          });
          
          if (!refreshError && refreshData.session) {
            console.log('✅ [AUTH-MIDDLEWARE] Token refreshed successfully');
            
            res.cookie('sb-access-token', refreshData.session.access_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7 // 7 days
            });
            
            res.cookie('sb-refresh-token', refreshData.session.refresh_token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30 // 30 days
            });
            
            const { data: { user: refreshedUser }, error: userError } = await supabase.auth.getUser(refreshData.session.access_token);
            if (!userError && refreshedUser) {
              const dbUser = await storage.getUserByEmail(refreshedUser.email!);
              if (dbUser) {
                req.user = dbUser;
                return next();
              }
            }
          }
        } catch (refreshErr) {
          console.error('❌ [AUTH-MIDDLEWARE] Token refresh failed:', refreshErr);
        }
      }
      
      console.error('❌ [AUTH-MIDDLEWARE] Authentication failed - no valid session or refresh token');
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
