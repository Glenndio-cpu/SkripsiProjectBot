"""Users routes – /api/users/*"""

import re
from datetime import datetime
from flask import Blueprint, request, jsonify

from app.store import (
    get_users, get_user_activity, update_user_activity,
    get_activities, update_user, find_user_by_ktp,
)
from app.role_guard import require_auth, require_roles, require_email_match_or_roles

users_bp = Blueprint('users', __name__)


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
@require_roles('nurse')
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


# ── GET /api/users/contacts ──────────────────────────────────────────────

@users_bp.route('/contacts', methods=['GET'])
@require_roles('nurse')
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
@require_roles('nurse')
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
@require_email_match_or_roles('nurse', source='json', field='email')
def update_profile():
    try:
        body = request.get_json(silent=True) or {}
        email = body.get('email', '')
        if not email:
            return jsonify(error='Email is required'), 400

        updates = {}
        if 'name' in body:
            updates['name'] = body['name']
        if 'phone' in body:
            updates['phone'] = re.sub(r'[\s\-\(\)]', '', body['phone'])
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
@require_email_match_or_roles('nurse', source='path', field='email')
def get_activity(email):
    try:
        act = get_user_activity(email)
        return jsonify(
            consultationCount=act.get('consultationCount', 0),
            articlesReadCount=len(act.get('articlesRead', [])),
            activeDaysCount=len(act.get('activeDays', [])),
        )
    except Exception as e:
        print(f'Get Activity Error: {e}')
        return jsonify(error='Gagal mengambil data aktivitas'), 500


# ── POST /api/users/activity/track ───────────────────────────────────────

@users_bp.route('/activity/track', methods=['POST'])
@require_email_match_or_roles('nurse', source='json', field='email')
def track_activity():
    try:
        body = request.get_json(silent=True) or {}
        email = body.get('email', '')
        atype = body.get('type', '')
        article_id = body.get('articleId')

        if not email or not atype:
            return jsonify(error='Email and type are required'), 400

        act = get_user_activity(email)

        if atype == 'consultation':
            act['consultationCount'] = (act.get('consultationCount') or 0) + 1
        elif atype == 'article' and article_id:
            if article_id not in act.get('articlesRead', []):
                act.setdefault('articlesRead', []).append(article_id)
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
@require_roles('nurse')
def all_activities():
    try:
        activities = get_activities()
        return jsonify(activities=_serialize(activities))
    except Exception as e:
        print(f'Get All Activities Error: {e}')
        return jsonify(error='Gagal mengambil data aktivitas'), 500
