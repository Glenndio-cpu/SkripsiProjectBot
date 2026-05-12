-- Add second KTP image storage to users.
-- Safe to run multiple times.

SET @has_ktp_with_owner_image := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'ktp_with_owner_image'
);

SET @sql_add_ktp_with_owner_image := IF(
  @has_ktp_with_owner_image = 0,
  'ALTER TABLE users ADD COLUMN ktp_with_owner_image LONGTEXT NULL AFTER ktp_image',
  'SELECT 1'
);

PREPARE stmt_add_ktp_with_owner_image FROM @sql_add_ktp_with_owner_image;
EXECUTE stmt_add_ktp_with_owner_image;
DEALLOCATE PREPARE stmt_add_ktp_with_owner_image;