import { storage } from './storage';
import { youtubeService } from './youtubeService';

export class AnalyticsCollector {
  
  /**
   * Force collect analytics for a specific test immediately
   * This bypasses the scheduler and collects real-time data
   */
  async forceCollectTestAnalytics(testId: string): Promise<void> {
    try {
      const test = await storage.getTest(testId);
      if (!test) {
        throw new Error('Test not found');
      }

      const user = await storage.getUser(test.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const account = await storage.getAccountByUserId(user.id, 'google');
      if (!account?.accessToken) {
        throw new Error('YouTube account not connected - OAuth tokens required');
      }

      const titles = await storage.getTitlesByTestId(testId);
      if (!titles.length) {
        throw new Error('No titles found for test');
      }

      // Activate first title if none are active
      let activeTitle = titles.find(t => t.activatedAt);
      if (!activeTitle) {
        activeTitle = titles[0];
        await storage.updateTitleActivation(activeTitle.id, new Date());
        
        // Update YouTube video title
        try {
          await youtubeService.updateVideoTitle(test.userId, test.videoId, activeTitle.text);
        } catch (error) {
          console.error('Failed to update YouTube title:', error);
        }
      }

      // Collect analytics for the active title
      await this.collectTitleAnalytics(activeTitle.id);

      console.log(`✅ Analytics collected for test ${testId}`);
    } catch (error) {
      console.error(`❌ Failed to collect analytics for test ${testId}:`, error);
      throw error;
    }
  }

  /**
   * Collect analytics for a specific title
   */
  private async collectTitleAnalytics(titleId: string): Promise<void> {
    const title = await storage.getTitle(titleId);
    if (!title || !title.activatedAt) {
      throw new Error('Title not found or not activated');
    }

    const test = await storage.getTest(title.testId);
    if (!test) {
      throw new Error('Test not found for title');
    }

    const user = await storage.getUser(test.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Calculate date range - from when title was activated to now
    const startDate = title.activatedAt.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    try {
      // Get real YouTube analytics data
      const analytics = await youtubeService.getVideoAnalytics(
        user.id,
        test.videoId,
        startDate,
        endDate
      );

      // Create analytics poll record
      await storage.createAnalyticsPoll({
        titleId: title.id,
        views: analytics.views || 0,
        impressions: analytics.impressions || 0,
        ctr: analytics.ctr || 0,
        averageViewDuration: analytics.averageViewDuration || 0,
      });

      console.log(`📊 Analytics poll created for title "${title.text}": ${analytics.views} views, ${analytics.ctr.toFixed(2)}% CTR`);
    } catch (error) {
      console.error(`Failed to collect analytics for title ${titleId}:`, error);
      
      // Create minimal analytics record to prevent empty state
      await storage.createAnalyticsPoll({
        titleId: title.id,
        views: 0,
        impressions: 0,
        ctr: 0,
        averageViewDuration: 0,
      });
    }
  }

  /**
   * Initialize analytics collection for all active tests
   */
  async initializeAllActiveTests(): Promise<void> {
    try {
      const allTests = await storage.getAllTests();
      const activeTests = allTests.filter(test => test.status === 'active');

      console.log(`🔄 Initializing analytics for ${activeTests.length} active tests`);

      for (const test of activeTests) {
        try {
          await this.forceCollectTestAnalytics(test.id);
        } catch (error) {
          console.error(`Failed to initialize test ${test.id}:`, error);
        }
      }

      console.log(`✅ Analytics initialization complete`);
    } catch (error) {
      console.error('Failed to initialize active tests:', error);
    }
  }

  /**
   * Simulate title rotation for testing purposes
   */
  async simulateRotation(testId: string): Promise<void> {
    try {
      const test = await storage.getTest(testId);
      if (!test) {
        throw new Error('Test not found');
      }

      const titles = await storage.getTitlesByTestId(testId);
      const currentActive = titles.find(t => t.activatedAt);
      
      // Find next title to activate
      let nextTitle;
      if (!currentActive) {
        nextTitle = titles[0];
      } else {
        const currentOrder = currentActive.order;
        nextTitle = titles.find(t => t.order === currentOrder + 1) || titles[0];
      }

      if (nextTitle && nextTitle.id !== currentActive?.id) {
        // Activate next title
        await storage.updateTitleActivation(nextTitle.id, new Date());
        
        // Update YouTube video title
        try {
          await youtubeService.updateVideoTitle(test.userId, test.videoId, nextTitle.text);
          console.log(`🔄 Rotated to title: "${nextTitle.text}"`);
        } catch (error) {
          console.error('Failed to update YouTube title:', error);
        }

        // Collect analytics for the new title
        await this.collectTitleAnalytics(nextTitle.id);
      }
    } catch (error) {
      console.error(`Failed to simulate rotation for test ${testId}:`, error);
      throw error;
    }
  }
}

export const analyticsCollector = new AnalyticsCollector();