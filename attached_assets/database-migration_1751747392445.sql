-- TitleTesterPro Dashboard Fixes Migration
-- Run this migration to ensure database schema supports all new features

-- 1. Ensure titles table has all required columns
ALTER TABLE titles 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- 2. Create index for faster rotation queries
CREATE INDEX IF NOT EXISTS idx_titles_test_order 
ON titles(test_id, "order");

CREATE INDEX IF NOT EXISTS idx_titles_test_active 
ON titles(test_id, is_active);

-- 3. Ensure tests table has proper status tracking
ALTER TABLE tests
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 4. Create analytics_polls table if not exists
CREATE TABLE IF NOT EXISTS analytics_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  average_view_duration INTEGER DEFAULT 0,
  polled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_polls_title_id 
ON analytics_polls(title_id);

CREATE INDEX IF NOT EXISTS idx_analytics_polls_polled_at 
ON analytics_polls(polled_at DESC);

-- 6. Add composite index for efficient analytics aggregation
CREATE INDEX IF NOT EXISTS idx_analytics_polls_title_time 
ON analytics_polls(title_id, polled_at DESC);

-- 7. Ensure proper foreign key constraints
ALTER TABLE titles
DROP CONSTRAINT IF EXISTS titles_test_id_fkey,
ADD CONSTRAINT titles_test_id_fkey 
  FOREIGN KEY (test_id) 
  REFERENCES tests(id) 
  ON DELETE CASCADE;

ALTER TABLE analytics_polls
DROP CONSTRAINT IF EXISTS analytics_polls_title_id_fkey,
ADD CONSTRAINT analytics_polls_title_id_fkey 
  FOREIGN KEY (title_id) 
  REFERENCES titles(id) 
  ON DELETE CASCADE;

-- 8. Create rotation logs view for easier querying
CREATE OR REPLACE VIEW rotation_logs AS
SELECT 
  t.id as title_id,
  t.text as title_text,
  t."order" as title_order,
  t.activated_at as rotated_at,
  t.test_id,
  COALESCE(
    EXTRACT(EPOCH FROM (
      LEAD(t.activated_at) OVER (PARTITION BY t.test_id ORDER BY t."order") - t.activated_at
    )) / 60,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.activated_at)) / 60
  )::INTEGER as duration_minutes
FROM titles t
WHERE t.activated_at IS NOT NULL
ORDER BY t.test_id, t."order";

-- 9. Add helper function to get current title for a test
CREATE OR REPLACE FUNCTION get_current_title(test_uuid UUID)
RETURNS TABLE (
  title_id UUID,
  title_text TEXT,
  title_order INTEGER,
  activated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.text, t."order", t.activated_at
  FROM titles t
  WHERE t.test_id = test_uuid 
    AND t.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 10. Add trigger to ensure only one active title per test
CREATE OR REPLACE FUNCTION ensure_single_active_title()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE titles 
    SET is_active = false 
    WHERE test_id = NEW.test_id 
      AND id != NEW.id 
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_active_title_trigger ON titles;
CREATE TRIGGER ensure_single_active_title_trigger
BEFORE INSERT OR UPDATE ON titles
FOR EACH ROW
EXECUTE FUNCTION ensure_single_active_title();

-- 11. Add function to calculate next rotation time
CREATE OR REPLACE FUNCTION get_next_rotation_time(test_uuid UUID)
RETURNS TIMESTAMP AS $$
DECLARE
  current_title RECORD;
  rotation_interval INTEGER;
BEGIN
  SELECT t.activated_at, test.rotation_interval_minutes 
  INTO current_title
  FROM titles t
  JOIN tests test ON test.id = t.test_id
  WHERE t.test_id = test_uuid AND t.is_active = true
  LIMIT 1;
  
  IF current_title.activated_at IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN current_title.activated_at + (current_title.rotation_interval_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- 12. Clean up any orphaned data
DELETE FROM analytics_polls 
WHERE title_id NOT IN (SELECT id FROM titles);

DELETE FROM titles 
WHERE test_id NOT IN (SELECT id FROM tests);

-- 13. Update any tests with invalid states
UPDATE tests 
SET status = 'completed', end_date = CURRENT_TIMESTAMP
WHERE status = 'active' 
  AND NOT EXISTS (
    SELECT 1 FROM titles 
    WHERE test_id = tests.id 
      AND activated_at IS NULL
  );

-- 14. Grant appropriate permissions (adjust based on your user setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- Migration complete!
-- Run verification query:
SELECT 
  'Tables' as check_type,
  COUNT(*) as count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tests', 'titles', 'analytics_polls', 'users')
UNION ALL
SELECT 
  'Indexes' as check_type,
  COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
UNION ALL
SELECT 
  'Active Tests' as check_type,
  COUNT(*) as count
FROM tests 
WHERE status = 'active';