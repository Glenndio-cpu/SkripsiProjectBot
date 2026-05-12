-- Add uploaded KTP image storage to users.
-- Safe to run multiple times.

SET @has_ktp_image := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'ktp_image'
);

SET @sql_add_ktp_image := IF(
  @has_ktp_image = 0,
  'ALTER TABLE users ADD COLUMN ktp_image LONGTEXT NULL AFTER ktp',
  'SELECT 1'
);

PREPARE stmt_add_ktp_image FROM @sql_add_ktp_image;
EXECUTE stmt_add_ktp_image;
DEALLOCATE PREPARE stmt_add_ktp_image;