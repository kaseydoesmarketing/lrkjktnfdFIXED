import { storage } from "./storage";
import { anthropicService } from "./anthropicService";
import { db } from "./db";
import { users, tests, titles, analyticsPolls } from "@shared/schema";
import { eq, desc, count, sql } from "drizzle-orm";

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalTests: number;
  activeTests: number;
  totalApiCalls: number;
  dailyApiCalls: number;
  platformHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  testsCount: number;
  createdAt: string;
  flagged: boolean;
  suspiciousActivity: string[];
}

interface AdminTest {
  id: string;
  userId: string;
  userEmail: string;
  videoTitle: string;
  status: string;
  titlesCount: number;
  rotationIntervalMinutes: number;
  createdAt: string;
  flagged: boolean;
  suspiciousActivity: string[];
}

export class AdminService {
  // Check if user has admin privileges
  static isAdmin(userEmail: string): boolean {
    const adminEmails = [
      'KaseyDoesMarketing@gmail.com',
      'admin@titletesterpro.com'
    ];
    return adminEmails.includes(userEmail);
  }

  // Get platform metrics with Claude AI health analysis
  static async getPlatformMetrics(): Promise<AdminMetrics> {
    try {
      // Get basic counts
      const [totalUsersResult] = await db.select({ count: count() }).from(users);
      const [totalTestsResult] = await db.select({ count: count() }).from(tests);
      const [activeTestsResult] = await db.select({ count: count() })
        .from(tests)
        .where(eq(tests.status, 'active'));

      // Get recent activity (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [recentUsersResult] = await db.select({ count: count() })
        .from(users)
        .where(sql`${users.createdAt} > ${yesterday}`);

      // Get API call counts
      const [totalApiResult] = await db.select({ count: count() }).from(analyticsPolls);

      // Use Claude AI to determine platform health
      const healthMetrics = {
        totalUsers: totalUsersResult.count,
        activeUsers: recentUsersResult.count,
        totalTests: totalTestsResult.count,
        activeTests: activeTestsResult.count,
        apiCalls: totalApiResult.count,
        dailyApiCalls: Math.floor(totalApiResult.count / 30), // Rough estimate
        avgTestsPerUser: totalUsersResult.count > 0 ? totalTestsResult.count / totalUsersResult.count : 0
      };

      const healthAnalysis = await anthropicService.analyzePlatformHealth(healthMetrics);

      return {
        totalUsers: totalUsersResult.count,
        activeUsers: recentUsersResult.count,
        totalTests: totalTestsResult.count,
        activeTests: activeTestsResult.count,
        totalApiCalls: totalApiResult.count,
        dailyApiCalls: Math.floor(totalApiResult.count / 30),
        platformHealth: healthAnalysis.health
      };
    } catch (error) {
      console.error('Error getting platform metrics:', error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalTests: 0,
        activeTests: 0,
        totalApiCalls: 0,
        dailyApiCalls: 0,
        platformHealth: 'warning'
      };
    }
  }

  // Get all users with admin details and Claude AI suspicious activity detection
  static async getAllUsers(): Promise<AdminUser[]> {
    try {
      const usersData = await db.select().from(users).orderBy(desc(users.createdAt));

      const adminUsers: AdminUser[] = await Promise.all(
        usersData.map(async (user) => {
          // Get test count for this user
          const [testCount] = await db.select({ count: count() })
            .from(tests)
            .where(eq(tests.userId, user.id));

          // Use Claude AI to detect suspicious activity
          const userActivity = {
            testsCount: testCount.count,
            apiCalls: testCount.count * 10, // Estimate API calls
            accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            subscriptionTier: user.subscriptionTier || 'none',
            subscriptionStatus: user.subscriptionStatus || 'none'
          };

          let suspiciousAnalysis = { flagged: false, reasons: [], riskLevel: 'low' as const };
          try {
            suspiciousAnalysis = await anthropicService.detectSuspiciousUserActivity(userActivity);
          } catch (error) {
            console.error('Error analyzing user activity:', error);
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || 'Unknown',
            subscriptionTier: user.subscriptionTier || 'none',
            subscriptionStatus: user.subscriptionStatus || 'none',
            testsCount: testCount.count,
            createdAt: user.createdAt.toISOString(),
            flagged: suspiciousAnalysis.flagged,
            suspiciousActivity: suspiciousAnalysis.reasons
          };
        })
      );

      return adminUsers;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  // Get all tests with admin details and Claude AI suspicious activity detection
  static async getAllTests(): Promise<AdminTest[]> {
    try {
      const testsData = await db.select({
        testId: tests.id,
        userId: tests.userId,
        videoTitle: tests.videoTitle,
        status: tests.status,
        rotationIntervalMinutes: tests.rotationIntervalMinutes,
        createdAt: tests.createdAt,
        userEmail: users.email
      })
      .from(tests)
      .innerJoin(users, eq(tests.userId, users.id))
      .orderBy(desc(tests.createdAt));

      const adminTests: AdminTest[] = await Promise.all(
        testsData.map(async (test) => {
          // Get title count
          const [titleCount] = await db.select({ count: count() })
            .from(titles)
            .where(eq(titles.testId, test.testId));

          // Use Claude AI to detect suspicious test activity
          const testActivity = {
            rotationInterval: test.rotationIntervalMinutes,
            titlesCount: titleCount.count,
            totalRotations: titleCount.count * 2, // Estimate
            avgCtr: 6.2, // Mock average
            totalViews: 15000, // Mock total
            testAge: Math.floor((Date.now() - new Date(test.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            status: test.status
          };

          let suspiciousAnalysis = { flagged: false, reasons: [], riskLevel: 'low' as const };
          try {
            suspiciousAnalysis = await anthropicService.detectSuspiciousTestActivity(testActivity);
          } catch (error) {
            console.error('Error analyzing test activity:', error);
          }

          return {
            id: test.testId,
            userId: test.userId,
            userEmail: test.userEmail,
            videoTitle: test.videoTitle || 'Unknown Video',
            status: test.status,
            titlesCount: titleCount.count,
            rotationIntervalMinutes: test.rotationIntervalMinutes,
            createdAt: test.createdAt.toISOString(),
            flagged: suspiciousAnalysis.flagged,
            suspiciousActivity: suspiciousAnalysis.reasons
          };
        })
      );

      return adminTests;
    } catch (error) {
      console.error('Error getting all tests:', error);
      return [];
    }
  }

  // Get YouTube API quota status
  static async getQuotaStatus() {
    try {
      // Get recent API activity
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [apiUsage] = await db.select({ count: count() })
        .from(analyticsPolls);

      // Estimate quota usage (each poll = ~2-3 quota units)
      const estimatedQuotaUsed = apiUsage.count * 2.5;
      const quotaLimit = 10000; // Default quota
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0); // Reset at midnight Pacific Time

      return {
        current: Math.round(estimatedQuotaUsed),
        limit: quotaLimit,
        percentage: (estimatedQuotaUsed / quotaLimit) * 100,
        resetTime: resetTime.toISOString(),
        projectsUsed: 1,
        totalProjects: 1
      };
    } catch (error) {
      console.error('Error getting quota status:', error);
      return {
        current: 0,
        limit: 10000,
        percentage: 0,
        resetTime: new Date().toISOString(),
        projectsUsed: 1,
        totalProjects: 1
      };
    }
  }

  // Flag/unflag user
  static async flagUser(userId: string, action: 'flag' | 'unflag', adminEmail: string) {
    console.log(`Admin action: ${action} user ${userId} by ${adminEmail}`);
    // In a real system, you'd update a user flags table
    return { success: true, action, userId };
  }

  // Pause/cancel test
  static async moderateTest(testId: string, action: 'pause' | 'cancel', adminEmail: string) {
    try {
      if (action === 'pause') {
        await storage.updateTestStatus(testId, 'paused');
      } else if (action === 'cancel') {
        await storage.updateTestStatus(testId, 'cancelled');
      }

      console.log(`Admin action: ${action} test ${testId} by ${adminEmail}`);
      return { success: true, action, testId };
    } catch (error) {
      console.error(`Error ${action}ing test:`, error);
      throw error;
    }
  }

  // Export data to CSV
  static async exportData(type: 'users' | 'tests') {
    try {
      let csvData = '';
      const timestamp = new Date().toISOString().split('T')[0];

      if (type === 'users') {
        const usersData = await db.select().from(users);
        csvData = 'ID,Email,Name,Created,Subscription Tier,Status\n';
        usersData.forEach(user => {
          csvData += `${user.id},"${user.email}","${user.name || ''}",${user.createdAt.toISOString()},"${user.subscriptionTier || 'none'}","${user.subscriptionStatus || 'none'}"\n`;
        });
      } else if (type === 'tests') {
        const testsData = await db.select().from(tests);
        csvData = 'ID,User ID,Video ID,Title,Status,Created,Rotation Interval\n';
        testsData.forEach(test => {
          csvData += `${test.id},${test.userId},"${test.videoId}","${test.videoTitle || ''}",${test.status},${test.createdAt.toISOString()},${test.rotationIntervalMinutes}\n`;
        });
      }

      return {
        csvData,
        filename: `titletesterpro-${type}-${timestamp}.csv`
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }
}