"""Users routes – /api/users/*"""

import json
import re
import time
from urllib.parse import quote_plus
from datetime import datetime
from flask import Blueprint, request, jsonify, Response, stream_with_context
import bcrypt as _bcrypt

from app.store import (
    get_users, get_user_activity, update_user_activity,
    get_activities, update_user, find_user_by_ktp,
    find_user_by_email, find_user_by_phone, add_user, delete_user,
    get_patient_complaints, get_patient_complaints_signature, get_activity_signature,
    get_users_signature, upsert_patient_complaint,
    get_pending_patient_registrations, set_patient_registration_status,
    get_active_patient_count,
)
from app.session_auth import get_authenticated_user
from app.role_guard import require_auth, require_roles, require_email_match_or_roles
from app.roles import ROLE_PATIENT, ROLE_ADMIN, ROLE_NURSE, ALL_ROLES, MONITOR_ROLES, EDITOR_ROLES

users_bp = Blueprint('users', __name__)
PHONE_RE = re.compile(r'^\d{10,15}$')
ALLOWED_GENDERS = {'male', 'female'}


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


def _parse_date(raw_value):
    if not raw_value:
        return None
    try:
        return datetime.strptime(str(raw_value), '%Y-%m-%d').date()
    except Exception:
        return None


def _format_timestamp(value) -> str:
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    if value is None:
        return ''
    return str(value)


def _complaints_signature():
    complaints = get_patient_complaints_signature()
    activities = get_activity_signature()
    users = get_users_signature()

    complaint_total = int(complaints.get('total') or 0)
    complaint_updated = _format_timestamp(complaints.get('updatedAt'))
    activity_total = int(activities.get('total') or 0)
    activity_updated = _format_timestamp(activities.get('updatedAt'))

    user_total = int(users.get('total') or 0)
    user_updated = _format_timestamp(users.get('updatedAt'))

    signature = (
        f'{complaint_total}:{complaint_updated}:'
        f'{activity_total}:{activity_updated}:'
        f'{user_total}:{user_updated}'
    )
    updated_str = max(complaint_updated, activity_updated, user_updated)
    return signature, updated_str, complaint_total


def _normalize_wa_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    if not digits:
        return ''
    if digits.startswith('0'):
        digits = f'62{digits[1:]}'
    return digits


def _build_whatsapp_link(phone: str, message: str) -> str:
    normalized = _normalize_wa_phone(phone)
    if not normalized:
        return ''
    encoded_message = quote_plus(message or '')
    return f'https://wa.me/{normalized}?text={encoded_message}'


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
        gender = (body.get('gender') or '').strip().lower()
        medical_history = (body.get('medicalHistory') or '').strip()
        raw_age = body.get('age')

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
        else:
            ktp = ''
            gender = ''
            medical_history = ''
            age = None
            if phone and not PHONE_RE.match(phone):
                return jsonify(error='Nomor telepon tidak valid (10-15 digit angka)'), 400

        if phone and find_user_by_phone(phone):
            return jsonify(error='Nomor telepon sudah terdaftar'), 409

        user = {
            'email': email,
            'name': name,
            'phone': phone,
            'ktp': ktp or None,
            'gender': gender or None,
            'age': age,
            'medicalHistory': medical_history or None,
            'ktpImage': (body.get('ktpImage') or '').strip(),
            'ktpWithOwnerImage': (body.get('ktpWithOwnerImage') or '').strip(),
            'password': _hash_password(password),
            'profileImage': '',
            'role': role,
            'createdAt': datetime.utcnow().isoformat(),
        }

        add_user(user)
        if role == ROLE_PATIENT and medical_history:
            upsert_patient_complaint(user['email'], medical_history)
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


# ── GET /api/users/active?since_minutes=... ─────────────────────────────────

@users_bp.route('/active', methods=['GET'])
@require_roles(*MONITOR_ROLES)
def get_active_patients():
    try:
        since = request.args.get('since_minutes', 1440, type=int)
        count = get_active_patient_count(since_minutes=since)
        return jsonify(activePatients=int(count))
    except Exception as e:
        print(f'Get Active Patients Error: {e}')
        return jsonify(error='Gagal mengambil jumlah pasien aktif'), 500


# ── GET /api/users/pending (staff monitor) ──────────────────────────────

@users_bp.route('/pending', methods=['GET'])
@require_roles(*MONITOR_ROLES)
def list_pending_registrations():
    try:
        limit = request.args.get('limit', 200, type=int)
        pending = get_pending_patient_registrations(limit=limit)

        result = []
        for item in pending:
            safe = _serialize(item)
            wa_message = (
                f"Halo {safe.get('name') or 'Pasien'}, "
                'pendaftaran akun Anda di Puskesmas Wori masih menunggu validasi KTP. '
                'Kami akan menghubungi Anda setelah proses verifikasi selesai.'
            )
            safe['whatsappLink'] = _build_whatsapp_link(str(safe.get('phone') or ''), wa_message)
            result.append(safe)

        return jsonify(pending=result, count=len(result))
    except Exception as e:
        print(f'List Pending Registrations Error: {e}')
        return jsonify(error='Gagal mengambil daftar pendaftaran pending'), 500


# ── PATCH /api/users/pending/<email>/approval (nurse) ───────────────────

@users_bp.route('/pending/<email>/approval', methods=['PATCH'])
@require_roles(ROLE_NURSE)
def review_pending_registration(email):
    try:
        body = request.get_json(silent=True) or {}
        action = (body.get('action') or '').strip().lower()
        note = (body.get('note') or '').strip()

        if action not in {'approve', 'reject', 'cancel'}:
            return jsonify(error='Aksi approval harus approve atau reject'), 400

        user = find_user_by_email(email)
        if not user:
            return jsonify(error='User tidak ditemukan'), 404
        if (user.get('role') or ROLE_PATIENT) != ROLE_PATIENT:
            return jsonify(error='Approval registrasi hanya untuk akun pasien'), 400

        registration_status = (user.get('registrationStatus') or 'approved').strip().lower()
        if registration_status == 'approved' and action == 'approve':
            return jsonify(error='Akun pasien ini sudah disetujui'), 400

        target_status = 'approved' if action == 'approve' else 'rejected'

        actor = get_authenticated_user() or {}
        affected = set_patient_registration_status(
            email,
            target_status,
            actor.get('email', ''),
            note,
        )
        if affected <= 0:
            return jsonify(error='Gagal memperbarui status pendaftaran'), 500

        updated = find_user_by_email(email)
        safe = {k: v for k, v in (updated or {}).items() if k != 'password'}

        if target_status == 'approved':
            notify_message = (
                f"Halo {safe.get('name') or 'Pasien'}, pendaftaran akun Anda di Puskesmas Wori sudah disetujui. "
                'Silakan login untuk mulai menggunakan layanan.'
            )
        else:
            notify_message = (
                f"Halo {safe.get('name') or 'Pasien'}, pendaftaran akun Anda di Puskesmas Wori belum dapat disetujui. "
                'Silakan cek kembali data KTP atau hubungi petugas.'
            )
            if note:
                notify_message += f' Catatan: {note}'

        return jsonify(
            message='Status pendaftaran pasien berhasil diperbarui',
            user=_serialize(safe),
            whatsappLink=_build_whatsapp_link(str(safe.get('phone') or ''), notify_message),
        )
    except ValueError as ve:
        return jsonify(error=str(ve)), 400
    except Exception as e:
        print(f'Review Pending Registration Error: {e}')
        return jsonify(error='Gagal memproses approval pendaftaran pasien'), 500


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
        complaint_text = None
        complaint_date = None
        if 'medicalHistory' in body:
            complaint_text = (body.get('medicalHistory') or '').strip()
            if target_role != ROLE_PATIENT:
                return jsonify(error='Keluhan hanya berlaku untuk pasien'), 400
            if not complaint_text:
                return jsonify(error='Keluhan pasien wajib diisi'), 400

            raw_complaint_date = body.get('complaintDate')
            if raw_complaint_date:
                complaint_date = _parse_date(raw_complaint_date)
                if not complaint_date:
                    return jsonify(error='Format tanggal keluhan harus YYYY-MM-DD'), 400
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
        if 'ktpImage' in body:
            updates['ktpImage'] = body['ktpImage']

        if complaint_text is not None:
            upsert_patient_complaint(email, complaint_text, complaint_date)

        updated = update_user(email, updates) if updates else find_user_by_email(email)
        if not updated:
            return jsonify(error='User tidak ditemukan'), 404

        safe = {k: v for k, v in updated.items() if k != 'password'}
        return jsonify(user=_serialize(safe))
    except Exception as e:
        print(f'Update Profile Error: {e}')
        return jsonify(error='Gagal update profil'), 500


# ── GET /api/users/complaints/stream (staff, SSE) ───────────────────────

@users_bp.route('/complaints/stream', methods=['GET'])
@require_roles(*MONITOR_ROLES)
def stream_patient_complaints():
    try:
        interval_seconds = int(request.args.get('interval', 4))
    except Exception:
        interval_seconds = 4
    interval_seconds = max(2, min(interval_seconds, 15))

    def generate_events():
        last_signature = None
        yield 'retry: 4000\n\n'

        while True:
            try:
                signature, updated_str, total = _complaints_signature()

                if signature != last_signature:
                    payload = json.dumps(
                        {
                            'count': total,
                            'signature': signature,
                            'updatedAt': updated_str,
                        },
                        ensure_ascii=False,
                    )
                    yield f'event: patient-complaints-updated\ndata: {payload}\n\n'
                    last_signature = signature
                else:
                    yield f': keepalive {datetime.utcnow().isoformat()}Z\n\n'

                time.sleep(interval_seconds)
            except GeneratorExit:
                break
            except Exception as exc:
                print(f'Patient complaint stream warning: {exc}')
                yield 'event: stream-error\ndata: {"error":"stream_failed"}\n\n'
                time.sleep(interval_seconds)

    headers = {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    }

    return Response(
        stream_with_context(generate_events()),
        headers=headers,
        mimetype='text/event-stream',
    )


# ── POST /api/users/complaints (staff) ──────────────────────────────────

@users_bp.route('/complaints', methods=['POST'])
@require_roles(*EDITOR_ROLES)
def update_patient_complaint():
    try:
        body = request.get_json(silent=True) or {}
        email = (body.get('email') or '').strip()
        complaint = (body.get('complaint') or '').strip()
        raw_date = body.get('complaintDate')

        if not email or not complaint:
            return jsonify(error='Email dan keluhan wajib diisi'), 400

        user = find_user_by_email(email)
        if not user:
            return jsonify(error='User tidak ditemukan'), 404

        complaint_date = _parse_date(raw_date)
        if raw_date and not complaint_date:
            return jsonify(error='Format tanggal keluhan harus YYYY-MM-DD'), 400
        if not complaint_date:
            complaint_date = datetime.utcnow().date()
        upsert_patient_complaint(email, complaint, complaint_date)

        updated = find_user_by_email(email)
        safe = {k: v for k, v in (updated or {}).items() if k != 'password'}
        return jsonify(
            message='Keluhan pasien berhasil diperbarui',
            user=_serialize(safe),
            complaintDate=complaint_date.strftime('%Y-%m-%d'),
        )
    except Exception as e:
        print(f'Update Complaint Error: {e}')
        return jsonify(error='Gagal memperbarui keluhan pasien'), 500


# ── GET /api/users/complaints/<email> (staff) ───────────────────────────

@users_bp.route('/complaints/<email>', methods=['GET'])
@require_roles(*MONITOR_ROLES)
def list_patient_complaints(email):
    try:
        user = find_user_by_email(email)
        if not user:
            return jsonify(error='User tidak ditemukan'), 404
        limit = request.args.get('limit', 10, type=int)
        complaints = get_patient_complaints(email, limit=limit)
        latest = complaints[0] if complaints else None
        return jsonify(
            complaints=_serialize(complaints),
            latest=_serialize(latest) if latest else None,
        )
    except Exception as e:
        print(f'Get Patient Complaints Error: {e}')
        return jsonify(error='Gagal mengambil keluhan pasien'), 500


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
