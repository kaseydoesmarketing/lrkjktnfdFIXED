-- Clean up oauth tokens from users table (now using accounts table)
ALTER TABLE users 
DROP COLUMN IF EXISTS oauth_access_token,
DROP COLUMN IF EXISTS oauth_refresh_token,
DROP COLUMN IF EXISTS oauth_expires_at;

-- Add any missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);
CREATE INDEX IF NOT EXISTS idx_titles_test_id ON titles(test_id);
CREATE INDEX IF NOT EXISTS idx_test_rotation_logs_test_id ON test_rotation_logs(test_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);