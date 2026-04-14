"""Users routes – /api/users/*"""

import re
from datetime import datetime
from flask import Blueprint, request, jsonify
import bcrypt as _bcrypt

from app.store import (
    get_users, get_user_activity, update_user_activity,
    get_activities, update_user, find_user_by_ktp,
    find_user_by_email, find_user_by_phone, add_user, delete_user,
)
from app.session_auth import get_authenticated_user
from app.role_guard import require_auth, require_roles, require_email_match_or_roles
from app.roles import ROLE_PATIENT, ROLE_ADMIN, ALL_ROLES, MONITOR_ROLES, EDITOR_ROLES

users_bp = Blueprint('users', __name__)
PHONE_RE = re.compile(r'^\d{10,15}$')


def _hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt(10)).decode()


def _serialize(obj):
    """Convert datetime objects for JSON."""
    if isinstance(obj, dict):
        return {k: _serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize(v) for v in obj]
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    return obj


# ── GET /api/users ───────────────────────────────────────────────────────

@users_bp.route('', methods=['GET'])
@require_roles(*MONITOR_ROLES)
def list_users():
    try:
        users = get_users()
        out = []
        for u in users:
            safe = {k: v for k, v in u.items() if k != 'password'}
            out.append(_serialize(safe))
        return jsonify(users=out)
    except Exception as e:
        print(f'Get Users Error: {e}')
        return jsonify(error='Gagal mengambil data user'), 500


# ── POST /api/users (admin create user/staff) ───────────────────────────
# ADMIN ONLY: Create new staff accounts (admin, head, nurse).
# Patients self-register via POST /api/auth/register

@users_bp.route('', methods=['POST'])
@require_roles(ROLE_ADMIN)
def create_user():
    try:
        body = request.get_json(silent=True) or {}
        name = (body.get('name') or '').strip()
        email = (body.get('email') or '').strip()
        password = body.get('password') or ''
        phone = re.sub(r'[\s\-\(\)\+]', '', (body.get('phone') or '').strip())
        role = (body.get('role') or ROLE_PATIENT).strip()
        ktp = re.sub(r'\D', '', (body.get('ktp') or '').strip())

        if not name or not email or not password:
            return jsonify(error='Nama, email, dan password harus diisi'), 400

        if role not in ALL_ROLES:
            return jsonify(error='Role tidak valid'), 400

        if find_user_by_email(email):
            return jsonify(error='Email sudah terdaftar'), 409

        if role == ROLE_PATIENT:
            if not phone:
                return jsonify(error='Nomor WhatsApp pasien wajib diisi untuk menerima broadcast'), 400
            if not PHONE_RE.match(phone):
                return jsonify(error='Nomor WhatsApp tidak valid (10-15 digit angka)'), 400
            if not re.match(r'^\d{16}$', ktp):
                return jsonify(error='KTP pasien harus 16 digit angka'), 400
            existing = find_user_by_ktp(ktp)
            if existing:
                return jsonify(error='Nomor KTP sudah terdaftar'), 409
        else:
            ktp = ''
            if phone and not PHONE_RE.match(phone):
                return jsonify(error='Nomor telepon tidak valid (10-15 digit angka)'), 400

        if phone and find_user_by_phone(phone):
            return jsonify(error='Nomor telepon sudah terdaftar'), 409

        user = {
            'email': email,
            'name': name,
            'phone': phone,
            'ktp': ktp or None,
            'password': _hash_password(password),
            'profileImage': '',
            'role': role,
            'createdAt': datetime.utcnow().isoformat(),
        }

        add_user(user)
        safe = {k: v for k, v in user.items() if k != 'password'}
        return jsonify(message='User berhasil dibuat', user=_serialize(safe)), 201
    except Exception as e:
        print(f'Create User Error: {e}')
        return jsonify(error='Gagal membuat user'), 500


# ── PATCH /api/users/<email>/role (admin) ───────────────────────────────

@users_bp.route('/<email>/role', methods=['PATCH'])
@require_roles(ROLE_ADMIN)
def update_user_role(email):
    try:
        body = request.get_json(silent=True) or {}
        role = (body.get('role') or '').strip()

        if role not in ALL_ROLES:
            return jsonify(error='Role tidak valid'), 400

        user = find_user_by_email(email)
        if not user:
            return jsonify(error='User tidak ditemukan'), 404

        actor = get_authenticated_user() or {}
        if actor.get('email') == email and role != ROLE_ADMIN:
            return jsonify(error='Admin tidak dapat menurunkan role dirinya sendiri'), 400

        updates = {'role': role}
        if role != ROLE_PATIENT:
            updates['ktp'] = None

        updated = update_user(email, updates)
        safe = {k: v for k, v in (updated or {}).items() if k != 'password'}
        return jsonify(message='Role berhasil diperbarui', user=_serialize(safe))
    except Exception as e:
        print(f'Update Role Error: {e}')
        return jsonify(error='Gagal memperbarui role'), 500


# ── DELETE /api/users/<email> (admin) ───────────────────────────────────

@users_bp.route('/<email>', methods=['DELETE'])
@require_roles(ROLE_ADMIN)
def remove_user(email):
    try:
        actor = get_authenticated_user() or {}
        if actor.get('email') == email:
            return jsonify(error='Admin tidak dapat menghapus akun dirinya sendiri'), 400

        user = find_user_by_email(email)
        if not user:
            return jsonify(error='User tidak ditemukan'), 404

        deleted = delete_user(email)
        if not deleted:
            return jsonify(error='Gagal menghapus user'), 500

        return jsonify(message='User berhasil dihapus')
    except Exception as e:
        print(f'Delete User Error: {e}')
        return jsonify(error='Gagal menghapus user'), 500


# ── GET /api/users/contacts ──────────────────────────────────────────────

@users_bp.route('/contacts', methods=['GET'])
@require_roles(*MONITOR_ROLES)
def list_contacts():
    try:
        users = get_users()
        contacts = [
            {'name': u['name'], 'phone': u['phone'], 'email': u['email']}
            for u in users if u.get('phone')
        ]
        return jsonify(contacts=contacts)
    except Exception as e:
        print(f'Get Contacts Error: {e}')
        return jsonify(error='Gagal mengambil data kontak'), 500


# ── GET /api/users/contacts/csv ──────────────────────────────────────────

@users_bp.route('/contacts/csv', methods=['GET'])
@require_roles(*MONITOR_ROLES)
def export_csv():
    try:
        users = [u for u in get_users() if u.get('phone')]
        lines = ['Nama,Nomor WhatsApp,Email']
        for u in users:
            lines.append(f'"{u["name"]}","{u["phone"]}","{u["email"]}"')
        csv_text = '\n'.join(lines) + '\n'
        ts = datetime.utcnow().strftime('%Y-%m-%d')
        from flask import Response
        return Response(
            csv_text,
            mimetype='text/csv; charset=utf-8',
            headers={'Content-Disposition': f'attachment; filename=puskesmas-wori-contacts-{ts}.csv'},
        )
    except Exception as e:
        print(f'Export CSV Error: {e}')
        return jsonify(error='Gagal export CSV'), 500


# ── PUT /api/users/profile ───────────────────────────────────────────────

@users_bp.route('/profile', methods=['PUT'])
@require_auth
@require_email_match_or_roles(*EDITOR_ROLES, source='json', field='email')
def update_profile():
    try:
        body = request.get_json(silent=True) or {}
        email = body.get('email', '')
        if not email:
            return jsonify(error='Email is required'), 400

        target_user = find_user_by_email(email)
        if not target_user:
            return jsonify(error='User tidak ditemukan'), 404

        target_role = target_user.get('role') or ROLE_PATIENT

        updates = {}
        if 'name' in body:
            updates['name'] = body['name']
        if 'phone' in body:
            normalized_phone = re.sub(r'[\s\-\(\)\+]', '', (body.get('phone') or '').strip())

            if normalized_phone and not PHONE_RE.match(normalized_phone):
                return jsonify(error='Nomor telepon tidak valid (10-15 digit angka)'), 400

            if target_role == ROLE_PATIENT and not normalized_phone:
                return jsonify(error='Nomor WhatsApp pasien wajib diisi untuk menerima broadcast'), 400

            if normalized_phone:
                existing = find_user_by_phone(normalized_phone)
                if existing and existing.get('email') != email:
                    return jsonify(error='Nomor telepon sudah digunakan akun lain'), 409

            updates['phone'] = normalized_phone
        if 'ktp' in body:
            ktp = re.sub(r'\D', '', body.get('ktp', '') or '')
            if ktp and not re.match(r'^\d{16}$', ktp):
                return jsonify(error='KTP harus 16 digit angka'), 400

            existing = find_user_by_ktp(ktp) if ktp else None
            if existing and existing.get('email') != email:
                return jsonify(error='Nomor KTP sudah digunakan akun lain'), 409
            updates['ktp'] = ktp
        if 'profileImage' in body:
            updates['profileImage'] = body['profileImage']

        updated = update_user(email, updates)
        if not updated:
            return jsonify(error='User tidak ditemukan'), 404

        safe = {k: v for k, v in updated.items() if k != 'password'}
        return jsonify(user=_serialize(safe))
    except Exception as e:
        print(f'Update Profile Error: {e}')
        return jsonify(error='Gagal update profil'), 500


# ── GET /api/users/activity/<email> ──────────────────────────────────────

@users_bp.route('/activity/<email>', methods=['GET'])
@require_email_match_or_roles(*MONITOR_ROLES, source='path', field='email')
def get_activity(email):
    try:
        act = get_user_activity(email)
        return jsonify(
            consultationCount=act.get('consultationCount', 0),
            activeDaysCount=len(act.get('activeDays', [])),
        )
    except Exception as e:
        print(f'Get Activity Error: {e}')
        return jsonify(error='Gagal mengambil data aktivitas'), 500


# ── POST /api/users/activity/track ───────────────────────────────────────

@users_bp.route('/activity/track', methods=['POST'])
@require_email_match_or_roles(ROLE_ADMIN, source='json', field='email')
def track_activity():
    try:
        body = request.get_json(silent=True) or {}
        email = body.get('email', '')
        atype = body.get('type', '')

        if not email or not atype:
            return jsonify(error='Email and type are required'), 400

        if atype not in {'consultation', 'daily'}:
            return jsonify(error='Type aktivitas tidak valid'), 400

        act = get_user_activity(email)

        if atype == 'consultation':
            act['consultationCount'] = (act.get('consultationCount') or 0) + 1
        elif atype == 'daily':
            today = datetime.utcnow().strftime('%Y-%m-%d')
            if today not in act.get('activeDays', []):
                act.setdefault('activeDays', []).append(today)

        update_user_activity(email, act)
        return jsonify(success=True)
    except Exception as e:
        print(f'Track Activity Error: {e}')
        return jsonify(error='Gagal tracking aktivitas'), 500


# ── GET /api/users/activities/all ────────────────────────────────────────

@users_bp.route('/activities/all', methods=['GET'])
@require_roles(*MONITOR_ROLES)
def all_activities():
    try:
        activities = get_activities()
        return jsonify(activities=_serialize(activities))
    except Exception as e:
        print(f'Get All Activities Error: {e}')
        return jsonify(error='Gagal mengambil data aktivitas'), 500
