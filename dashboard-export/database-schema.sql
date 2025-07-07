-- ========================================
-- TITLETESTERPRO COMPLETE DATABASE SCHEMA
-- ========================================

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS & AUTHENTICATION TABLES
-- ========================================

-- Users table with comprehensive fields
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    image TEXT,
    
    -- YouTube integration
    youtube_channel_id VARCHAR(255),
    youtube_channel_title VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Stripe integration
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255),
    
    -- Subscription details
    subscription_status VARCHAR(50) DEFAULT 'none', -- none, active, past_due, canceled, trialing
    subscription_tier VARCHAR(50), -- pro, authority
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Payment tracking
    last_payment_status VARCHAR(50), -- succeeded, failed
    last_payment_date TIMESTAMP WITH TIME ZONE,
    payment_failure_count INTEGER DEFAULT 0,
    access_level VARCHAR(50) DEFAULT 'free', -- free, limited, full
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_users_email (email),
    INDEX idx_users_stripe_customer (stripe_customer_id),
    INDEX idx_users_subscription_status (subscription_status),
    INDEX idx_users_youtube_channel (youtube_channel_id)
);

-- Sessions table for authentication
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_sessions_token (session_token),
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_expires (expires)
);

-- OAuth accounts table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- oauth, email
    provider VARCHAR(50) NOT NULL, -- google, youtube
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at BIGINT,
    token_type VARCHAR(50),
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider, provider_account_id),
    INDEX idx_accounts_user_id (user_id),
    INDEX idx_accounts_provider (provider, provider_account_id)
);

-- ========================================
-- PAYMENT & SUBSCRIPTION TABLES
-- ========================================

-- Payment records for tracking all transactions
CREATE TABLE payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL, -- succeeded, failed, pending
    failure_reason TEXT,
    plan_type VARCHAR(50), -- pro, authority
    billing_period_start TIMESTAMP WITH TIME ZONE,
    billing_period_end TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_payments_user_id (user_id),
    INDEX idx_payments_status (status),
    INDEX idx_payments_stripe_invoice (stripe_invoice_id)
);

-- Subscription changes log
CREATE TABLE subscription_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_tier VARCHAR(50),
    to_tier VARCHAR(50),
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    change_reason VARCHAR(100), -- upgrade, downgrade, cancellation, payment_failed
    stripe_event_id VARCHAR(255),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_subscription_changes_user_id (user_id),
    INDEX idx_subscription_changes_date (changed_at)
);

-- ========================================
-- YOUTUBE DATA TABLES
-- ========================================

-- YouTube videos cache
CREATE TABLE youtube_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    youtube_video_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    duration VARCHAR(50), -- PT format from YouTube
    published_at TIMESTAMP WITH TIME ZONE,
    channel_title VARCHAR(255),
    
    -- Current metrics (updated periodically)
    view_count BIGINT DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    
    -- Metadata
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, youtube_video_id),
    INDEX idx_videos_user_id (user_id),
    INDEX idx_videos_youtube_id (youtube_video_id),
    INDEX idx_videos_published (published_at DESC)
);

-- YouTube analytics data (time-series)
CREATE TABLE youtube_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES youtube_videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Analytics metrics
    views BIGINT DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    click_through_rate DECIMAL(5,3) DEFAULT 0, -- CTR as percentage (e.g., 5.234)
    average_view_duration INTEGER DEFAULT 0, -- in seconds
    estimated_minutes_watched INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    
    -- Date information
    analytics_date DATE NOT NULL,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(video_id, analytics_date),
    INDEX idx_analytics_video_id (video_id),
    INDEX idx_analytics_user_id (user_id),
    INDEX idx_analytics_date (analytics_date DESC)
);

-- ========================================
-- A/B TESTING TABLES
-- ========================================

-- A/B Tests
CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES youtube_videos(id) ON DELETE CASCADE,
    
    -- Test configuration
    test_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, canceled
    rotation_interval_minutes INTEGER DEFAULT 60,
    winner_metric VARCHAR(50) DEFAULT 'ctr', -- ctr, views, engagement
    
    -- Test timeline
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Results
    winning_title_id UUID, -- Will be set when test completes
    statistical_significance DECIMAL(5,3), -- Confidence level
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_tests_user_id (user_id),
    INDEX idx_tests_video_id (video_id),
    INDEX idx_tests_status (status),
    INDEX idx_tests_end_date (end_date)
);

-- Title variants for A/B tests
CREATE TABLE title_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    
    -- Title details
    text TEXT NOT NULL,
    display_order INTEGER NOT NULL, -- Order for display (A, B, C, etc.)
    is_active BOOLEAN DEFAULT FALSE, -- Currently active title
    
    -- Activation tracking
    activated_at TIMESTAMP WITH TIME ZONE,
    activation_count INTEGER DEFAULT 0,
    total_active_duration INTEGER DEFAULT 0, -- Total minutes active
    
    -- Performance summary (calculated)
    total_views BIGINT DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    final_ctr DECIMAL(5,3) DEFAULT 0,
    final_avg_view_duration INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_titles_test_id (test_id),
    INDEX idx_titles_active (is_active),
    INDEX idx_titles_order (display_order)
);

-- Title performance data (time-series for each rotation)
CREATE TABLE title_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_id UUID NOT NULL REFERENCES title_variants(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    
    -- Performance metrics for this rotation period
    views BIGINT DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    ctr DECIMAL(5,3) DEFAULT 0,
    average_view_duration INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    
    -- Time period for this data
    rotation_start TIMESTAMP WITH TIME ZONE NOT NULL,
    rotation_end TIMESTAMP WITH TIME ZONE,
    data_collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_performance_title_id (title_id),
    INDEX idx_performance_test_id (test_id),
    INDEX idx_performance_start (rotation_start DESC)
);

-- Title rotation history
CREATE TABLE title_rotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    title_id UUID NOT NULL REFERENCES title_variants(id) ON DELETE CASCADE,
    
    -- Rotation details
    rotation_number INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER, -- Calculated when ended
    
    -- Success tracking
    youtube_update_successful BOOLEAN DEFAULT FALSE,
    youtube_update_error TEXT,
    
    INDEX idx_rotations_test_id (test_id),
    INDEX idx_rotations_title_id (title_id),
    INDEX idx_rotations_started (started_at DESC)
);

-- ========================================
-- SYSTEM TABLES
-- ========================================

-- API quota tracking
CREATE TABLE api_quota_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    api_type VARCHAR(50) NOT NULL, -- youtube_data, youtube_analytics, stripe
    endpoint VARCHAR(255),
    quota_consumed INTEGER DEFAULT 1,
    daily_limit INTEGER,
    reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_quota_user_date (user_id, reset_date),
    INDEX idx_quota_api_type (api_type, reset_date)
);

-- Background jobs queue
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(100) NOT NULL, -- rotate_title, collect_analytics, send_email
    job_data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest
    
    -- Scheduling
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Retry logic
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_jobs_status_priority (status, priority, scheduled_for),
    INDEX idx_jobs_type (job_type),
    INDEX idx_jobs_scheduled (scheduled_for)
);

-- Event log for debugging and analytics
CREATE TABLE event_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    severity VARCHAR(20) DEFAULT 'info', -- debug, info, warn, error
    source VARCHAR(100), -- api, webhook, cron, manual
    
    -- Context
    request_id VARCHAR(100),
    user_agent TEXT,
    ip_address INET,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_events_user_id (user_id),
    INDEX idx_events_type (event_type),
    INDEX idx_events_severity (severity),
    INDEX idx_events_created (created_at DESC)
);

-- ========================================
-- VIEWS FOR EASY QUERYING
-- ========================================

-- User dashboard summary view
CREATE VIEW user_dashboard_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    u.subscription_tier,
    u.subscription_status,
    
    -- Test statistics
    COUNT(DISTINCT t.id) as total_tests,
    COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.id END) as active_tests,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tests,
    
    -- Performance metrics
    COALESCE(SUM(tv.total_views), 0) as total_views,
    COALESCE(AVG(tv.final_ctr), 0) as average_ctr,
    
    -- Video count
    COUNT(DISTINCT v.id) as total_videos
    
FROM users u
LEFT JOIN tests t ON u.id = t.user_id
LEFT JOIN title_variants tv ON t.id = tv.test_id
LEFT JOIN youtube_videos v ON u.id = v.user_id
GROUP BY u.id, u.name, u.email, u.subscription_tier, u.subscription_status;

-- Active test details view
CREATE VIEW active_test_details AS
SELECT 
    t.id as test_id,
    t.user_id,
    t.test_name,
    t.status,
    t.rotation_interval_minutes,
    t.start_date,
    t.end_date,
    
    -- Video info
    v.youtube_video_id,
    v.title as video_title,
    v.thumbnail_url,
    
    -- Current active title
    active_title.id as active_title_id,
    active_title.text as current_title,
    active_title.activated_at,
    
    -- Performance summary
    COUNT(tv.id) as total_titles,
    COUNT(CASE WHEN tv.activation_count > 0 THEN 1 END) as tested_titles,
    COALESCE(SUM(tv.total_views), 0) as total_test_views,
    COALESCE(AVG(tv.final_ctr), 0) as average_test_ctr
    
FROM tests t
JOIN youtube_videos v ON t.video_id = v.id
LEFT JOIN title_variants tv ON t.id = tv.test_id
LEFT JOIN title_variants active_title ON t.id = active_title.test_id AND active_title.is_active = true
WHERE t.status = 'active'
GROUP BY t.id, t.user_id, t.test_name, t.status, t.rotation_interval_minutes, 
         t.start_date, t.end_date, v.youtube_video_id, v.title, v.thumbnail_url,
         active_title.id, active_title.text, active_title.activated_at;

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_titles_updated_at BEFORE UPDATE ON title_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON background_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate title performance summary
CREATE OR REPLACE FUNCTION calculate_title_summary(title_variant_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE title_variants 
    SET 
        total_views = (
            SELECT COALESCE(SUM(views), 0) 
            FROM title_performance 
            WHERE title_id = title_variant_id
        ),
        total_impressions = (
            SELECT COALESCE(SUM(impressions), 0) 
            FROM title_performance 
            WHERE title_id = title_variant_id
        ),
        final_ctr = (
            SELECT COALESCE(AVG(ctr), 0) 
            FROM title_performance 
            WHERE title_id = title_variant_id
        ),
        final_avg_view_duration = (
            SELECT COALESCE(AVG(average_view_duration), 0) 
            FROM title_performance 
            WHERE title_id = title_variant_id
        ),
        updated_at = NOW()
    WHERE id = title_variant_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INITIAL DATA & CONFIGURATION
-- ========================================

-- Insert default API quota limits
INSERT INTO api_quota_usage (api_type, daily_limit, reset_date) VALUES
('youtube_data', 10000, CURRENT_DATE),
('youtube_analytics', 200, CURRENT_DATE),
('stripe', 1000, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tests_user_status_date ON tests(user_id, status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_title_rotation ON title_performance(title_id, rotation_start DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_user_date ON youtube_analytics(user_id, analytics_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_date ON payment_records(user_id, paid_at DESC);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_tests ON tests(user_id, created_at DESC) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_titles ON title_variants(test_id) WHERE is_active = true;

-- Full-text search index for video titles and descriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_search ON youtube_videos USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ========================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ========================================

-- Daily user activity summary
CREATE MATERIALIZED VIEW daily_user_activity AS
SELECT 
    DATE(created_at) as activity_date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_events,
    COUNT(CASE WHEN event_type = 'test_created' THEN 1 END) as tests_created,
    COUNT(CASE WHEN event_type = 'title_rotated' THEN 1 END) as title_rotations,
    COUNT(CASE WHEN event_type = 'subscription_created' THEN 1 END) as new_subscriptions
FROM event_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY activity_date DESC;

-- Create refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_daily_user_activity()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW daily_user_activity;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CLEANUP FUNCTIONS
-- ========================================

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Delete old sessions (older than 30 days)
    DELETE FROM sessions WHERE expires < NOW() - INTERVAL '30 days';
    
    -- Delete old event logs (older than 90 days)
    DELETE FROM event_log WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Delete completed background jobs (older than 7 days)
    DELETE FROM background_jobs 
    WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days';
    
    -- Delete old quota usage records (older than 1 year)
    DELETE FROM api_quota_usage WHERE reset_date < CURRENT_DATE - INTERVAL '1 year';
    
    RAISE NOTICE 'Old data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE users IS 'Core user accounts with authentication and subscription data';
COMMENT ON TABLE tests IS 'A/B test configurations and results';
COMMENT ON TABLE title_variants IS 'Individual title variations within each A/B test';
COMMENT ON TABLE title_performance IS 'Time-series performance data for each title rotation';
COMMENT ON TABLE youtube_analytics IS 'Historical YouTube analytics data';
COMMENT ON TABLE payment_records IS 'Complete payment transaction history';
COMMENT ON TABLE background_jobs IS 'Queue for scheduled and background tasks';
COMMENT ON TABLE event_log IS 'Application event tracking for debugging and analytics';

COMMENT ON VIEW user_dashboard_summary IS 'Aggregated user statistics for dashboard display';
COMMENT ON VIEW active_test_details IS 'Comprehensive view of currently running A/B tests';

-- ========================================
-- GRANTS AND PERMISSIONS
-- ========================================

-- Grant appropriate permissions (adjust for your user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO titletesterpro_app;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO titletesterpro_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO titletesterpro_app;

-- For read-only analytics access
-- GRANT SELECT ON user_dashboard_summary, daily_user_activity TO titletesterpro_analytics;