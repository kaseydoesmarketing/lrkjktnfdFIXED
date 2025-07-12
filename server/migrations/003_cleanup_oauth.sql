-- Migration: Remove OAuth fields and tables for Supabase-only authentication
-- Date: 2025-01-12

-- Remove OAuth fields from users table
ALTER TABLE users 
DROP COLUMN IF EXISTS google_id,
DROP COLUMN IF EXISTS youtube_id,
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token,
DROP COLUMN IF EXISTS youtube_channel_id,
DROP COLUMN IF EXISTS youtube_channel_title,
DROP COLUMN IF EXISTS oauth_token;

-- Remove OAuth fields from accounts table  
ALTER TABLE accounts
DROP COLUMN IF EXISTS type,
DROP COLUMN IF EXISTS provider_account_id,
DROP COLUMN IF EXISTS refresh_token,
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS expires_at,
DROP COLUMN IF EXISTS token_type,
DROP COLUMN IF EXISTS scope,
DROP COLUMN IF EXISTS id_token,
DROP COLUMN IF EXISTS session_state;

-- Drop sessions table (Supabase manages sessions)
DROP TABLE IF EXISTS sessions;

-- Drop temp_oauth table
DROP TABLE IF EXISTS temp_oauth;