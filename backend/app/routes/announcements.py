"""Announcement management routes -- /api/announcements/*"""

from datetime import datetime
from flask import Blueprint, request, jsonify
from app.db import query, execute
from app.session_auth import get_authenticated_user
from app.role_guard import require_roles

announcements_bp = Blueprint('announcements', __name__)


# -- GET /api/announcements/public  (no auth -- shown on Index page) ------

@announcements_bp.route('/public', methods=['GET'])
def get_public_announcements():
    """Return active, non-expired announcements for the public homepage."""
    rows = query(
        'SELECT id, title, content, type, priority, created_at AS createdAt '
        'FROM announcements '
        'WHERE active = 1 AND (expires_at IS NULL OR expires_at > NOW()) '
        'ORDER BY priority DESC, created_at DESC '
        'LIMIT 10'
    )
    for r in rows:
        if hasattr(r['createdAt'], 'isoformat'):
            r['createdAt'] = r['createdAt'].isoformat()
    return jsonify(announcements=rows)


# -- GET /api/announcements  (admin -- all announcements) -----------------

@announcements_bp.route('', methods=['GET'])
@require_roles('nurse')
def list_announcements():
    rows = query(
        'SELECT id, title, content, type, active, priority, '
        'created_by AS createdBy, created_at AS createdAt, '
        'expires_at AS expiresAt '
        'FROM announcements ORDER BY created_at DESC'
    )
    for r in rows:
        if hasattr(r.get('createdAt'), 'isoformat'):
            r['createdAt'] = r['createdAt'].isoformat()
        if hasattr(r.get('expiresAt'), 'isoformat'):
            r['expiresAt'] = r['expiresAt'].isoformat()
        r['active'] = bool(r.get('active'))
    return jsonify(announcements=rows)


# -- POST /api/announcements  (admin -- create) ---------------------------

@announcements_bp.route('', methods=['POST'])
@require_roles('nurse')
def create_announcement():
    body = request.get_json(silent=True) or {}
    admin = get_authenticated_user()

    title = (body.get('title') or '').strip()
    content = (body.get('content') or '').strip()
    ann_type = body.get('type', 'info')
    priority = body.get('priority', 0)
    expires_at = body.get('expiresAt')  # ISO string or None

    if not title or not content:
        return jsonify(error='Judul dan isi pengumuman wajib diisi'), 400

    if ann_type not in ('info', 'warning', 'success', 'urgent'):
        ann_type = 'info'

    exp_val = None
    if expires_at:
        try:
            exp_val = datetime.fromisoformat(expires_at.replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S')
        except Exception:
            exp_val = None

    execute(
        'INSERT INTO announcements (title, content, type, priority, created_by, expires_at) '
        'VALUES (%s, %s, %s, %s, %s, %s)',
        (title, content, ann_type, priority, admin.get('email'), exp_val),
    )
    return jsonify(message='Pengumuman berhasil dibuat'), 201


# -- PUT /api/announcements/<id>  (admin -- update) -----------------------

@announcements_bp.route('/<int:ann_id>', methods=['PUT'])
@require_roles('nurse')
def update_announcement(ann_id):
    body = request.get_json(silent=True) or {}
    fields = []
    values = []

    if 'title' in body:
        fields.append('title = %s'); values.append(body['title'].strip())
    if 'content' in body:
        fields.append('content = %s'); values.append(body['content'].strip())
    if 'type' in body:
        fields.append('type = %s'); values.append(body['type'])
    if 'priority' in body:
        fields.append('priority = %s'); values.append(body['priority'])
    if 'active' in body:
        fields.append('active = %s'); values.append(1 if body['active'] else 0)
    if 'expiresAt' in body:
        exp = body['expiresAt']
        if exp:
            try:
                exp = datetime.fromisoformat(exp.replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S')
            except Exception:
                exp = None
        fields.append('expires_at = %s'); values.append(exp)

    if not fields:
        return jsonify(error='Tidak ada data yang diubah'), 400

    values.append(ann_id)
    execute(f"UPDATE announcements SET {', '.join(fields)} WHERE id = %s", tuple(values))
    return jsonify(message='Pengumuman berhasil diperbarui')


# -- DELETE /api/announcements/<id>  (admin) ------------------------------

@announcements_bp.route('/<int:ann_id>', methods=['DELETE'])
@require_roles('nurse')
def delete_announcement(ann_id):
    affected = execute('DELETE FROM announcements WHERE id = %s', (ann_id,))
    if affected == 0:
        return jsonify(error='Pengumuman tidak ditemukan'), 404
    return jsonify(message='Pengumuman berhasil dihapus')
