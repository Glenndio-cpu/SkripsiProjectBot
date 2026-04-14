-- Purge all application data while keeping schema intact.
-- This removes all users, which also removes role assignments tied to user records.

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE chat_history;
TRUNCATE TABLE articles_read;
TRUNCATE TABLE active_days;
TRUNCATE TABLE activities;
TRUNCATE TABLE announcements;
TRUNCATE TABLE broadcast_logs;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;