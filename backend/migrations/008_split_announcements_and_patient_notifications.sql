-- Split announcements into health info vs schedules and add patient notification inbox.
-- Idempotent and safe for existing deployments.

SET @has_category := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND COLUMN_NAME = 'category'
);

SET @sql_add_category := IF(
  @has_category = 0,
  "ALTER TABLE announcements ADD COLUMN category ENUM('health_info','schedule') NOT NULL DEFAULT 'health_info' AFTER type",
  'SELECT 1'
);

PREPARE stmt_add_category FROM @sql_add_category;
EXECUTE stmt_add_category;
DEALLOCATE PREPARE stmt_add_category;

SET @has_event_date := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND COLUMN_NAME = 'event_date'
);

SET @sql_add_event_date := IF(
  @has_event_date = 0,
  'ALTER TABLE announcements ADD COLUMN event_date DATE NULL AFTER expires_at',
  'SELECT 1'
);

PREPARE stmt_add_event_date FROM @sql_add_event_date;
EXECUTE stmt_add_event_date;
DEALLOCATE PREPARE stmt_add_event_date;

SET @has_event_time := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND COLUMN_NAME = 'event_time'
);

SET @sql_add_event_time := IF(
  @has_event_time = 0,
  'ALTER TABLE announcements ADD COLUMN event_time TIME NULL AFTER event_date',
  'SELECT 1'
);

PREPARE stmt_add_event_time FROM @sql_add_event_time;
EXECUTE stmt_add_event_time;
DEALLOCATE PREPARE stmt_add_event_time;

SET @has_location := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND COLUMN_NAME = 'location'
);

SET @sql_add_location := IF(
  @has_location = 0,
  'ALTER TABLE announcements ADD COLUMN location VARCHAR(255) NULL AFTER event_time',
  'SELECT 1'
);

PREPARE stmt_add_location FROM @sql_add_location;
EXECUTE stmt_add_location;
DEALLOCATE PREPARE stmt_add_location;

SET @has_idx_category_active := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND INDEX_NAME = 'idx_announcements_category_active'
);

SET @sql_add_idx_category_active := IF(
  @has_idx_category_active = 0,
  'ALTER TABLE announcements ADD INDEX idx_announcements_category_active (category, active)',
  'SELECT 1'
);

PREPARE stmt_add_idx_category_active FROM @sql_add_idx_category_active;
EXECUTE stmt_add_idx_category_active;
DEALLOCATE PREPARE stmt_add_idx_category_active;

SET @has_idx_schedule_event := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND INDEX_NAME = 'idx_announcements_schedule_event'
);

SET @sql_add_idx_schedule_event := IF(
  @has_idx_schedule_event = 0,
  'ALTER TABLE announcements ADD INDEX idx_announcements_schedule_event (event_date, event_time)',
  'SELECT 1'
);

PREPARE stmt_add_idx_schedule_event FROM @sql_add_idx_schedule_event;
EXECUTE stmt_add_idx_schedule_event;
DEALLOCATE PREPARE stmt_add_idx_schedule_event;

-- Backfill likely schedule rows from existing content keywords.
UPDATE announcements
SET category = 'schedule'
WHERE category = 'health_info'
  AND LOWER(CONCAT(IFNULL(title, ''), ' ', IFNULL(content, ''))) REGEXP 'jadwal|berobat|posyandu|imunisasi|vaksin|poli|pelayanan';

CREATE TABLE IF NOT EXISTS patient_notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  announcement_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  UNIQUE KEY uq_patient_notification_announcement (email, announcement_id),
  KEY idx_patient_notifications_email_created (email, created_at),
  KEY idx_patient_notifications_unread (email, is_read),
  CONSTRAINT fk_patient_notifications_user
    FOREIGN KEY (email) REFERENCES users(email)
    ON DELETE CASCADE,
  CONSTRAINT fk_patient_notifications_announcement
    FOREIGN KEY (announcement_id) REFERENCES announcements(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial notification inbox for currently active and approved health info.
INSERT INTO patient_notifications (email, announcement_id, title, content, is_read, created_at)
SELECT u.email, a.id, a.title, a.content, 0, NOW()
FROM users u
INNER JOIN announcements a ON 1 = 1
WHERE u.role = 'patient'
  AND a.category = 'health_info'
  AND a.active = 1
  AND a.approval_status = 'approved'
  AND (a.expires_at IS NULL OR a.expires_at > NOW())
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  content = VALUES(content);
