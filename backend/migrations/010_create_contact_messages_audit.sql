-- Audit log for public contact form submissions and outbound email status.

CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  request_id CHAR(36) NOT NULL,
  from_name VARCHAR(100) NOT NULL,
  from_email VARCHAR(254) NOT NULL,
  subject VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  client_ip VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  email_attempted TINYINT(1) NOT NULL DEFAULT 0,
  email_status ENUM('pending', 'sent', 'failed', 'skipped') NOT NULL DEFAULT 'pending',
  email_error TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contact_messages_request_id (request_id),
  KEY idx_contact_messages_created_at (created_at),
  KEY idx_contact_messages_email_status (email_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;