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

# Cache for Fonnte status — short TTL for near-realtime updates
_fonnte_status_cache = {
    'data': None,
    'timestamp': 0,
}
_FONNTE_CACHE_TTL = 15  # 15 seconds — balances realtime vs rate-limit


def _get_token():
    return os.getenv('FONNTE_TOKEN', '')


def _fonnte_headers():
    return {'Authorization': _get_token()}


def _normalize_text(value):
    if value is None:
        return ''
    return str(value).strip().lower()


def _is_explicit_rate_limit(data):
    response_text = ' '.join(_normalize_text(data.get(key)) for key in ('reason', 'detail', 'message'))
    status_code = _normalize_text(data.get('status_code'))
    return 'rate limit' in response_text or 'rate_limit' in response_text or status_code == '429'


def _extract_connection_state(data):
    candidates = [
        data.get('device_status'),
        data.get('status'),
        (data.get('device') or {}).get('status') if isinstance(data.get('device'), dict) else None,
        (data.get('device') or {}).get('device_status') if isinstance(data.get('device'), dict) else None,
        (data.get('device') or {}).get('connected') if isinstance(data.get('device'), dict) else None,
        (data.get('device') or {}).get('online') if isinstance(data.get('device'), dict) else None,
    ]

    for candidate in candidates:
        normalized = _normalize_text(candidate)
        if normalized in ('connect', 'connected', 'online', 'active', 'true', '1', 'yes'):
            return True, normalized
        if normalized in ('disconnect', 'disconnected', 'offline', 'inactive', 'false', '0', 'no'):
            return False, normalized

    return None, _normalize_text(data.get('device_status') or data.get('status') or 'unknown')

# ===========================================================
#  GET /api/fonnte/status  -- Check Fonnte device status
#  ?force=true  — bypass cache (used by manual Refresh button)
# ===========================================================
@fonnte_bp.route('/status', methods=['GET'])
@require_roles(ROLE_ADMIN, ROLE_HEAD)
def fonnte_status():
    import time

    token = _get_token()
    if not token:
        return jsonify({
            'connected': False,
            'configured': False,
            'message': 'FONNTE_TOKEN belum dikonfigurasi di .env'
        })

    now = time.time()
    force = request.args.get('force', '').lower() in ('true', '1', 'yes')

    # Return cached status if still fresh AND not a forced refresh
    if not force and _fonnte_status_cache['data'] and (now - _fonnte_status_cache['timestamp']) < _FONNTE_CACHE_TTL:
        cached = _fonnte_status_cache['data'].copy()
        cached['cached'] = True
        return jsonify(cached)

    try:
        resp = requests.post(
            f'{FONNTE_API_URL}/device',
            headers=_fonnte_headers(),
            data={},
            timeout=20
        )
        data = resp.json()

        # Handle only explicit rate-limit responses from Fonnte.
        if _is_explicit_rate_limit(data):
            print('[WARN] Fonnte rate limited')
            if _fonnte_status_cache['data']:
                cached = _fonnte_status_cache['data'].copy()
                cached['cached'] = True
                cached['rateLimited'] = True
                return jsonify(cached)
            return jsonify({
                'connected': False,
                'configured': True,
                'rateLimited': True,
                'message': 'Fonnte API rate limit — coba lagi dalam beberapa detik'
            })

        # Normal response — accept several possible shapes from Fonnte.
        is_connected, raw_status = _extract_connection_state(data)
        print(f'[INFO] Fonnte status: device_status={data.get("device_status")}, status={data.get("status")}, parsed={raw_status}')

        if is_connected is None and _fonnte_status_cache['data']:
            cached = _fonnte_status_cache['data'].copy()
            cached['cached'] = True
            cached['stale'] = True
            cached['raw'] = data
            cached['deviceStatus'] = raw_status
            return jsonify(cached)

        result = {
            'connected': bool(is_connected),
            'configured': True,
            'device': data.get('device', {}),
            'deviceStatus': raw_status,
            'detail': data.get('detail', data.get('message', data.get('reason', ''))),
            'quota': data.get('quota', None),
            'package': data.get('package', ''),
            'expired': data.get('expired', ''),
            'name': data.get('name', ''),
            'raw': data
        }

        # Cache the fresh result
        _fonnte_status_cache['data'] = result
        _fonnte_status_cache['timestamp'] = now

        return jsonify(result)
    except Exception as e:
        print(f'[ERROR] Fonnte status check failed: {str(e)}')
        return jsonify({
            'connected': False,
            'configured': True,
            'message': f'Tidak dapat mengecek status device: {str(e)}'
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
@require_roles(ROLE_HEAD)
def fonnte_send_individual():
    """Send to a single contact by phone number."""
    body = request.get_json(force=True)
    token = _get_token()
    if not token:
        return jsonify({'success': False, 'detail': 'FONNTE_TOKEN belum dikonfigurasi'}), 400

    phone = body.get('phone', '').strip()
    message = body.get('message', '').strip()
    name = body.get('name', '')

    print(f'[INFO] Personal send request: phone={phone}, name={name}, msg_len={len(message)}')

    if not phone or not message:
        return jsonify({'success': False, 'detail': 'Nomor telepon dan pesan harus diisi'}), 400

    # Normalize phone number
    if phone.startswith('+'):
        phone = phone[1:]
    if phone.startswith('08'):
        phone = '62' + phone[1:]
    elif phone.startswith('62'):
        pass  # Already normalized
    elif phone.startswith('8'):
        phone = '62' + phone
    else:
        return jsonify({'success': False, 'detail': 'Format nomor telepon tidak valid (harus dimulai 08, 62, atau +62)'}), 400

    print(f'[INFO] Normalized phone: {phone}')

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
        # Get authenticated user email for logging
        user = get_authenticated_user()
        admin_email = user.get('email', 'unknown') if user else 'unknown'
        
        print(f'[INFO] Sending to Fonnte API: target={phone}, admin={admin_email}')
        
        resp = requests.post(
            f'{FONNTE_API_URL}/send',
            headers=_fonnte_headers(),
            data=payload,
            timeout=15
        )
        data = resp.json()
        
        success = data.get('status', False)
        detail = data.get('detail', data.get('reason', 'Pesan terkirim'))
        
        print(f'[INFO] Fonnte response: success={success}, detail={detail}, full_response={data}')
        
        # Log the send attempt for audit trail
        try:
            execute(
                '''INSERT INTO broadcast_logs (admin_email, message, recipients, recipient_count, 
                   success_count, fail_count, status, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())''',
                (admin_email, actual_message, phone, 1, 1 if success else 0, 0 if success else 1, 
                 'sent' if success else 'failed')
            )
        except Exception as log_err:
            print(f'[WARN] Failed to log personal send: {str(log_err)}')
        
        return jsonify({
            'success': success,
            'detail': detail if detail else ('Pesan berhasil dikirim' if success else 'Gagal mengirim pesan'),
        })
    except Exception as e:
        print(f'[ERROR] fonnte_send_individual: {str(e)}')
        return jsonify({
            'success': False, 
            'detail': f'Terjadi kesalahan saat mengirim: {str(e)}'
        }), 500
