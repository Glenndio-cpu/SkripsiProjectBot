"""Auth routes – /api/auth/*"""

import re
from flask import Blueprint, request, jsonify
import bcrypt as _bcrypt

from app.store import (
    find_user_by_email,
    find_user_by_phone,
    find_user_by_ktp,
    suggest_similar_email,
    add_user,
    upsert_patient_complaint,
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
from app.roles import ROLE_ADMIN, ROLE_PATIENT, STAFF_ROLES

auth_bp = Blueprint('auth', __name__)

KTP_RE = re.compile(r'^\d{16}$')
PHONE_RE = re.compile(r'^\d{10,15}$')
ALLOWED_GENDERS = {'male', 'female'}


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
# Public registration is PATIENT ONLY.
# Staff accounts (admin, head, nurse) must be created by admin via POST /api/users

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        body = request.get_json(silent=True) or {}
        name = body.get('name', '').strip()
        email = body.get('email', '').strip()
        phone = body.get('phone', '').strip()
        password = body.get('password', '')
        ktp = (body.get('ktp') or '').strip()
        ktp_image = (body.get('ktpImage') or '').strip()
        ktp_with_owner_image = (body.get('ktpWithOwnerImage') or '').strip()
        gender = (body.get('gender') or '').strip().lower()
        medical_history = (body.get('medicalHistory') or '').strip()
        raw_age = body.get('age')
        requested_role = (body.get('role') or ROLE_PATIENT).strip()

        # ENFORCE: Public registration is PATIENT only
        if requested_role != ROLE_PATIENT:
            return jsonify(error='Pendaftaran publik hanya untuk pasien. Hubungi admin atau kepala puskesmas untuk mendaftarkan akun staf.'), 403

        if not name or not email or not password:
            return jsonify(error='Nama, email, dan password harus diisi'), 400

        if find_user_by_email(email):
            return jsonify(error='Email sudah terdaftar'), 409

        clean_phone = re.sub(r'[\s\-\(\)\+]', '', phone)
        if not clean_phone:
            return jsonify(error='Nomor WhatsApp pasien wajib diisi untuk menerima broadcast'), 400
        if not PHONE_RE.match(clean_phone):
            return jsonify(error='Nomor WhatsApp tidak valid (10-15 digit angka)'), 400
        if find_user_by_phone(clean_phone):
            return jsonify(error='Nomor telepon sudah terdaftar'), 409

        normalized_ktp = ''
        normalized_ktp = re.sub(r'\D', '', ktp)
        if not KTP_RE.match(normalized_ktp):
            return jsonify(error='KTP pasien harus 16 digit angka'), 400
        if find_user_by_ktp(normalized_ktp):
            return jsonify(error='Nomor KTP sudah terdaftar'), 409

        if gender not in ALLOWED_GENDERS:
            return jsonify(error='Gender pasien wajib dipilih'), 400

        try:
            age = int(raw_age)
        except (TypeError, ValueError):
            return jsonify(error='Umur pasien harus berupa angka'), 400

        if age < 1 or age > 120:
            return jsonify(error='Umur pasien harus di antara 1 sampai 120 tahun'), 400

        if not medical_history:
            return jsonify(error='Keluhan atau riwayat penyakit wajib diisi'), 400

        from datetime import datetime
        user = {
            'email': email,
            'name': name,
            'phone': clean_phone,
            'ktp': normalized_ktp or None,
            'gender': gender,
            'age': age,
            'medicalHistory': medical_history,
            'registrationStatus': 'pending',
            'registrationNote': 'Menunggu validasi KTP dari tenaga medis.',
            'password': _hash_password(password),
            'profileImage': '',
            'ktpImage': ktp_image or '',
            'ktpWithOwnerImage': ktp_with_owner_image or '',
            'role': ROLE_PATIENT,
            'createdAt': datetime.utcnow().isoformat(),
        }

        add_user(user)
        try:
            upsert_patient_complaint(user['email'], medical_history)
        except Exception:
            delete_user(user['email'])
            raise
        return jsonify(
            message='Registrasi berhasil. Akun Anda menunggu validasi tenaga medis.',
            user=_serialize_user(user),
            requiresApproval=True,
        ), 201

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
        selected_role = body.get('role', ROLE_PATIENT)

        if not identifier or not password:
            return jsonify(error='Semua field harus diisi'), 400

        is_phone = bool(re.match(r'^[0-9+\s\-\(\)]+$', identifier))

        if is_phone:
            clean = re.sub(r'[\s\-\(\)]', '', identifier)
            user = find_user_by_phone(clean)
        else:
            user = find_user_by_email(identifier)

        if not user:
            suggested_email = None if is_phone else suggest_similar_email(identifier)
            msg = ('Nomor telepon tidak terdaftar! Silakan daftar terlebih dahulu.'
                   if is_phone else
                   'Email tidak terdaftar! Silakan daftar terlebih dahulu.')
            if suggested_email:
                msg = f'Email tidak terdaftar. Apakah maksud Anda "{suggested_email}"?'
            return jsonify(error=msg), 404

        if not _check_password(password, user['password']):
            return jsonify(error='Anda memasukkan password yang salah!'), 401

        user_role = user.get('role') or ROLE_PATIENT
        registration_status = (user.get('registrationStatus') or 'approved').strip().lower()
        registration_note = (user.get('registrationNote') or '').strip()

        if selected_role == ROLE_ADMIN and user_role not in STAFF_ROLES:
            return jsonify(error='Akun ini bukan akun staf. Pilih "Login sebagai Pasien".'), 403
        if selected_role == ROLE_PATIENT and user_role in STAFF_ROLES:
            return jsonify(error='Akun ini terdaftar sebagai staf. Pilih "Login sebagai Admin/Staf".'), 403

        if selected_role == ROLE_PATIENT and user_role == ROLE_PATIENT and registration_status != 'approved':
            if registration_status == 'pending':
                msg = 'Akun Anda masih menunggu approval tenaga medis. Silakan tunggu konfirmasi.'
            else:
                msg = 'Pendaftaran Anda belum disetujui tenaga medis. Silakan hubungi Puskesmas Wori.'
            if registration_note:
                msg = f'{msg} Catatan: {registration_note}'
            return jsonify(
                error=msg,
                registrationStatus=registration_status,
                registrationNote=registration_note,
                requiresApproval=True,
            ), 403

        login_session(user)
        return jsonify(message='Login berhasil', user=_serialize_user(user))

    except Exception as e:
        print(f'Login Error: {e}')
        return jsonify(error='Terjadi kesalahan saat login'), 500


# ── GET /api/auth/registration-status ───────────────────────────────────

@auth_bp.route('/registration-status', methods=['GET'])
def registration_status():
    try:
        identifier = (request.args.get('identifier') or '').strip()
        if not identifier:
            return jsonify(error='Identifier wajib diisi'), 400

        is_phone = bool(re.match(r'^[0-9+\s\-\(\)]+$', identifier))
        if is_phone:
            clean = re.sub(r'[\s\-\(\)]', '', identifier)
            user = find_user_by_phone(clean)
        else:
            user = find_user_by_email(identifier)

        if not user:
            return jsonify(error='Data pendaftaran tidak ditemukan'), 404

        if (user.get('role') or ROLE_PATIENT) != ROLE_PATIENT:
            return jsonify(error='Status pendaftaran hanya tersedia untuk akun pasien'), 400

        status = (user.get('registrationStatus') or 'approved').strip().lower()
        note = (user.get('registrationNote') or '').strip()

        return jsonify(
            registrationStatus=status,
            registrationNote=note,
            reviewedBy=user.get('registrationReviewedBy') or None,
            reviewedAt=user.get('registrationReviewedAt') or None,
            name=user.get('name') or '',
            email=user.get('email') or '',
            phone=user.get('phone') or '',
            approved=(status == 'approved'),
        )
    except Exception as e:
        print(f'Registration Status Error: {e}')
        return jsonify(error='Gagal mengecek status pendaftaran'), 500


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
@require_email_match_or_roles(*STAFF_ROLES, source='json', field='email')
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
