import type { Express, Request, Response } from "express";
import { storage } from "./storage";

// Simple admin check
function isAdmin(userEmail: string): boolean {
  const adminEmails = [
    'KaseyDoesMarketing@gmail.com',
    'kaseydoesmarketing@gmail.com', // Add lowercase version
    'liftedkulture-6202@pages.plusgoogle.com', // Current user
    'admin@titletesterpro.com'
  ];
  return adminEmails.includes(userEmail);
}

export function registerSimpleAdminRoutes(app: Express) {
  // Admin authentication middleware
  async function requireAdmin(req: Request, res: Response, next: Function) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const sessionToken = authHeader.substring(7);
      const session = await storage.getSession(sessionToken);
      
      if (!session || session.expires < new Date()) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }

      const user = await storage.getUser(session.userId);
      if (!user || !isAdmin(user.email)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      (req as any).user = user;
      next();
    } catch (error) {
      console.error('Admin auth error:', error);
      return res.status(500).json({ error: 'Authentication error' });
    }
  }

  // Check admin access
  app.get('/api/admin/check', requireAdmin, async (req: Request, res: Response) => {
    res.json({ isAdmin: true, user: (req as any).user });
  });

  // Get platform metrics
  app.get('/api/admin/metrics', requireAdmin, async (req: Request, res: Response) => {
    try {
      // Get basic counts from storage
      const allUsers = await storage.getAllUsers();
      const allTests = await storage.getAllTests();
      
      const activeTests = allTests.filter(t => t.status === 'active');
      const completedTests = allTests.filter(t => t.status === 'completed');
      const totalApiCalls = allTests.length * 50; // Rough estimate

      res.json({
        totalUsers: allUsers.length,
        activeUsers: Math.floor(allUsers.length * 0.3), // Estimate 30% active
        totalTests: allTests.length,
        activeTests: activeTests.length,
        totalApiCalls: totalApiCalls,
        dailyApiCalls: Math.floor(totalApiCalls / 30),
        platformHealth: 'good'
      });
    } catch (error) {
      console.error('Error getting admin metrics:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  // Get all users
  app.get('/api/admin/users', requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      
      const adminUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name || 'Unknown',
        subscriptionTier: user.subscriptionTier || 'none',
        subscriptionStatus: user.subscriptionStatus || 'none',
        createdAt: user.createdAt.toISOString(),
        flagged: false,
        suspiciousActivity: []
      }));

      res.json(adminUsers);
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  // Get all tests
  app.get('/api/admin/tests', requireAdmin, async (req: Request, res: Response) => {
    try {
      const allTests = await storage.getAllTests();
      
      const adminTests = await Promise.all(
        allTests.map(async (test) => {
          const user = await storage.getUser(test.userId);
          const titles = await storage.getTitlesByTestId(test.id);
          
          return {
            id: test.id,
            userId: test.userId,
            userEmail: user?.email || 'Unknown',
            videoTitle: test.videoTitle || 'Unknown Video',
            status: test.status,
            titlesCount: titles.length,
            rotationIntervalMinutes: test.rotationIntervalMinutes,
            createdAt: test.createdAt.toISOString(),
            flagged: false,
            suspiciousActivity: []
          };
        })
      );

      res.json(adminTests);
    } catch (error) {
      console.error('Error getting tests:', error);
      res.status(500).json({ error: 'Failed to get tests' });
    }
  });

  // Upgrade user subscription
  app.post('/api/admin/users/:userId/upgrade', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { tier } = req.body;
      const adminUser = (req as any).user;
      
      if (!['pro', 'authority', 'lifetime'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier specified' });
      }
      
      // Update user's subscription
      await storage.updateUserSubscription(userId, 'active', tier);
      
      // Get updated user data
      const user = await storage.getUser(userId);
      console.log(`Admin action: upgrade user ${userId} to ${tier} by ${adminUser.email}`);
      
      return res.json({ 
        success: true, 
        userId,
        tier,
        message: `User upgraded to ${tier.toUpperCase()} successfully`,
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionTier: user.subscriptionTier
        } : null
      });
    } catch (error) {
      console.error('Error upgrading user:', error);
      res.status(500).json({ error: 'Failed to upgrade user' });
    }
  });

  // Downgrade user subscription
  app.post('/api/admin/users/:userId/downgrade', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { tier } = req.body;
      const adminUser = (req as any).user;
      
      if (!['pro', 'cancelled'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid downgrade tier specified' });
      }
      
      // Update user's subscription
      await storage.updateUserSubscription(userId, tier === 'cancelled' ? 'cancelled' : 'active', tier === 'cancelled' ? '' : tier);
      
      // Get updated user data
      const user = await storage.getUser(userId);
      console.log(`Admin action: downgrade user ${userId} to ${tier} by ${adminUser.email}`);
      
      return res.json({ 
        success: true, 
        userId,
        tier,
        message: `User ${tier === 'cancelled' ? 'access cancelled' : `downgraded to ${tier.toUpperCase()}`} successfully`,
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionTier: user.subscriptionTier
        } : null
      });
    } catch (error) {
      console.error('Error downgrading user:', error);
      res.status(500).json({ error: 'Failed to downgrade user' });
    }
  });

  // Moderate user
  app.post('/api/admin/users/:userId/:action', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, action } = req.params;
      const adminUser = (req as any).user;
      
      if (action === 'cancel-access') {
        // Cancel user's subscription and access
        await storage.updateUserSubscription(userId, 'cancelled', '');
        
        // Get updated user data
        const user = await storage.getUser(userId);
        console.log(`Admin cancelled access for user ${userId} (${user?.email}) by ${adminUser.email}`);
        
        return res.json({ 
          success: true, 
          action, 
          userId,
          message: 'User access cancelled successfully',
          user: user ? {
            id: user.id,
            email: user.email,
            name: user.name,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionTier: user.subscriptionTier
          } : null
        });
      } else if (action === 'restore-access') {
        // Restore user's subscription and access
        const { tier = 'pro' } = req.body;
        await storage.updateUserSubscription(userId, 'active', tier);
        
        // Get updated user data
        const user = await storage.getUser(userId);
        console.log(`Admin restored access for user ${userId} (${user?.email}) to ${tier} tier by ${adminUser.email}`);
        
        return res.json({ 
          success: true, 
          action, 
          userId,
          message: 'User access restored successfully',
          user: user ? {
            id: user.id,
            email: user.email,
            name: user.name,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionTier: user.subscriptionTier
          } : null
        });
      }
      
      console.log(`Admin action: ${action} user ${userId} by ${adminUser.email}`);
      res.json({ success: true, action, userId });
    } catch (error) {
      console.error('Error moderating user:', error);
      res.status(500).json({ error: 'Failed to moderate user' });
    }
  });

  // Grant specific access to users
  app.post('/api/admin/users/:userId/grant-access', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { tier } = req.body; // 'pro', 'authority', or 'lifetime'
      const adminUser = (req as any).user;
      
      if (!['pro', 'authority', 'lifetime'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier. Must be pro, authority, or lifetime' });
      }
      
      // Grant access with the specified tier
      await storage.updateUserSubscription(userId, 'active', tier);
      
      // Get updated user data
      const user = await storage.getUser(userId);
      console.log(`Admin granted ${tier} access to user ${userId} (${user?.email}) by ${adminUser.email}`);
      
      res.json({ 
        success: true,
        message: `${tier.charAt(0).toUpperCase() + tier.slice(1)} access granted successfully`,
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionTier: user.subscriptionTier
        } : null
      });
    } catch (error) {
      console.error('Error granting access:', error);
      res.status(500).json({ error: 'Failed to grant access' });
    }
  });

  // Moderate test
  app.post('/api/admin/tests/:testId/:action', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { testId, action } = req.params;
      const adminUser = (req as any).user;
      
      if (action === 'pause') {
        await storage.updateTestStatus(testId, 'paused');
      } else if (action === 'cancel') {
        await storage.updateTestStatus(testId, 'cancelled');
      }

      console.log(`Admin action: ${action} test ${testId} by ${adminUser.email}`);
      
      res.json({ success: true, action, testId });
    } catch (error) {
      console.error('Error moderating test:', error);
      res.status(500).json({ error: 'Failed to moderate test' });
    }
  });

  // Export data
  app.get('/api/admin/export/:type', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const timestamp = new Date().toISOString().split('T')[0];
      
      let csvData = '';
      let filename = '';

      if (type === 'users') {
        const users = await storage.getAllUsers();
        csvData = 'ID,Email,Name,Created,Subscription Tier,Status\n';
        users.forEach(user => {
          csvData += `${user.id},"${user.email}","${user.name || ''}",${user.createdAt.toISOString()},"${user.subscriptionTier || 'none'}","${user.subscriptionStatus || 'none'}"\n`;
        });
        filename = `titletesterpro-users-${timestamp}.csv`;
      } else if (type === 'tests') {
        const tests = await storage.getAllTests();
        csvData = 'ID,User ID,Video ID,Title,Status,Created,Rotation Interval\n';
        tests.forEach(test => {
          csvData += `${test.id},${test.userId},"${test.videoId}","${test.videoTitle || ''}",${test.status},${test.createdAt.toISOString()},${test.rotationIntervalMinutes}\n`;
        });
        filename = `titletesterpro-tests-${timestamp}.csv`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvData);
    } catch (error) {
      console.error('Error exporting data:', error);
      res.status(500).json({ error: 'Failed to export data' });
    }
  });
}