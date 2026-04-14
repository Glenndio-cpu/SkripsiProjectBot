-- Expand user role enum to support actor-based access model.

ALTER TABLE users
MODIFY COLUMN role ENUM('patient','admin','head','nurse') NOT NULL DEFAULT 'patient';
