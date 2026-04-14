-- Add patient demographic and history fields.
-- Idempotent and safe for existing deployments.

SET @has_gender := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'gender'
);

SET @sql_add_gender := IF(
  @has_gender = 0,
  "ALTER TABLE users ADD COLUMN gender ENUM('male','female','other') NULL AFTER ktp",
  'SELECT 1'
);

PREPARE stmt_add_gender FROM @sql_add_gender;
EXECUTE stmt_add_gender;
DEALLOCATE PREPARE stmt_add_gender;

SET @has_age := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'age'
);

SET @sql_add_age := IF(
  @has_age = 0,
  'ALTER TABLE users ADD COLUMN age TINYINT UNSIGNED NULL AFTER gender',
  'SELECT 1'
);

PREPARE stmt_add_age FROM @sql_add_age;
EXECUTE stmt_add_age;
DEALLOCATE PREPARE stmt_add_age;

SET @has_medical_history := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'medical_history'
);

SET @sql_add_medical_history := IF(
  @has_medical_history = 0,
  'ALTER TABLE users ADD COLUMN medical_history TEXT NULL AFTER age',
  'SELECT 1'
);

PREPARE stmt_add_medical_history FROM @sql_add_medical_history;
EXECUTE stmt_add_medical_history;
DEALLOCATE PREPARE stmt_add_medical_history;
