"""Announcement and schedule management routes -- /api/announcements/*"""

from datetime import datetime

from flask import Blueprint, jsonify, request

from app.db import execute, query
from app.role_guard import require_roles
from app.roles import ROLE_HEAD, ROLE_NURSE, ROLE_PATIENT
from app.session_auth import get_authenticated_user
from datetime import datetime, timedelta

announcements_bp = Blueprint('announcements', __name__)

VALID_TYPES = {'info', 'warning', 'success', 'urgent'}
VALID_CATEGORIES = {'health_info', 'schedule'}
SCHEDULE_KEYWORDS = (
    'jadwal',
    'berobat',
    'posyandu',
    'imunisasi',
    'vaksin',
    'poli',
    'pelayanan',
)


def _to_iso(value):
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    return value
    if isinstance(value, timedelta):
        return str(value)
    return value

def _normalize_category(raw_value):
    if not raw_value:
        return None
    value = str(raw_value).strip().lower()
    if value in VALID_CATEGORIES:
        return value
    if value in {'info', 'health', 'information', 'informasi'}:
        return 'health_info'
    if value in {'schedule', 'jadwal'}:
        return 'schedule'
    return None


def _is_schedule_text(title, content):
    text = f"{title or ''} {content or ''}".lower()
    return any(keyword in text for keyword in SCHEDULE_KEYWORDS)


def _serialize_announcement_row(row):
    row['createdAt'] = _to_iso(row.get('createdAt'))
    row['expiresAt'] = _to_iso(row.get('expiresAt'))
    row['approvedAt'] = _to_iso(row.get('approvedAt'))
    row['eventDate'] = _to_iso(row.get('eventDate'))
    row['eventTime'] = _to_iso(row.get('eventTime'))
    if 'active' in row:
        row['active'] = bool(row.get('active'))

    category = row.get('category')
    if not category:
        category = 'schedule' if _is_schedule_text(row.get('title'), row.get('content')) else 'health_info'
    row['category'] = category

    if 'approvalStatus' not in row:
        row['approvalStatus'] = 'approved'
        row['approvedBy'] = row.get('createdBy')
        row['approvedAt'] = row.get('createdAt')

    return row


def _parse_datetime_local(raw_value):
    if not raw_value:
        return None
    try:
        return datetime.fromisoformat(str(raw_value).replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        return None


def _parse_date(raw_value):
    if not raw_value:
        return None
    try:
        return datetime.strptime(str(raw_value), '%Y-%m-%d').strftime('%Y-%m-%d')
    except Exception:
        return None


def _parse_time(raw_value):
    if not raw_value:
        return None
    raw = str(raw_value)
    for fmt in ('%H:%M', '%H:%M:%S'):
        try:
            return datetime.strptime(raw, fmt).strftime('%H:%M:%S')
        except Exception:
            continue
    return None


def _notify_patients_for_announcement(ann_id):
    try:
        execute(
            'INSERT INTO patient_notifications '
            '(email, announcement_id, title, content, is_read, created_at) '
            'SELECT u.email, a.id, a.title, a.content, 0, NOW() '
            'FROM users u '
            'INNER JOIN announcements a ON a.id = %s '
            "WHERE u.role = 'patient' "
            "AND a.category = 'health_info' "
            'AND a.active = 1 '
            'AND (a.expires_at IS NULL OR a.expires_at > NOW()) '
            'ON DUPLICATE KEY UPDATE '
            'title = VALUES(title), '
            'content = VALUES(content), '
            'is_read = 0, '
            'read_at = NULL, '
            'created_at = NOW()',
            (ann_id,),
        )
    except Exception as exc:
        print(f'Patient notification skipped for announcement {ann_id}: {exc}')


def _get_existing_category(ann_id):
    try:
        rows = query('SELECT id, category, title, content FROM announcements WHERE id = %s', (ann_id,))
    except Exception:
        rows = query('SELECT id, title, content FROM announcements WHERE id = %s', (ann_id,))

    if not rows:
        return None

    row = rows[0]
    category = row.get('category')
    if category in VALID_CATEGORIES:
        return category
    return 'schedule' if _is_schedule_text(row.get('title'), row.get('content')) else 'health_info'


# -- GET /api/announcements/public (no auth) -------------------------------

@announcements_bp.route('/public', methods=['GET'])
def get_public_announcements():
    requested_category = _normalize_category(request.args.get('category')) or 'health_info'

    try:
        if requested_category == 'schedule':
            rows = query(
                'SELECT id, title, content, type, category, priority, location, '
                'event_date AS eventDate, event_time AS eventTime, '
                'created_at AS createdAt '
                'FROM announcements '
                "WHERE active = 1 AND approval_status = 'approved' "
                "AND category = 'schedule' "
                'AND (expires_at IS NULL OR expires_at > NOW()) '
                'ORDER BY event_date ASC, event_time ASC, priority DESC, created_at DESC '
                'LIMIT 30'
            )
        else:
            rows = query(
                'SELECT id, title, content, type, category, priority, '
                'created_at AS createdAt '
                'FROM announcements '
                "WHERE active = 1 AND approval_status = 'approved' "
                "AND category = 'health_info' "
                'AND (expires_at IS NULL OR expires_at > NOW()) '
                'ORDER BY priority DESC, created_at DESC '
                'LIMIT 20'
            )
    except Exception:
        # Backward-compatible fallback for old schema without category/event columns.
        rows = query(
            'SELECT id, title, content, type, priority, created_at AS createdAt '
            'FROM announcements '
            'WHERE active = 1 AND (expires_at IS NULL OR expires_at > NOW()) '
            'ORDER BY priority DESC, created_at DESC '
            'LIMIT 30'
        )
        if requested_category == 'schedule':
            rows = [r for r in rows if _is_schedule_text(r.get('title'), r.get('content'))]
        else:
            rows = [r for r in rows if not _is_schedule_text(r.get('title'), r.get('content'))]

    rows = [_serialize_announcement_row(r) for r in rows]
    return jsonify(announcements=rows)


# -- GET /api/announcements (staff) ---------------------------------------

@announcements_bp.route('', methods=['GET'])
@require_roles(ROLE_HEAD, ROLE_NURSE)
def list_announcements():
    requested_category = _normalize_category(request.args.get('category'))

    try:
        params = []
        where_sql = ''
        if requested_category:
            where_sql = 'WHERE category = %s '
            params.append(requested_category)

        rows = query(
            'SELECT id, title, content, type, category, active, priority, location, '
            'event_date AS eventDate, event_time AS eventTime, '
            'created_by AS createdBy, created_at AS createdAt, '
            'expires_at AS expiresAt, approval_status AS approvalStatus, '
            'approved_by AS approvedBy, approved_at AS approvedAt '
            f'FROM announcements {where_sql}'
            'ORDER BY created_at DESC',
            tuple(params),
        )
    except Exception:
        rows = query(
            'SELECT id, title, content, type, active, priority, '
            'created_by AS createdBy, created_at AS createdAt, '
            'expires_at AS expiresAt, approval_status AS approvalStatus, '
            'approved_by AS approvedBy, approved_at AS approvedAt '
            'FROM announcements ORDER BY created_at DESC'
        )
        if requested_category == 'schedule':
            rows = [r for r in rows if _is_schedule_text(r.get('title'), r.get('content'))]
        elif requested_category == 'health_info':
            rows = [r for r in rows if not _is_schedule_text(r.get('title'), r.get('content'))]

    rows = [_serialize_announcement_row(r) for r in rows]
    return jsonify(announcements=rows)


# -- POST /api/announcements (staff) --------------------------------------

@announcements_bp.route('', methods=['POST'])
@require_roles(ROLE_HEAD, ROLE_NURSE)
def create_announcement():
    body = request.get_json(silent=True) or {}
    actor = get_authenticated_user() or {}

    category = _normalize_category(body.get('category')) or 'health_info'
    title = (body.get('title') or '').strip()
    content = (body.get('content') or '').strip()
    ann_type = (body.get('type') or 'info').strip().lower()
    priority_raw = body.get('priority', 0)
    expires_at = _parse_datetime_local(body.get('expiresAt'))
    location = (body.get('location') or '').strip()
    event_date = _parse_date(body.get('eventDate'))
    event_time = _parse_time(body.get('eventTime'))

    try:
        priority = int(priority_raw)
    except Exception:
        priority = 0

    if ann_type not in VALID_TYPES:
        ann_type = 'info'

    if category == 'schedule':
        if not event_date or not event_time or not location:
            return jsonify(error='Tanggal, waktu, dan lokasi jadwal wajib diisi'), 400
        if not title:
            title = 'Jadwal Layanan Kesehatan'
        if not content:
            content = f'{title} pada {event_date} pukul {event_time[:5]} di {location}'
        ann_type = 'info'
        approval_status = 'approved'
        approved_by = actor.get('email')
        approved_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    else:
        if not title or not content:
            return jsonify(error='Judul dan isi informasi kesehatan wajib diisi'), 400
        if _is_schedule_text(title, content):
            return jsonify(error='Konten jadwal/imunisasi harus dibuat melalui menu Jadwal Berobat / Posyandu'), 400
        location = None
        event_date = None
        event_time = None
        approval_status = 'pending'
        approved_by = None
        approved_at = None

    execute(
        'INSERT INTO announcements '
        '(title, content, type, category, priority, created_by, expires_at, '
        'event_date, event_time, location, approval_status, approved_by, approved_at) '
        'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
        (
            title,
            content,
            ann_type,
            category,
            priority,
            actor.get('email'),
            expires_at,
            event_date,
            event_time,
            location,
            approval_status,
            approved_by,
            approved_at,
        ),
    )
    return jsonify(message='Pengumuman berhasil dibuat'), 201


# -- PUT /api/announcements/<id> (staff) ----------------------------------

@announcements_bp.route('/<int:ann_id>', methods=['PUT'])
@require_roles(ROLE_HEAD, ROLE_NURSE)
def update_announcement(ann_id):
    body = request.get_json(silent=True) or {}
    actor = get_authenticated_user() or {}
    existing_category = _get_existing_category(ann_id)

    if not existing_category:
        return jsonify(error='Pengumuman tidak ditemukan'), 404

    requested_category = _normalize_category(body.get('category')) if 'category' in body else existing_category
    if requested_category and requested_category != existing_category:
        return jsonify(error='Kategori pengumuman tidak dapat diubah'), 400

    fields = []
    values = []

    if 'title' in body:
        title = (body.get('title') or '').strip()
        if not title:
            return jsonify(error='Judul pengumuman tidak boleh kosong'), 400
        fields.append('title = %s'); values.append(title)

    if 'content' in body:
        content = (body.get('content') or '').strip()
        if not content:
            return jsonify(error='Isi pengumuman tidak boleh kosong'), 400
        fields.append('content = %s'); values.append(content)

    if existing_category == 'health_info':
        check_title = (body.get('title') if 'title' in body else None)
        check_content = (body.get('content') if 'content' in body else None)
        if check_title is None or check_content is None:
            current_rows = query('SELECT title, content FROM announcements WHERE id = %s', (ann_id,))
            current = current_rows[0] if current_rows else {}
            if check_title is None:
                check_title = current.get('title') or ''
            if check_content is None:
                check_content = current.get('content') or ''

        if _is_schedule_text(check_title, check_content):
            return jsonify(error='Konten jadwal/imunisasi harus dipindahkan ke menu Jadwal Berobat / Posyandu'), 400

    if 'type' in body:
        ann_type = (body.get('type') or '').strip().lower()
        if ann_type not in VALID_TYPES:
            ann_type = 'info'
        fields.append('type = %s'); values.append(ann_type)

    if 'priority' in body:
        try:
            priority = int(body.get('priority'))
        except Exception:
            priority = 0
        fields.append('priority = %s'); values.append(priority)

    if 'active' in body:
        fields.append('active = %s'); values.append(1 if body.get('active') else 0)

    if 'expiresAt' in body:
        fields.append('expires_at = %s'); values.append(_parse_datetime_local(body.get('expiresAt')))

    if existing_category == 'schedule':
        if 'eventDate' in body:
            event_date = _parse_date(body.get('eventDate'))
            if body.get('eventDate') and not event_date:
                return jsonify(error='Format tanggal jadwal tidak valid (YYYY-MM-DD)'), 400
            fields.append('event_date = %s'); values.append(event_date)

        if 'eventTime' in body:
            event_time = _parse_time(body.get('eventTime'))
            if body.get('eventTime') and not event_time:
                return jsonify(error='Format waktu jadwal tidak valid (HH:MM)'), 400
            fields.append('event_time = %s'); values.append(event_time)

        if 'location' in body:
            location = (body.get('location') or '').strip()
            if not location:
                return jsonify(error='Lokasi jadwal tidak boleh kosong'), 400
            fields.append('location = %s'); values.append(location)

    content_keys = {'title', 'content', 'type', 'priority', 'expiresAt', 'eventDate', 'eventTime', 'location'}
    if any(k in body for k in content_keys):
        if existing_category == 'health_info':
            # Health info must be revalidated by head role after edits.
            fields.append('approval_status = %s'); values.append('pending')
            fields.append('approved_by = NULL')
            fields.append('approved_at = NULL')
        else:
            # Schedule updates are operational and should remain immediately available.
            fields.append('approval_status = %s'); values.append('approved')
            fields.append('approved_by = %s'); values.append(actor.get('email'))
            fields.append('approved_at = NOW()')

    if not fields:
        return jsonify(error='Tidak ada data yang diubah'), 400

    values.append(ann_id)
    execute(f"UPDATE announcements SET {', '.join(fields)} WHERE id = %s", tuple(values))
    return jsonify(message='Pengumuman berhasil diperbarui')


# -- PATCH /api/announcements/<id>/approval (head) ------------------------

@announcements_bp.route('/<int:ann_id>/approval', methods=['PATCH'])
@require_roles(ROLE_HEAD)
def approve_announcement(ann_id):
    body = request.get_json(silent=True) or {}
    status = (body.get('status') or '').strip().lower()

    if status not in {'approved', 'rejected'}:
        return jsonify(error='Status approval harus approved atau rejected'), 400

    actor = get_authenticated_user() or {}
    affected = execute(
        'UPDATE announcements '
        'SET approval_status = %s, approved_by = %s, approved_at = NOW() '
        'WHERE id = %s',
        (status, actor.get('email'), ann_id),
    )
    if affected == 0:
        return jsonify(error='Pengumuman tidak ditemukan'), 404

    if status == 'approved':
        _notify_patients_for_announcement(ann_id)

    return jsonify(message='Status validasi pengumuman berhasil diperbarui')


# -- GET /api/announcements/notifications (patient) -----------------------

@announcements_bp.route('/notifications', methods=['GET'])
@require_roles(ROLE_PATIENT)
def list_patient_notifications():
    actor = get_authenticated_user() or {}
    email = actor.get('email')
    if not email:
        return jsonify(error='Sesi tidak valid. Silakan login ulang'), 401

    rows = query(
        'SELECT id, announcement_id AS announcementId, title, content, '
        'is_read AS isRead, created_at AS createdAt, read_at AS readAt '
        'FROM patient_notifications '
        'WHERE email = %s '
        'ORDER BY created_at DESC '
        'LIMIT 50',
        (email,),
    )

    unread = query(
        'SELECT COUNT(*) AS total FROM patient_notifications WHERE email = %s AND is_read = 0',
        (email,),
    )
    unread_count = int(unread[0]['total']) if unread else 0

    for row in rows:
        row['isRead'] = bool(row.get('isRead'))
        row['createdAt'] = _to_iso(row.get('createdAt'))
        row['readAt'] = _to_iso(row.get('readAt'))

    return jsonify(notifications=rows, unreadCount=unread_count)


# -- PATCH /api/announcements/notifications/read-all (patient) ------------

@announcements_bp.route('/notifications/read-all', methods=['PATCH'])
@require_roles(ROLE_PATIENT)
def mark_all_notifications_read():
    actor = get_authenticated_user() or {}
    email = actor.get('email')
    if not email:
        return jsonify(error='Sesi tidak valid. Silakan login ulang'), 401

    affected = execute(
        'UPDATE patient_notifications SET is_read = 1, read_at = NOW() '
        'WHERE email = %s AND is_read = 0',
        (email,),
    )
    return jsonify(message='Semua notifikasi ditandai sudah dibaca', affected=affected)


# -- PATCH /api/announcements/notifications/<id>/read (patient) -----------

@announcements_bp.route('/notifications/<int:notif_id>/read', methods=['PATCH'])
@require_roles(ROLE_PATIENT)
def mark_notification_read(notif_id):
    actor = get_authenticated_user() or {}
    email = actor.get('email')
    if not email:
        return jsonify(error='Sesi tidak valid. Silakan login ulang'), 401

    affected = execute(
        'UPDATE patient_notifications SET is_read = 1, read_at = NOW() '
        'WHERE id = %s AND email = %s',
        (notif_id, email),
    )
    if affected == 0:
        return jsonify(error='Notifikasi tidak ditemukan'), 404

    return jsonify(message='Notifikasi ditandai sudah dibaca')


# -- DELETE /api/announcements/<id> (staff) -------------------------------

@announcements_bp.route('/<int:ann_id>', methods=['DELETE'])
@require_roles(ROLE_HEAD, ROLE_NURSE)
def delete_announcement(ann_id):
    affected = execute('DELETE FROM announcements WHERE id = %s', (ann_id,))
    if affected == 0:
        return jsonify(error='Pengumuman tidak ditemukan'), 404
    return jsonify(message='Pengumuman berhasil dihapus')
