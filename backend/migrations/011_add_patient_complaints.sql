-- Track patient complaints per visit date.

CREATE TABLE IF NOT EXISTS patient_complaints (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  complaint TEXT NOT NULL,
  complaint_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_patient_complaints_email_date (email, complaint_date),
  KEY idx_patient_complaints_email_date (email, complaint_date),
  KEY idx_patient_complaints_updated_at (updated_at),
  CONSTRAINT fk_patient_complaints_user
    FOREIGN KEY (email) REFERENCES users(email)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Backfill complaint history from existing user medical_history (best effort).
INSERT INTO patient_complaints (email, complaint, complaint_date, created_at, updated_at)
SELECT email, medical_history, DATE(created_at), created_at, created_at
FROM users
WHERE medical_history IS NOT NULL AND medical_history != ''
ON DUPLICATE KEY UPDATE
  complaint = VALUES(complaint),
  updated_at = VALUES(updated_at);
