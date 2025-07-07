// ========================================
// COMPLETE STORAGE SERVICE
// ========================================

import pkg from 'pg';
const { Pool } = pkg;

// Database connection with optimized settings for SaaS
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000,
  query_timeout: 30000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

class StorageService {
  constructor() {
    this.pool = pool;
  }

  // ========================================
  // USER MANAGEMENT
  // ========================================

  async createUser(userData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO users (email, name, image, youtube_channel_id, youtube_channel_title, subscription_tier, subscription_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [
        userData.email,
        userData.name || null,
        userData.image || null,
        userData.youtubeId || null,
        userData.youtubeChannelTitle || null,
        userData.subscriptionTier || null,
        userData.subscriptionStatus || 'none'
      ];
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getUser(userId) {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await client.query(query, [userId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getUserByEmail(email) {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await client.query(query, [email]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async updateUser(userId, updates) {
    const client = await this.pool.connect();
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE users 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1 
        RETURNING *
      `;
      
      const values = [userId, ...Object.values(updates)];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateUserTokens(userId, tokens) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE users 
        SET access_token = $2, refresh_token = $3, token_expires_at = $4, updated_at = NOW()
        WHERE id = $1 
        RETURNING *
      `;
      const expiresAt = tokens.expiresAt ? new Date(tokens.expiresAt) : null;
      const result = await client.query(query, [userId, tokens.accessToken, tokens.refreshToken, expiresAt]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // ========================================
  // SESSION MANAGEMENT
  // ========================================

  async createSession(sessionData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO sessions (session_token, user_id, expires)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const result = await client.query(query, [
        sessionData.sessionToken,
        sessionData.userId,
        sessionData.expires
      ]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getSession(sessionToken) {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM sessions WHERE session_token = $1';
      const result = await client.query(query, [sessionToken]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async deleteSession(sessionToken) {
    const client = await this.pool.connect();
    try {
      const query = 'DELETE FROM sessions WHERE session_token = $1';
      await client.query(query, [sessionToken]);
      return true;
    } finally {
      client.release();
    }
  }

  // ========================================
  // SUBSCRIPTION MANAGEMENT
  // ========================================

  async updateUserSubscription(userId, subscriptionData) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE users 
        SET 
          stripe_subscription_id = COALESCE($2, stripe_subscription_id),
          stripe_customer_id = COALESCE($3, stripe_customer_id),
          subscription_status = COALESCE($4, subscription_status),
          subscription_tier = COALESCE($5, subscription_tier),
          subscription_start_date = COALESCE($6, subscription_start_date),
          subscription_end_date = COALESCE($7, subscription_end_date),
          trial_end_date = COALESCE($8, trial_end_date),
          cancel_at_period_end = COALESCE($9, cancel_at_period_end),
          last_payment_status = COALESCE($10, last_payment_status),
          last_payment_date = COALESCE($11, last_payment_date),
          payment_failure_count = COALESCE($12, payment_failure_count),
          access_level = COALESCE($13, access_level),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(query, [
        userId,
        subscriptionData.stripeSubscriptionId || null,
        subscriptionData.stripeCustomerId || null,
        subscriptionData.status || null,
        subscriptionData.planType || null,
        subscriptionData.currentPeriodStart || null,
        subscriptionData.currentPeriodEnd || null,
        subscriptionData.trialEnd || null,
        subscriptionData.cancelAtPeriodEnd || null,
        subscriptionData.lastPaymentStatus || null,
        subscriptionData.lastPaymentDate || null,
        subscriptionData.paymentFailureCount || null,
        subscriptionData.accessLevel || null
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async createPaymentRecord(paymentData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO payment_records (
          user_id, stripe_invoice_id, stripe_payment_intent_id, amount, currency, 
          status, failure_reason, plan_type, billing_period_start, billing_period_end,
          paid_at, attempted_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        paymentData.userId,
        paymentData.stripeInvoiceId || null,
        paymentData.stripePaymentIntentId || null,
        paymentData.amount,
        paymentData.currency || 'usd',
        paymentData.status,
        paymentData.failureReason || null,
        paymentData.planType || null,
        paymentData.billingPeriodStart || null,
        paymentData.billingPeriodEnd || null,
        paymentData.paidAt || null,
        paymentData.attemptedAt || new Date()
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // ========================================
  // YOUTUBE VIDEO MANAGEMENT
  // ========================================

  async upsertYouTubeVideo(userId, videoData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO youtube_videos (
          user_id, youtube_video_id, title, description, thumbnail_url,
          duration, published_at, channel_title, view_count, like_count, comment_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (user_id, youtube_video_id) 
        DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          thumbnail_url = EXCLUDED.thumbnail_url,
          view_count = EXCLUDED.view_count,
          like_count = EXCLUDED.like_count,
          comment_count = EXCLUDED.comment_count,
          last_updated_at = NOW()
        RETURNING *
      `;
      
      const result = await client.query(query, [
        userId,
        videoData.id,
        videoData.title,
        videoData.description || null,
        videoData.thumbnailUrl || videoData.thumbnail,
        videoData.duration || null,
        videoData.publishedAt ? new Date(videoData.publishedAt) : null,
        videoData.channelTitle || null,
        videoData.viewCount || 0,
        videoData.likeCount || 0,
        videoData.commentCount || 0
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getYouTubeVideosByUserId(userId, limit = 50, offset = 0) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM youtube_videos 
        WHERE user_id = $1 
        ORDER BY published_at DESC 
        LIMIT $2 OFFSET $3
      `;
      const result = await client.query(query, [userId, limit, offset]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getYouTubeVideo(userId, youtubeVideoId) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM youtube_videos 
        WHERE user_id = $1 AND youtube_video_id = $2
      `;
      const result = await client.query(query, [userId, youtubeVideoId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  // ========================================
  // A/B TEST MANAGEMENT
  // ========================================

  async createTest(testData) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get or create video record
      let video = await this.getYouTubeVideo(testData.userId, testData.videoId);
      if (!video) {
        video = await this.upsertYouTubeVideo(testData.userId, {
          id: testData.videoId,
          title: testData.videoTitle || 'Unknown Video',
          viewCount: 0
        });
      }

      // Create test
      const testQuery = `
        INSERT INTO tests (
          user_id, video_id, test_name, status, rotation_interval_minutes,
          winner_metric, start_date, end_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const testResult = await client.query(testQuery, [
        testData.userId,
        video.id,
        testData.testName || testData.videoTitle,
        testData.status || 'active',
        testData.rotationIntervalMinutes || 60,
        testData.winnerMetric || 'ctr',
        testData.startDate || new Date(),
        testData.endDate
      ]);

      await client.query('COMMIT');
      return testResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getTest(testId) {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM tests WHERE id = $1';
      const result = await client.query(query, [testId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async getTestsByUserId(userId) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT t.*, v.youtube_video_id, v.title as video_title, v.thumbnail_url
        FROM tests t
        JOIN youtube_videos v ON t.video_id = v.id
        WHERE t.user_id = $1
        ORDER BY t.created_at DESC
      `;
      const result = await client.query(query, [userId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async updateTest(testId, updates) {
    const client = await this.pool.connect();
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE tests 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1 
        RETURNING *
      `;
      
      const values = [testId, ...Object.values(updates)];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteTest(testId) {
    const client = await this.pool.connect();
    try {
      const query = 'DELETE FROM tests WHERE id = $1';
      await client.query(query, [testId]);
      return true;
    } finally {
      client.release();
    }
  }

  // ========================================
  // TITLE VARIANT MANAGEMENT
  // ========================================

  async createTitle(titleData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO title_variants (test_id, text, display_order, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        titleData.testId,
        titleData.text,
        titleData.order || 0,
        titleData.isActive || false
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getTitlesByTestId(testId) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM title_variants 
        WHERE test_id = $1 
        ORDER BY display_order
      `;
      const result = await client.query(query, [testId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getTitle(titleId) {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM title_variants WHERE id = $1';
      const result = await client.query(query, [titleId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async updateTitle(titleId, updates) {
    const client = await this.pool.connect();
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
        .join(', ');
      
      const query = `
        UPDATE title_variants 
        SET ${setClause}, updated_at = NOW()
        WHERE id = $1 
        RETURNING *
      `;
      
      const values = [titleId, ...Object.values(updates)];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // ========================================
  // PERFORMANCE TRACKING
  // ========================================

  async createTitlePerformance(performanceData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO title_performance (
          title_id, test_id, views, impressions, ctr, average_view_duration,
          likes, comments, shares, rotation_start, rotation_end
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        performanceData.titleId,
        performanceData.testId,
        performanceData.views || 0,
        performanceData.impressions || 0,
        performanceData.ctr || 0,
        performanceData.averageViewDuration || 0,
        performanceData.likes || 0,
        performanceData.comments || 0,
        performanceData.shares || 0,
        performanceData.rotationStart,
        performanceData.rotationEnd || null
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getTitlePerformance(titleId) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM title_performance 
        WHERE title_id = $1 
        ORDER BY rotation_start DESC
      `;
      const result = await client.query(query, [titleId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ========================================
  // ANALYTICS & DASHBOARD DATA
  // ========================================

  async getDashboardStats(userId) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM user_dashboard_summary WHERE user_id = $1
      `;
      const result = await client.query(query, [userId]);
      return result.rows[0] || {
        totalTests: 0,
        activeTests: 0,
        completedTests: 0,
        totalViews: 0,
        averageCtr: 0,
        totalVideos: 0
      };
    } finally {
      client.release();
    }
  }

  async getActiveTestsWithDetails(userId) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM active_test_details WHERE user_id = $1
        ORDER BY start_date DESC
      `;
      const result = await client.query(query, [userId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ========================================
  // ROTATION TRACKING
  // ========================================

  async createTitleRotation(rotationData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO title_rotations (
          test_id, title_id, rotation_number, started_at, 
          youtube_update_successful, youtube_update_error
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        rotationData.testId,
        rotationData.titleId,
        rotationData.rotationNumber,
        rotationData.startedAt || new Date(),
        rotationData.youtubeUpdateSuccessful || false,
        rotationData.youtubeUpdateError || null
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async endTitleRotation(rotationId, endedAt = new Date()) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE title_rotations 
        SET 
          ended_at = $2,
          duration_minutes = EXTRACT(EPOCH FROM ($2 - started_at)) / 60
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await client.query(query, [rotationId, endedAt]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getTitleRotationHistory(testId) {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT r.*, tv.text as title_text
        FROM title_rotations r
        JOIN title_variants tv ON r.title_id = tv.id
        WHERE r.test_id = $1
        ORDER BY r.started_at DESC
      `;
      const result = await client.query(query, [testId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // ========================================
  // EVENT LOGGING
  // ========================================

  async logEvent(eventData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO event_log (
          user_id, event_type, event_data, severity, source,
          request_id, user_agent, ip_address
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        eventData.userId || null,
        eventData.eventType,
        JSON.stringify(eventData.eventData || {}),
        eventData.severity || 'info',
        eventData.source || 'api',
        eventData.requestId || null,
        eventData.userAgent || null,
        eventData.ipAddress || null
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // ========================================
  // BACKGROUND JOBS
  // ========================================

  async createBackgroundJob(jobData) {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO background_jobs (
          job_type, job_data, status, priority, scheduled_for, max_attempts
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        jobData.jobType,
        JSON.stringify(jobData.jobData),
        jobData.status || 'pending',
        jobData.priority || 5,
        jobData.scheduledFor || new Date(),
        jobData.maxAttempts || 3
      ]);
      
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getNextJob() {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE background_jobs 
        SET status = 'running', started_at = NOW(), attempts = attempts + 1
        WHERE id = (
          SELECT id FROM background_jobs 
          WHERE status = 'pending' AND scheduled_for <= NOW()
          ORDER BY priority ASC, scheduled_for ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        RETURNING *
      `;
      
      const result = await client.query(query);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async completeJob(jobId, success = true, error = null) {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE background_jobs 
        SET 
          status = $2,
          completed_at = NOW(),
          last_error = $3,
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      
      const status = success ? 'completed' : 'failed';
      const result = await client.query(query, [jobId, status, error]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  async executeRawQuery(query, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async withTransaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ========================================
  // HEALTH CHECK & MONITORING
  // ========================================

  async healthCheck() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      return {
        status: 'healthy',
        timestamp: result.rows[0].current_time,
        dbVersion: result.rows[0].db_version,
        poolSize: this.pool.totalCount,
        idleClients: this.pool.idleCount,
        waitingClients: this.pool.waitingCount
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    } finally {
      client.release();
    }
  }

  async getSystemStats() {
    const client = await this.pool.connect();
    try {
      const queries = [
        'SELECT COUNT(*) as total_users FROM users',
        'SELECT COUNT(*) as active_subscriptions FROM users WHERE subscription_status = \'active\'',
        'SELECT COUNT(*) as active_tests FROM tests WHERE status = \'active\'',
        'SELECT COUNT(*) as total_tests FROM tests',
        'SELECT COUNT(*) as total_videos FROM youtube_videos'
      ];

      const results = await Promise.all(
        queries.map(query => client.query(query))
      );

      return {
        totalUsers: parseInt(results[0].rows[0].total_users),
        activeSubscriptions: parseInt(results[1].rows[0].active_subscriptions),
        activeTests: parseInt(results[2].rows[0].active_tests),
        totalTests: parseInt(results[3].rows[0].total_tests),
        totalVideos: parseInt(results[4].rows[0].total_videos)
      };
    } finally {
      client.release();
    }
  }

  // Cleanup old data periodically
  async cleanupOldData() {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT cleanup_old_data()');
      return { success: true, message: 'Cleanup completed' };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      client.release();
    }
  }
}

// ========================================
// EXPORT STORAGE SERVICE
// ========================================

export const storage = new StorageService();
export { StorageService };

// Auto-cleanup every 24 hours
setInterval(() => {
  storage.cleanupOldData()
    .then(result => console.log('🧹 Database cleanup:', result))
    .catch(error => console.error('❌ Cleanup failed:', error));
}, 24 * 60 * 60 * 1000);

console.log('✅ Storage service initialized with auto-cleanup');