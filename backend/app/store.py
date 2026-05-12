"""Data-access layer – mirrors the old Node store.js exactly."""

import re
import difflib
from datetime import datetime, date, timedelta
from app.db import query, execute


# ==================== USERS ====================

def get_users(exclude_pending: bool = True):
    base = (
        'SELECT email, name, phone, ktp, gender, age, medical_history AS medicalHistory, '
        'registration_status AS registrationStatus, registration_note AS registrationNote, '
        'registration_reviewed_by AS registrationReviewedBy, registration_reviewed_at AS registrationReviewedAt, '
        'password, profile_image AS profileImage, ktp_image AS ktpImage, ktp_with_owner_image AS ktpWithOwnerImage, '
        'role, created_at AS createdAt FROM users'
    )
    if exclude_pending:
        base += " WHERE NOT (role = 'patient' AND registration_status = 'pending')"
    base += ' ORDER BY created_at DESC'
    return query(base)


def find_user_by_email(email):
    normalized = (email or '').strip().lower()
    rows = query(
        'SELECT email, name, phone, ktp, gender, age, medical_history AS medicalHistory, '
        'registration_status AS registrationStatus, registration_note AS registrationNote, '
        'registration_reviewed_by AS registrationReviewedBy, registration_reviewed_at AS registrationReviewedAt, '
            'password, profile_image AS profileImage, ktp_image AS ktpImage, ktp_with_owner_image AS ktpWithOwnerImage, '
        'role, created_at AS createdAt FROM users WHERE LOWER(TRIM(email)) = %s',
        (normalized,),
    )
    return rows[0] if rows else None


def suggest_similar_email(email):
    normalized = (email or '').strip().lower()
    if '@' not in normalized:
        return None

    local, domain = normalized.split('@', 1)
    if not local or not domain:
        return None

    # Keep the candidate set small by matching same domain first.
    candidates = query(
        'SELECT email FROM users WHERE LOWER(TRIM(email)) LIKE %s LIMIT 50',
        (f'%@{domain}',),
    )

    if not candidates:
        return None

    normalized_to_original = {
        (c.get('email') or '').strip().lower(): c.get('email')
        for c in candidates
        if c.get('email')
    }
    close = difflib.get_close_matches(normalized, list(normalized_to_original.keys()), n=1, cutoff=0.82)
    if not close:
        return None
    return normalized_to_original.get(close[0])


def find_user_by_phone(phone):
    clean = re.sub(r'[\s\-\(\)]', '', phone)
    rows = query(
        'SELECT email, name, phone, ktp, gender, age, medical_history AS medicalHistory, '
        'registration_status AS registrationStatus, registration_note AS registrationNote, '
        'registration_reviewed_by AS registrationReviewedBy, registration_reviewed_at AS registrationReviewedAt, '
            'password, profile_image AS profileImage, ktp_image AS ktpImage, ktp_with_owner_image AS ktpWithOwnerImage, '
        'role, created_at AS createdAt FROM users WHERE phone = %s',
        (clean,),
    )
    return rows[0] if rows else None


def find_user_by_ktp(ktp):
    rows = query(
        'SELECT email, name, phone, ktp, gender, age, medical_history AS medicalHistory, '
        'registration_status AS registrationStatus, registration_note AS registrationNote, '
        'registration_reviewed_by AS registrationReviewedBy, registration_reviewed_at AS registrationReviewedAt, '
            'password, profile_image AS profileImage, ktp_image AS ktpImage, ktp_with_owner_image AS ktpWithOwnerImage, '
        'role, created_at AS createdAt FROM users WHERE ktp = %s',
        (ktp,),
    )
    return rows[0] if rows else None


def add_user(user: dict):
    created = user.get('createdAt') or datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    if isinstance(created, str) and 'T' in created:
        created = created[:19].replace('T', ' ')

    gender = user.get('gender') or None
    age = user.get('age')
    medical_history = user.get('medicalHistory')
    registration_status = (user.get('registrationStatus') or 'approved').strip().lower()
    registration_note = user.get('registrationNote') or None
    reviewed_by = user.get('registrationReviewedBy') or None
    reviewed_at = user.get('registrationReviewedAt') or None

    execute(
        'INSERT INTO users '
        '(email, name, phone, ktp, gender, age, medical_history, registration_status, registration_note, '
        'registration_reviewed_by, registration_reviewed_at, password, profile_image, ktp_image, ktp_with_owner_image, role, created_at) '
        'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
        (
            user['email'], user['name'], user.get('phone', ''),
            user.get('ktp') or None, gender, age, medical_history,
            registration_status, registration_note, reviewed_by, reviewed_at,
            user['password'], user.get('profileImage', ''), user.get('ktpImage', ''), user.get('ktpWithOwnerImage', ''),
            user.get('role', 'patient'), created,
        ),
    )
    return user


def update_user(email, updates: dict):
    fields = []
    values = []
    if 'name' in updates:
        fields.append('name = %s'); values.append(updates['name'])
    if 'phone' in updates:
        fields.append('phone = %s'); values.append(updates['phone'])
    if 'ktp' in updates:
        fields.append('ktp = %s'); values.append(updates['ktp'] or None)
    if 'gender' in updates:
        fields.append('gender = %s'); values.append(updates['gender'] or None)
    if 'age' in updates:
        fields.append('age = %s'); values.append(updates['age'])
    if 'medicalHistory' in updates:
        fields.append('medical_history = %s'); values.append(updates['medicalHistory'] or None)
    if 'password' in updates:
        fields.append('password = %s'); values.append(updates['password'])
    if 'profileImage' in updates:
        fields.append('profile_image = %s'); values.append(updates['profileImage'])
    if 'ktpImage' in updates:
        fields.append('ktp_image = %s'); values.append(updates['ktpImage'])
    if 'ktpWithOwnerImage' in updates:
        fields.append('ktp_with_owner_image = %s'); values.append(updates['ktpWithOwnerImage'])
    if 'role' in updates:
        fields.append('role = %s'); values.append(updates['role'])
    if 'registrationStatus' in updates:
        fields.append('registration_status = %s'); values.append(updates['registrationStatus'])
    if 'registrationNote' in updates:
        fields.append('registration_note = %s'); values.append(updates['registrationNote'] or None)
    if 'registrationReviewedBy' in updates:
        fields.append('registration_reviewed_by = %s'); values.append(updates['registrationReviewedBy'] or None)
    if 'registrationReviewedAt' in updates:
        fields.append('registration_reviewed_at = %s'); values.append(updates['registrationReviewedAt'] or None)
    if not fields:
        return None
    values.append(email)
    execute(f"UPDATE users SET {', '.join(fields)} WHERE email = %s", tuple(values))
    return find_user_by_email(email)


def get_pending_patient_registrations(limit: int = 200):
    safe_limit = max(1, min(int(limit or 200), 500))
    return query(
        'SELECT email, name, phone, ktp, gender, age, medical_history AS medicalHistory, '
        'registration_status AS registrationStatus, registration_note AS registrationNote, '
        'registration_reviewed_by AS registrationReviewedBy, registration_reviewed_at AS registrationReviewedAt, '
            'profile_image AS profileImage, ktp_image AS ktpImage, ktp_with_owner_image AS ktpWithOwnerImage, role, created_at AS createdAt '
        'FROM users '
        "WHERE role = 'patient' AND registration_status = 'pending' "
        'ORDER BY created_at DESC '
        'LIMIT %s',
        (safe_limit,),
    )


def set_patient_registration_status(email: str, status: str, actor_email: str, note: str = ''):
    clean_status = (status or '').strip().lower()
    if clean_status not in {'approved', 'rejected'}:
        raise ValueError('Status registrasi tidak valid')

    return execute(
        'UPDATE users '
        'SET registration_status = %s, registration_note = %s, '
        'registration_reviewed_by = %s, registration_reviewed_at = NOW() '
        "WHERE email = %s AND role = 'patient'",
        (clean_status, (note or '').strip() or None, actor_email, email),
    )


def delete_user(email):
    return execute('DELETE FROM users WHERE email = %s', (email,)) > 0


# ==================== PATIENT COMPLAINTS ====================

def upsert_patient_complaint(email: str, complaint: str, complaint_date=None):
    if not complaint_date:
        complaint_date = datetime.utcnow().strftime('%Y-%m-%d')
    if isinstance(complaint_date, date):
        complaint_date = complaint_date.strftime('%Y-%m-%d')

    execute(
        'INSERT INTO patient_complaints (email, complaint, complaint_date) '
        'VALUES (%s, %s, %s) '
        'ON DUPLICATE KEY UPDATE complaint = VALUES(complaint), updated_at = NOW()',
        (email, complaint, complaint_date),
    )
    execute('UPDATE users SET medical_history = %s WHERE email = %s', (complaint, email))
    return True


def get_patient_complaints(email: str, limit: int = 10):
    safe_limit = max(1, min(int(limit or 10), 50))
    return query(
        'SELECT id, complaint, complaint_date AS complaintDate, '
        'created_at AS createdAt, updated_at AS updatedAt '
        'FROM patient_complaints '
        'WHERE email = %s '
        'ORDER BY complaint_date DESC, updated_at DESC, id DESC '
        'LIMIT %s',
        (email, safe_limit),
    )


def get_patient_complaints_signature():
    rows = query(
        'SELECT COUNT(*) AS total, MAX(updated_at) AS updatedAt '
        'FROM patient_complaints'
    )
    if not rows:
        return {'total': 0, 'updatedAt': None}
    return rows[0]


def get_active_patient_count(since_minutes: int = 1440):
    """Return number of distinct patients with activity after cutoff (since_minutes ago).

    Uses activities.last_updated to determine recent activity. Default window: 1440 minutes (24 hours).
    """
    try:
        m = int(since_minutes or 1440)
    except Exception:
        m = 1440
    cutoff = datetime.utcnow() - timedelta(minutes=m)
    rows = query(
        'SELECT COUNT(DISTINCT u.email) AS total '
        'FROM users u JOIN activities a ON a.email = u.email '
        "WHERE u.role = 'patient' AND u.registration_status = 'approved' AND a.last_updated >= %s",
        (cutoff,)
    )
    if not rows:
        return 0
    return int(rows[0].get('total') or 0)


def get_users_signature():
    rows = query(
        'SELECT COUNT(*) AS total, MAX(updated_at) AS updatedAt '
        'FROM users'
    )
    if not rows:
        return {'total': 0, 'updatedAt': None}
    return rows[0]


def get_activity_signature():
    rows = query(
        'SELECT COUNT(*) AS total, MAX(last_updated) AS updatedAt '
        'FROM activities'
    )
    if not rows:
        return {'total': 0, 'updatedAt': None}
    return rows[0]


# ==================== ACTIVITIES ====================

def get_user_activity(email):
    rows = query(
        'SELECT consultation_count AS consultationCount, '
        'last_updated AS lastUpdated FROM activities WHERE email = %s',
        (email,),
    )
    if not rows:
        execute('INSERT INTO activities (email, consultation_count) VALUES (%s, 0)', (email,))
        consultation_count = 0
        last_updated = None
    else:
        consultation_count = rows[0]['consultationCount'] or 0
        last_updated = rows[0].get('lastUpdated')

    days = query(
        'SELECT DATE_FORMAT(active_date, "%%Y-%%m-%%d") AS d FROM active_days WHERE email = %s',
        (email,),
    )
    active_days = [d['d'] for d in days]

    return {
        'email': email,
        'consultationCount': consultation_count,
        'activeDays': active_days,
        'lastUpdated': last_updated.isoformat() if hasattr(last_updated, 'isoformat') else last_updated,
    }


def update_user_activity(email, updates: dict):
    activity_touched = False
    if 'consultationCount' in updates:
        c = updates['consultationCount']
        execute(
            'INSERT INTO activities (email, consultation_count, last_updated) VALUES (%s, %s, NOW()) '
            'ON DUPLICATE KEY UPDATE consultation_count = %s, last_updated = NOW()',
            (email, c, c),
        )
        activity_touched = True

    for day in (updates.get('activeDays') or []):
        execute(
            'INSERT IGNORE INTO active_days (email, active_date) VALUES (%s, %s)',
            (email, day),
        )
        activity_touched = True

    if activity_touched and 'consultationCount' not in updates:
        execute('UPDATE activities SET last_updated = NOW() WHERE email = %s', (email,))

    return get_user_activity(email)


def get_activities():
    users = query('SELECT DISTINCT email FROM activities')
    return [get_user_activity(u['email']) for u in users]
