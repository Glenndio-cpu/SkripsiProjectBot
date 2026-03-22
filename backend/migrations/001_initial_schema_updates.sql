-- Combined migration: users.ktp column + broadcast_logs table.
-- Idempotent so it is safe for both fresh and existing databases.

SET @has_ktp := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'ktp'
);

SET @sql_add_ktp := IF(
  @has_ktp = 0,
  'ALTER TABLE users ADD COLUMN ktp VARCHAR(32) NULL AFTER phone',
  'SELECT 1'
);

PREPARE stmt_add_ktp FROM @sql_add_ktp;
EXECUTE stmt_add_ktp;
DEALLOCATE PREPARE stmt_add_ktp;

CREATE TABLE IF NOT EXISTS broadcast_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_email VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  recipients TEXT NOT NULL,
  recipient_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,
  fonnte_response TEXT,
  status ENUM('sent','failed','partial') DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
