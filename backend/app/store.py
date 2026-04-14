"""Data-access layer – mirrors the old Node store.js exactly."""

import re
import difflib
from datetime import datetime, date
from app.db import query, execute


# ==================== USERS ====================

def get_users():
    return query(
        'SELECT email, name, phone, ktp, gender, age, medical_history AS medicalHistory, '
        'password, profile_image AS profileImage, '
        'role, created_at AS createdAt FROM users ORDER BY created_at DESC'
    )


def find_user_by_email(email):
    normalized = (email or '').strip().lower()
    rows = query(
        'SELECT email, name, phone, ktp, gender, age, medical_history AS medicalHistory, '
        'password, profile_image AS profileImage, '
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
        'password, profile_image AS profileImage, '
        'role, created_at AS createdAt FROM users WHERE phone = %s',
        (clean,),
    )
    return rows[0] if rows else None


def find_user_by_ktp(ktp):
    rows = query(
        'SELECT email, name, phone, ktp, gender, age, medical_history AS medicalHistory, '
        'password, profile_image AS profileImage, '
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

    execute(
        'INSERT INTO users '
        '(email, name, phone, ktp, gender, age, medical_history, password, profile_image, role, created_at) '
        'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
        (
            user['email'], user['name'], user.get('phone', ''),
            user.get('ktp') or None, gender, age, medical_history,
            user['password'], user.get('profileImage', ''),
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
    if 'role' in updates:
        fields.append('role = %s'); values.append(updates['role'])
    if not fields:
        return None
    values.append(email)
    execute(f"UPDATE users SET {', '.join(fields)} WHERE email = %s", tuple(values))
    return find_user_by_email(email)


def delete_user(email):
    return execute('DELETE FROM users WHERE email = %s', (email,)) > 0


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
    if 'consultationCount' in updates:
        c = updates['consultationCount']
        execute(
            'INSERT INTO activities (email, consultation_count, last_updated) VALUES (%s, %s, NOW()) '
            'ON DUPLICATE KEY UPDATE consultation_count = %s, last_updated = NOW()',
            (email, c, c),
        )

    for day in (updates.get('activeDays') or []):
        execute(
            'INSERT IGNORE INTO active_days (email, active_date) VALUES (%s, %s)',
            (email, day),
        )

    return get_user_activity(email)


def get_activities():
    users = query('SELECT DISTINCT email FROM activities')
    return [get_user_activity(u['email']) for u in users]
