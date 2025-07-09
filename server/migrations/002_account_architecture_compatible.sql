-- Migration: Add Account-Based Architecture Tables (Compatible with existing schema)
-- This migration adds missing tables for multi-tenant support

-- Add missing columns to existing tables if they don't exist
ALTER TABLE tests ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS channel_id TEXT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS rotation_interval_hours INTEGER;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS last_rotation_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT;

-- Create test_titles table if not exists
CREATE TABLE IF NOT EXISTS test_titles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(test_id, position)
);

-- Create rotation_logs table
CREATE TABLE IF NOT EXISTS rotation_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    title_id TEXT NOT NULL REFERENCES test_titles(id) ON DELETE CASCADE,
    rotated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create account_based tables if needed
CREATE TABLE IF NOT EXISTS account_teams (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan_type VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_team_memberships (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES account_teams(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '[]',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, team_id)
);

CREATE TABLE IF NOT EXISTS team_channels (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    team_id TEXT NOT NULL REFERENCES account_teams(id) ON DELETE CASCADE,
    youtube_channel_id VARCHAR(100) NOT NULL,
    channel_name VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, youtube_channel_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_titles_test_id ON test_titles(test_id);
CREATE INDEX IF NOT EXISTS idx_rotation_logs_test_id ON rotation_logs(test_id);
CREATE INDEX IF NOT EXISTS idx_team_channels_team_id ON team_channels(team_id);
CREATE INDEX IF NOT EXISTS idx_account_team_memberships_user ON account_team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_account_team_memberships_team ON account_team_memberships(team_id);

-- Migrate existing data to team structure
DO $$
BEGIN
    -- Create teams for existing users if they don't have one
    INSERT INTO account_teams (id, name, slug, plan_type, created_at)
    SELECT 
        u.id,
        COALESCE(u.name, u.email),
        LOWER(REPLACE(COALESCE(u.name, SPLIT_PART(u.email, '@', 1)), ' ', '-')),
        CASE 
            WHEN u.subscription_tier = 'authority' THEN 'authority'
            WHEN u.subscription_tier = 'pro' THEN 'pro'
            ELSE 'free'
        END,
        u.created_at
    FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM account_team_memberships atm 
        WHERE atm.user_id = u.id
    )
    ON CONFLICT (slug) DO NOTHING;
    
    -- Create team memberships for users
    INSERT INTO account_team_memberships (user_id, team_id, role)
    SELECT 
        u.id,
        at.id,
        'owner'
    FROM users u
    JOIN account_teams at ON at.id = u.id
    WHERE NOT EXISTS (
        SELECT 1 FROM account_team_memberships atm 
        WHERE atm.user_id = u.id AND atm.team_id = at.id
    );
END $$;

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_account_teams_updated_at ON account_teams;
CREATE TRIGGER update_account_teams_updated_at BEFORE UPDATE ON account_teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
DROP TRIGGER IF EXISTS update_team_channels_updated_at ON team_channels;
CREATE TRIGGER update_team_channels_updated_at BEFORE UPDATE ON team_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();