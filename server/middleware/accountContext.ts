import { Request, Response, NextFunction } from 'express';
import { db } from '../storage.js';

export interface AccountRequest extends Request {
  user: { id: string; email: string };
  account: { id: string; name: string; role: string; permissions: string[] };
}

export const accountContextMiddleware = async (
  req: AccountRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const accountId = req.headers['x-account-id'] as string || req.session?.currentAccountId;
    
    if (!accountId) {
      // For now, fetch the first account membership for the user
      const defaultMembership = await db.db.query(
        `SELECT am.*, a.name, a.slug 
         FROM account_memberships am 
         JOIN accounts a ON am.account_id = a.id 
         WHERE am.user_id = $1 
         LIMIT 1`,
        [userId]
      );
      
      if (!defaultMembership.rows[0]) {
        return res.status(400).json({ error: 'No account found for user' });
      }
      
      req.account = {
        id: defaultMembership.rows[0].account_id,
        name: defaultMembership.rows[0].name,
        role: defaultMembership.rows[0].role,
        permissions: defaultMembership.rows[0].permissions || []
      };
      
      next();
      return;
    }

    const membership = await db.db.query(
      `SELECT am.*, a.name, a.slug 
       FROM account_memberships am 
       JOIN accounts a ON am.account_id = a.id 
       WHERE am.user_id = $1 AND am.account_id = $2`,
      [userId, accountId]
    );
    
    if (!membership.rows[0]) {
      return res.status(403).json({ error: 'Access denied to account' });
    }

    req.account = {
      id: accountId,
      name: membership.rows[0].name,
      role: membership.rows[0].role,
      permissions: membership.rows[0].permissions || []
    };

    next();
  } catch (error) {
    console.error('Account context error:', error);
    res.status(500).json({ error: 'Account context error' });
  }
};

export const requirePermission = (permission: string) => {
  return (req: AccountRequest, res: Response, next: NextFunction) => {
    if (!req.account) {
      return res.status(403).json({ error: 'Account context required' });
    }
    
    if (req.account.role === 'owner' || req.account.role === 'admin') {
      next();
      return;
    }
    
    if (!req.account.permissions.includes(permission)) {
      return res.status(403).json({ error: `Permission denied: ${permission}` });
    }
    
    next();
  };
};