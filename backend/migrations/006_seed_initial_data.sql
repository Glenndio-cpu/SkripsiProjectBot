-- Seed initial data for local/dev or first deployment.
-- Idempotent: uses upsert patterns and guarded inserts.

INSERT INTO users (email, name, phone, ktp, password, profile_image, role, created_at)
VALUES
  (
    'admin@puskesbot.local',
    'Admin Puskesmas',
    '628111111111',
    NULL,
    '$2b$10$UYSF9yeqcPcbA9kCLeOyzOxyPMyq0ClW4wnFA5MXdAfvW7dbrAbI.',
    '',
    'admin',
    NOW()
  ),
  (
    'head@puskesbot.local',
    'Kepala Puskesmas',
    '628122222222',
    NULL,
    '$2b$10$AuZefrdG5kNi.6W4BhPaGuijXeXzqM6y24pBUhm/3EsyJOeYbufMe',
    '',
    'head',
    NOW()
  ),
  (
    'nurse@puskesbot.local',
    'Perawat Puskesmas',
    '628133333333',
    NULL,
    '$2b$10$5EXNoxO2wRIEFBpyCEESC.gzNQ/7CJuuPz6QLqGJm.p1IQSx4f.Uu',
    '',
    'nurse',
    NOW()
  ),
  (
    'pasien@puskesbot.local',
    'Pasien Contoh',
    '628144444444',
    '7101010101010001',
    '$2b$10$ZNh7UVehTo/ILJ7F3pNpBu8pz.OyYrNFk7fpIqtAeT6ws.LNkendW',
    '',
    'patient',
    NOW()
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  phone = VALUES(phone),
  ktp = VALUES(ktp),
  profile_image = VALUES(profile_image);

INSERT INTO announcements (
  title,
  content,
  type,
  active,
  priority,
  created_by,
  created_at,
  expires_at,
  approval_status,
  approved_by,
  approved_at
)
SELECT
  'Layanan Puskesmas Wori',
  'Selamat datang di PuskesBot. Untuk konsultasi penyakit menular, silakan login terlebih dahulu dan gunakan menu Konsultasi.',
  'info',
  1,
  10,
  'admin@puskesbot.local',
  NOW(),
  NULL,
  'approved',
  'head@puskesbot.local',
  NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM announcements WHERE title = 'Layanan Puskesmas Wori'
);

INSERT INTO activities (email, consultation_count, last_updated)
VALUES ('pasien@puskesbot.local', 1, NOW())
ON DUPLICATE KEY UPDATE
  consultation_count = VALUES(consultation_count),
  last_updated = NOW();

INSERT IGNORE INTO articles_read (email, article_id)
VALUES
  ('pasien@puskesbot.local', 'influenza'),
  ('pasien@puskesbot.local', 'demam-berdarah');

INSERT IGNORE INTO active_days (email, active_date)
VALUES
  ('pasien@puskesbot.local', CURDATE()),
  ('pasien@puskesbot.local', DATE_SUB(CURDATE(), INTERVAL 1 DAY));
