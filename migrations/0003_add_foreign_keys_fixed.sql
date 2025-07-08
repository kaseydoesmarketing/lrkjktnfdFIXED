-- Add proper foreign key constraints with CASCADE
-- This ensures data integrity and automatic cleanup

-- Add indexes for better query performance first
CREATE INDEX IF NOT EXISTS idx_test_metrics_timestamp ON test_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_titles_test_order ON titles(test_id, "order");
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_tests_user_status ON tests(user_id, status);

-- Add the constraints if they don't exist
DO $$
BEGIN
    -- Check and add foreign key for tests.user_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tests_user_id_fkey'
    ) THEN
        ALTER TABLE tests
        ADD CONSTRAINT tests_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE;
    END IF;

    -- Check and add foreign key for titles.test_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'titles_test_id_fkey'
    ) THEN
        ALTER TABLE titles
        ADD CONSTRAINT titles_test_id_fkey
        FOREIGN KEY (test_id)
        REFERENCES tests(id)
        ON DELETE CASCADE;
    END IF;

    -- Check and add foreign key for test_metrics.title_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'test_metrics_title_id_fkey'
    ) THEN
        ALTER TABLE test_metrics
        ADD CONSTRAINT test_metrics_title_id_fkey
        FOREIGN KEY (title_id)
        REFERENCES titles(id)
        ON DELETE CASCADE;
    END IF;

    -- Check and add foreign key for test_rotation_logs.test_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'test_rotation_logs_test_id_fkey'
    ) THEN
        ALTER TABLE test_rotation_logs
        ADD CONSTRAINT test_rotation_logs_test_id_fkey
        FOREIGN KEY (test_id)
        REFERENCES tests(id)
        ON DELETE CASCADE;
    END IF;

    -- Check and add foreign key for analytics_polls.title_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'analytics_polls_title_id_fkey'
    ) THEN
        ALTER TABLE analytics_polls
        ADD CONSTRAINT analytics_polls_title_id_fkey
        FOREIGN KEY (title_id)
        REFERENCES titles(id)
        ON DELETE CASCADE;
    END IF;

    -- Check and add foreign key for title_change_logs.test_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'title_change_logs_test_id_fkey'
    ) THEN
        ALTER TABLE title_change_logs
        ADD CONSTRAINT title_change_logs_test_id_fkey
        FOREIGN KEY (test_id)
        REFERENCES tests(id)
        ON DELETE CASCADE;
    END IF;
END $$;