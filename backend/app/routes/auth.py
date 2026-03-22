"""Auth routes – /api/auth/*"""

import os, re
from flask import Blueprint, request, jsonify
import bcrypt as _bcrypt

from app.store import (
    find_user_by_email,
    find_user_by_phone,
    find_user_by_ktp,
    add_user,
    update_user,
    delete_user,
)
from app.session_auth import (
    get_authenticated_user,
    is_admin_session,
    login_session,
    logout_session,
)
from app.role_guard import require_auth, require_email_match_or_roles

auth_bp = Blueprint('auth', __name__)

KTP_RE = re.compile(r'^\d{16}$')


def _hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt(10)).decode()


def _check_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


def _user_without_password(u: dict) -> dict:
    return {k: v for k, v in u.items() if k != 'password'}


def _serialize_user(u: dict) -> dict:
    """Convert datetime objects to ISO strings for JSON serialization."""
    out = {}
    for k, v in u.items():
        if k == 'password':
            continue
        if hasattr(v, 'isoformat'):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


# ── POST /api/auth/register ──────────────────────────────────────────────

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        body = request.get_json(silent=True) or {}
        name = body.get('name', '').strip()
        email = body.get('email', '').strip()
        phone = body.get('phone', '').strip()
        password = body.get('password', '')
        role = body.get('role', 'patient')
        admin_code = body.get('adminAccessCode', '')
        ktp = (body.get('ktp') or '').strip()

        if not name or not email or not password:
            return jsonify(error='Nama, email, dan password harus diisi'), 400

        if find_user_by_email(email):
            return jsonify(error='Email sudah terdaftar'), 409

        if phone:
            clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
            if find_user_by_phone(clean_phone):
                return jsonify(error='Nomor telepon sudah terdaftar'), 409
        else:
            clean_phone = ''

        normalized_ktp = ''
        if role == 'patient':
            normalized_ktp = re.sub(r'\D', '', ktp)
            if not KTP_RE.match(normalized_ktp):
                return jsonify(error='KTP pasien harus 16 digit angka'), 400
            if find_user_by_ktp(normalized_ktp):
                return jsonify(error='Nomor KTP sudah terdaftar'), 409

        # Admin access code
        if role == 'nurse':
            valid_code = os.getenv('ADMIN_ACCESS_CODE', 'your_admin_code_here')
            if not admin_code or admin_code != valid_code:
                return jsonify(error='Kode akses admin tidak valid'), 403

        from datetime import datetime
        user = {
            'email': email,
            'name': name,
            'phone': clean_phone,
            'ktp': normalized_ktp or None,
            'password': _hash_password(password),
            'profileImage': '',
            'role': role,
            'createdAt': datetime.utcnow().isoformat(),
        }

        add_user(user)
        login_session(user)
        return jsonify(message='Registrasi berhasil', user=_serialize_user(user)), 201

    except Exception as e:
        print(f'Register Error: {e}')
        return jsonify(error='Terjadi kesalahan saat registrasi'), 500


# ── POST /api/auth/login ─────────────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        body = request.get_json(silent=True) or {}
        identifier = (body.get('identifier') or '').strip()
        password = body.get('password', '')
        selected_role = body.get('role', 'patient')

        if not identifier or not password:
            return jsonify(error='Semua field harus diisi'), 400

        is_phone = bool(re.match(r'^[0-9+\s\-\(\)]+$', identifier))

        if is_phone:
            clean = re.sub(r'[\s\-\(\)]', '', identifier)
            user = find_user_by_phone(clean)
        else:
            user = find_user_by_email(identifier)

        if not user:
            msg = ('Nomor telepon tidak terdaftar! Silakan daftar terlebih dahulu.'
                   if is_phone else
                   'Email tidak terdaftar! Silakan daftar terlebih dahulu.')
            return jsonify(error=msg), 404

        if not _check_password(password, user['password']):
            return jsonify(error='Anda memasukkan password yang salah!'), 401

        user_role = user.get('role') or 'patient'

        if selected_role == 'nurse' and user_role != 'nurse':
            return jsonify(error='Akun ini bukan akun Admin. Pilih "Login sebagai pasien" atau hubungi admin.'), 403
        if selected_role == 'patient' and user_role == 'nurse':
            return jsonify(error='Akun ini terdaftar sebagai Admin. Pilih "Login sebagai Admin".'), 403

        login_session(user)
        return jsonify(message='Login berhasil', user=_serialize_user(user))

    except Exception as e:
        print(f'Login Error: {e}')
        return jsonify(error='Terjadi kesalahan saat login'), 500


# ── POST /api/auth/change-password ───────────────────────────────────────

@auth_bp.route('/change-password', methods=['POST'])
@require_auth
@require_email_match_or_roles(source='json', field='email')
def change_password():
    try:
        body = request.get_json(silent=True) or {}
        email = body.get('email', '')
        current = body.get('currentPassword', '')
        new_pw = body.get('newPassword', '')

        if not email or not current or not new_pw:
            return jsonify(error='Semua field harus diisi'), 400

        if len(new_pw) < 6:
            return jsonify(error='Password minimal 6 karakter'), 400

        user = find_user_by_email(email)
        if not user:
            return jsonify(error='User tidak ditemukan'), 404

        if not _check_password(current, user['password']):
            return jsonify(error='Anda memasukkan password yang salah!'), 401

        update_user(email, {'password': _hash_password(new_pw)})
        return jsonify(message='Password berhasil diubah')

    except Exception as e:
        print(f'Change Password Error: {e}')
        return jsonify(error='Terjadi kesalahan saat mengubah password'), 500


# ── POST /api/auth/delete-account ────────────────────────────────────────

@auth_bp.route('/delete-account', methods=['POST'])
@require_auth
@require_email_match_or_roles('nurse', source='json', field='email')
def delete_account():
    try:
        body = request.get_json(silent=True) or {}
        email = body.get('email', '')
        password = body.get('password', '')

        if not email or not password:
            return jsonify(error='Email dan password harus diisi'), 400

        user = find_user_by_email(email)
        if not user:
            return jsonify(error='User tidak ditemukan'), 404

        # Admin delete via authenticated admin session
        if password == '__admin_delete__':
            if not is_admin_session():
                return jsonify(error='Hanya admin yang dapat menghapus akun pasien.'), 403
            delete_user(email)
            return jsonify(message='Akun pasien berhasil dihapus oleh admin')

        # Self-delete
        if not _check_password(password, user['password']):
            return jsonify(error='Password salah! Penghapusan akun dibatalkan.'), 401

        delete_user(email)
        logout_session()
        return jsonify(message='Akun berhasil dihapus')

    except Exception as e:
        print(f'Delete Account Error: {e}')
        return jsonify(error='Terjadi kesalahan saat menghapus akun'), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    logout_session()
    return jsonify(message='Logout berhasil')


@auth_bp.route('/me', methods=['GET'])
def me():
    user = get_authenticated_user()
    if not user:
        return jsonify(authenticated=False), 401
    return jsonify(authenticated=True, user=_serialize_user(user))
