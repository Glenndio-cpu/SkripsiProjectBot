-- Ensure all core tables exist for the Flask backend.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS users (
  email VARCHAR(255) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NULL,
  ktp VARCHAR(32) NULL,
  gender ENUM('male','female','other') NULL,
  age TINYINT UNSIGNED NULL,
  medical_history TEXT NULL,
  registration_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  registration_note VARCHAR(255) NULL,
  registration_reviewed_by VARCHAR(255) NULL,
  registration_reviewed_at DATETIME NULL,
  password VARCHAR(255) NOT NULL,
  profile_image TEXT NULL,
  ktp_image LONGTEXT NULL,
  ktp_with_owner_image LONGTEXT NULL,
  role ENUM('patient','admin','head','nurse') NOT NULL DEFAULT 'patient',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_ktp (ktp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS activities (
  email VARCHAR(255) NOT NULL,
  consultation_count INT NOT NULL DEFAULT 0,
  last_updated DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (email),
  CONSTRAINT fk_activities_user
    FOREIGN KEY (email) REFERENCES users(email)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS articles_read (
  email VARCHAR(255) NOT NULL,
  article_id VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (email, article_id),
  CONSTRAINT fk_articles_read_user
    FOREIGN KEY (email) REFERENCES users(email)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS active_days (
  email VARCHAR(255) NOT NULL,
  active_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (email, active_date),
  CONSTRAINT fk_active_days_user
    FOREIGN KEY (email) REFERENCES users(email)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role ENUM('user','assistant') NOT NULL,
  content TEXT NOT NULL,
  mode ENUM('public','consultation') NOT NULL DEFAULT 'consultation',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_chat_history_email_mode_created (email, mode, created_at),
  CONSTRAINT fk_chat_history_user
    FOREIGN KEY (email) REFERENCES users(email)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type ENUM('info','warning','success','urgent') NOT NULL DEFAULT 'info',
  active TINYINT(1) NOT NULL DEFAULT 1,
  priority INT NOT NULL DEFAULT 0,
  created_by VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  approval_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  approved_by VARCHAR(255) NULL,
  approved_at DATETIME NULL,
  KEY idx_announcements_active_expire (active, expires_at),
  KEY idx_announcements_approval_status (approval_status),
  KEY idx_announcements_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_broadcast_logs_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
