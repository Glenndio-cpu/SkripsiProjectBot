-- Add approval workflow columns for announcement validation by monitoring roles.
-- Idempotent and safe for existing deployments.

SET @has_approval_status := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND COLUMN_NAME = 'approval_status'
);

SET @sql_add_approval_status := IF(
  @has_approval_status = 0,
  "ALTER TABLE announcements ADD COLUMN approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' AFTER active",
  'SELECT 1'
);

PREPARE stmt_add_approval_status FROM @sql_add_approval_status;
EXECUTE stmt_add_approval_status;
DEALLOCATE PREPARE stmt_add_approval_status;

SET @has_approved_by := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND COLUMN_NAME = 'approved_by'
);

SET @sql_add_approved_by := IF(
  @has_approved_by = 0,
  'ALTER TABLE announcements ADD COLUMN approved_by VARCHAR(255) NULL AFTER approval_status',
  'SELECT 1'
);

PREPARE stmt_add_approved_by FROM @sql_add_approved_by;
EXECUTE stmt_add_approved_by;
DEALLOCATE PREPARE stmt_add_approved_by;

SET @has_approved_at := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'announcements'
    AND COLUMN_NAME = 'approved_at'
);

SET @sql_add_approved_at := IF(
  @has_approved_at = 0,
  'ALTER TABLE announcements ADD COLUMN approved_at DATETIME NULL AFTER approved_by',
  'SELECT 1'
);

PREPARE stmt_add_approved_at FROM @sql_add_approved_at;
EXECUTE stmt_add_approved_at;
DEALLOCATE PREPARE stmt_add_approved_at;

-- Existing active announcements are considered valid initially.
UPDATE announcements
SET approval_status = 'approved',
    approved_by = COALESCE(approved_by, created_by),
    approved_at = COALESCE(approved_at, created_at)
WHERE approval_status = 'pending' AND active = 1;
