-- Add patient registration approval workflow columns.
-- Idempotent and safe for existing deployments.

SET @has_registration_status := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'registration_status'
);

SET @sql_add_registration_status := IF(
  @has_registration_status = 0,
  "ALTER TABLE users ADD COLUMN registration_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved' AFTER medical_history",
  'SELECT 1'
);

PREPARE stmt_add_registration_status FROM @sql_add_registration_status;
EXECUTE stmt_add_registration_status;
DEALLOCATE PREPARE stmt_add_registration_status;

SET @has_registration_note := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'registration_note'
);

SET @sql_add_registration_note := IF(
  @has_registration_note = 0,
  'ALTER TABLE users ADD COLUMN registration_note VARCHAR(255) NULL AFTER registration_status',
  'SELECT 1'
);

PREPARE stmt_add_registration_note FROM @sql_add_registration_note;
EXECUTE stmt_add_registration_note;
DEALLOCATE PREPARE stmt_add_registration_note;

SET @has_registration_reviewed_by := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'registration_reviewed_by'
);

SET @sql_add_registration_reviewed_by := IF(
  @has_registration_reviewed_by = 0,
  'ALTER TABLE users ADD COLUMN registration_reviewed_by VARCHAR(255) NULL AFTER registration_note',
  'SELECT 1'
);

PREPARE stmt_add_registration_reviewed_by FROM @sql_add_registration_reviewed_by;
EXECUTE stmt_add_registration_reviewed_by;
DEALLOCATE PREPARE stmt_add_registration_reviewed_by;

SET @has_registration_reviewed_at := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'registration_reviewed_at'
);

SET @sql_add_registration_reviewed_at := IF(
  @has_registration_reviewed_at = 0,
  'ALTER TABLE users ADD COLUMN registration_reviewed_at DATETIME NULL AFTER registration_reviewed_by',
  'SELECT 1'
);

PREPARE stmt_add_registration_reviewed_at FROM @sql_add_registration_reviewed_at;
EXECUTE stmt_add_registration_reviewed_at;
DEALLOCATE PREPARE stmt_add_registration_reviewed_at;

-- Existing users are considered approved by default.
UPDATE users
SET registration_status = 'approved'
WHERE registration_status IS NULL OR registration_status = '';
