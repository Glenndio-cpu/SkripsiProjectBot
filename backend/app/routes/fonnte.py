"""Fonnte WhatsApp Gateway routes -- /api/fonnte/*"""

import os
import json
import requests
from datetime import datetime
from flask import Blueprint, request, jsonify
from app.db import query, execute
from app.session_auth import get_authenticated_user
from app.role_guard import require_roles
from app.roles import ROLE_ADMIN, ROLE_HEAD

fonnte_bp = Blueprint('fonnte', __name__)

FONNTE_API_URL = 'https://api.fonnte.com'


def _get_token():
    return os.getenv('FONNTE_TOKEN', '')


def _fonnte_headers():
    return {'Authorization': _get_token()}

# ===========================================================
#  GET /api/fonnte/status  -- Check Fonnte device status
# ===========================================================
@fonnte_bp.route('/status', methods=['GET'])
@require_roles(ROLE_ADMIN, ROLE_HEAD)
def fonnte_status():
    token = _get_token()
    if not token:
        return jsonify({
            'connected': False,
            'configured': False,
            'message': 'FONNTE_TOKEN belum dikonfigurasi di .env'
        })

    try:
        # Fonnte device info endpoint
        resp = requests.post(
            f'{FONNTE_API_URL}/device',
            headers=_fonnte_headers(),
            data={},
            timeout=10
        )
        data = resp.json()
        # device_status can be 'connect' or 'disconnect'
        is_connected = data.get('device_status') == 'connect'
        return jsonify({
            'connected': is_connected,
            'configured': True,
            'device': data.get('device', {}),
            'deviceStatus': data.get('device_status', 'unknown'),
            'detail': data.get('detail', ''),
            'quota': data.get('quota', None),
            'package': data.get('package', ''),
            'expired': data.get('expired', ''),
            'name': data.get('name', ''),
            'raw': data
        })
    except Exception as e:
        return jsonify({
            'connected': False,
            'configured': True,
            'message': f'Gagal menghubungi Fonnte: {str(e)}'
        })


# ===========================================================
#  POST /api/fonnte/send  -- Send single/multiple WhatsApp
# ===========================================================
@fonnte_bp.route('/send', methods=['POST'])
@require_roles(ROLE_ADMIN)
def fonnte_send():
    body = request.get_json(force=True)
    admin = get_authenticated_user()

    token = _get_token()
    if not token:
        return jsonify({'error': 'FONNTE_TOKEN belum dikonfigurasi'}), 400

    target = body.get('target', '')
    message = body.get('message', '')

    if not target or not message:
        return jsonify({'error': 'target dan message wajib diisi'}), 400

    # Build payload
    payload = {
        'target': target,
        'message': message,
        'countryCode': '62',
        'connectOnly': 'false',
    }

    # Optional params
    if body.get('delay'):
        payload['delay'] = str(body['delay'])
    if body.get('url'):
        payload['url'] = body['url']
    if body.get('filename'):
        payload['filename'] = body['filename']
    if body.get('typing'):
        payload['typing'] = True
    if body.get('schedule'):
        payload['schedule'] = int(body['schedule'])

    try:
        resp = requests.post(
            f'{FONNTE_API_URL}/send',
            headers=_fonnte_headers(),
            data=payload,
            timeout=30
        )
        data = resp.json()

        # Log the broadcast
        target_list = [t.strip() for t in target.split(',') if t.strip()]
        success = data.get('status', False)
        execute(
            'INSERT INTO broadcast_logs (admin_email, message, recipients, recipient_count, '
            'success_count, fail_count, fonnte_response, status) '
            'VALUES (%s, %s, %s, %s, %s, %s, %s, %s)',
            (
                admin.get('email'),
                message[:2000],
                target[:5000],
                len(target_list),
                len(target_list) if success else 0,
                0 if success else len(target_list),
                json.dumps(data)[:5000],
                'sent' if success else 'failed',
            )
        )

        return jsonify({
            'success': success,
            'detail': data.get('detail', data.get('reason', '')),
            'id': data.get('id', []),
            'process': data.get('process', ''),
            'target': data.get('target', []),
            'raw': data,
        })
    except Exception as e:
        return jsonify({'error': f'Gagal mengirim pesan: {str(e)}'}), 500


# ===========================================================
#  POST /api/fonnte/broadcast  -- Broadcast to all patients
# ===========================================================
@fonnte_bp.route('/broadcast', methods=['POST'])
@require_roles(ROLE_HEAD, ROLE_ADMIN)
def fonnte_broadcast():
    body = request.get_json(force=True)
    admin = get_authenticated_user()

    token = _get_token()
    if not token:
        return jsonify({'error': 'FONNTE_TOKEN belum dikonfigurasi'}), 400

    message = body.get('message', '')
    if not message:
        return jsonify({'error': 'message wajib diisi'}), 400

    # Get all users with phone numbers (patients only)
    users = query(
        "SELECT name, phone FROM users WHERE phone IS NOT NULL AND phone != '' AND role = 'patient' "
        "ORDER BY name"
    )

    if not users:
        return jsonify({'error': 'Tidak ada pasien dengan nomor telepon'}), 400

    # Build target list with variables for personalized messages
    # Format: number|name  (supports {name} variable in message)
    targets = []
    for u in users:
        phone = u['phone'].strip()
        # Normalize phone format
        if phone.startswith('+'):
            phone = phone[1:]
        if phone.startswith('08'):
            phone = '62' + phone[1:]
        elif phone.startswith('8'):
            phone = '62' + phone
        name = u.get('name', 'Pasien')
        targets.append(f"{phone}|{name}")

    target_str = ','.join(targets)

    payload = {
        'target': target_str,
        'message': message,
        'countryCode': '0',  # Bypass filter since we already formatted
        'delay': body.get('delay', '2-5'),
        'typing': True,
        'connectOnly': 'false',
    }

    if body.get('url'):
        payload['url'] = body['url']

    try:
        resp = requests.post(
            f'{FONNTE_API_URL}/send',
            headers=_fonnte_headers(),
            data=payload,
            timeout=30
        )
        data = resp.json()
        success = data.get('status', False)

        execute(
            'INSERT INTO broadcast_logs (admin_email, message, recipients, recipient_count, '
            'success_count, fail_count, fonnte_response, status) '
            'VALUES (%s, %s, %s, %s, %s, %s, %s, %s)',
            (
                admin.get('email'),
                message[:2000],
                target_str[:5000],
                len(targets),
                len(targets) if success else 0,
                0 if success else len(targets),
                json.dumps(data)[:5000],
                'sent' if success else 'failed',
            )
        )

        return jsonify({
            'success': success,
            'detail': data.get('detail', data.get('reason', '')),
            'recipientCount': len(targets),
            'id': data.get('id', []),
            'process': data.get('process', ''),
            'raw': data,
        })
    except Exception as e:
        return jsonify({'error': f'Gagal broadcast: {str(e)}'}), 500


# ===========================================================
#  POST /api/fonnte/validate  -- Validate WhatsApp number
# ===========================================================
@fonnte_bp.route('/validate', methods=['POST'])
@require_roles(ROLE_ADMIN)
def fonnte_validate():
    body = request.get_json(force=True)
    token = _get_token()
    if not token:
        return jsonify({'error': 'FONNTE_TOKEN belum dikonfigurasi'}), 400

    target = body.get('target', '')
    if not target:
        return jsonify({'error': 'target wajib diisi'}), 400

    try:
        resp = requests.post(
            f'{FONNTE_API_URL}/validate',
            headers=_fonnte_headers(),
            data={
                'target': target,
                'countryCode': '62',
            },
            timeout=15
        )
        data = resp.json()
        return jsonify({
            'success': data.get('status', False),
            'registered': data.get('registered', []),
            'notRegistered': data.get('not_registered', []),
        })
    except Exception as e:
        return jsonify({'error': f'Gagal validasi: {str(e)}'}), 500


# ===========================================================
#  GET /api/fonnte/logs  -- Broadcast history logs
# ===========================================================
@fonnte_bp.route('/logs', methods=['GET'])
@require_roles(ROLE_ADMIN, ROLE_HEAD)
def fonnte_logs():
    limit = request.args.get('limit', 50, type=int)
    rows = query(
        'SELECT id, admin_email AS adminEmail, message, recipient_count AS recipientCount, '
        'success_count AS successCount, fail_count AS failCount, status, '
        'created_at AS createdAt '
        'FROM broadcast_logs ORDER BY created_at DESC LIMIT %s',
        (limit,)
    )
    for r in rows:
        if isinstance(r.get('createdAt'), datetime):
            r['createdAt'] = r['createdAt'].isoformat() + 'Z'
    return jsonify({'logs': rows})


# ===========================================================
#  POST /api/fonnte/send-individual  -- Send to one person
# ===========================================================
@fonnte_bp.route('/send-individual', methods=['POST'])
@require_roles(ROLE_ADMIN)
def fonnte_send_individual():
    """Send to a single contact by phone number."""
    body = request.get_json(force=True)
    token = _get_token()
    if not token:
        return jsonify({'error': 'FONNTE_TOKEN belum dikonfigurasi'}), 400

    phone = body.get('phone', '').strip()
    message = body.get('message', '').strip()
    name = body.get('name', '')

    if not phone or not message:
        return jsonify({'error': 'phone dan message wajib diisi'}), 400

    # Normalize
    if phone.startswith('+'):
        phone = phone[1:]
    if phone.startswith('08'):
        phone = '62' + phone[1:]
    elif phone.startswith('8'):
        phone = '62' + phone

    # Replace {name} in message
    actual_message = message.replace('{name}', name) if name else message

    payload = {
        'target': phone,
        'message': actual_message,
        'countryCode': '0',
        'typing': True,
        'connectOnly': 'false',
    }

    try:
        resp = requests.post(
            f'{FONNTE_API_URL}/send',
            headers=_fonnte_headers(),
            data=payload,
            timeout=15
        )
        data = resp.json()
        return jsonify({
            'success': data.get('status', False),
            'detail': data.get('detail', data.get('reason', '')),
            'raw': data,
        })
    except Exception as e:
        return jsonify({'error': f'Gagal mengirim: {str(e)}'}), 500
