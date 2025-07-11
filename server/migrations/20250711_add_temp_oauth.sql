-- Create temporary OAuth token storage table
CREATE TABLE IF NOT EXISTS temp_oauth (
  user_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  channels JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for user_id
CREATE INDEX IF NOT EXISTS idx_temp_oauth_user_id ON temp_oauth(user_id);

-- Add cleanup trigger to remove expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_temp_oauth()
RETURNS void AS $$
BEGIN
  DELETE FROM temp_oauth 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;