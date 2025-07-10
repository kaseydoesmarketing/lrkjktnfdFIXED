-- Add foreign key constraints with cascading deletes
ALTER TABLE tests
  ADD CONSTRAINT fk_tests_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE titles
  ADD CONSTRAINT fk_titles_test
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE;

ALTER TABLE test_rotation_logs
  ADD CONSTRAINT fk_rotation_logs_test
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_rotation_logs_title
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE;

ALTER TABLE analytics_polls
  ADD CONSTRAINT fk_analytics_polls_title
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE;