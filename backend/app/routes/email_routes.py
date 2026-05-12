"""Email routes – /api/email/*"""

import os
import re
import time
from uuid import uuid4
from collections import defaultdict, deque
from flask import Blueprint, request, jsonify
import requests as http_requests
from app.db import execute

email_bp = Blueprint('email', __name__)

_EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
_TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
_TURNSTILE_SECRET_KEY = (os.getenv('TURNSTILE_SECRET_KEY') or '').strip()
_CONTACT_CAPTCHA_ENFORCE = (os.getenv('CONTACT_CAPTCHA_ENFORCE', 'true').strip().lower() in ('1', 'true', 'yes', 'on'))
_CONTACT_RATE_WINDOW_SECONDS = int(os.getenv('CONTACT_RATE_WINDOW_SECONDS', '300'))
_CONTACT_RATE_MAX_REQUESTS = int(os.getenv('CONTACT_RATE_MAX_REQUESTS', '5'))
_CONTACT_RATE_BUCKETS = defaultdict(deque)


def _is_placeholder(value):
    normalized = _normalize_text(value).lower()
    if not normalized:
        return True

    placeholder_patterns = (
        'change_me',
        'your_',
        'example',
        'placeholder',
    )
    return any(token in normalized for token in placeholder_patterns)


def _normalize_text(value):
    return str(value or '').strip()


def _client_ip():
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr or 'unknown'


def _is_contact_rate_limited(client_ip):
    now = time.time()
    q = _CONTACT_RATE_BUCKETS[client_ip]

    while q and now - q[0] > _CONTACT_RATE_WINDOW_SECONDS:
        q.popleft()

    if len(q) >= _CONTACT_RATE_MAX_REQUESTS:
        return True

    q.append(now)
    return False


def _save_contact_message(request_id, from_name, from_email, subject, message, client_ip, user_agent):
    execute(
        """
        INSERT INTO contact_messages (
            request_id, from_name, from_email, subject, message, client_ip, user_agent
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (request_id, from_name, from_email, subject, message, client_ip, user_agent),
    )


def _update_contact_message_status(request_id, email_status, email_attempted, email_error=None):
    execute(
        """
        UPDATE contact_messages
        SET email_status = %s,
            email_attempted = %s,
            email_error = %s
        WHERE request_id = %s
        """,
        (email_status, email_attempted, email_error, request_id),
    )


def _captcha_configured():
    return bool(_TURNSTILE_SECRET_KEY) and _TURNSTILE_SECRET_KEY != 'your_turnstile_secret_here'


def _verify_turnstile_token(token, client_ip):
    if not _CONTACT_CAPTCHA_ENFORCE:
        return True, None

    if not _captcha_configured():
        return False, 'Layanan CAPTCHA belum dikonfigurasi'

    if not token:
        return False, 'Verifikasi CAPTCHA wajib diisi'

    try:
        resp = http_requests.post(
            _TURNSTILE_VERIFY_URL,
            data={
                'secret': _TURNSTILE_SECRET_KEY,
                'response': token,
                'remoteip': client_ip,
            },
            timeout=10,
        )

        if not resp.ok:
            return False, 'Verifikasi CAPTCHA gagal di server'

        data = resp.json()
        if data.get('success'):
            return True, None

        return False, 'Verifikasi CAPTCHA tidak valid atau kedaluwarsa'
    except Exception:
        return False, 'Layanan verifikasi CAPTCHA sedang bermasalah'


def _emailjs_configured():
    required_values = [
        os.getenv('EMAILJS_SERVICE_ID', ''),
        os.getenv('EMAILJS_PUBLIC_KEY', ''),
        os.getenv('EMAILJS_TEMPLATE_CONTACT', ''),
        os.getenv('EMAILJS_TEMPLATE_CONSULTATION', ''),
    ]
    return all(not _is_placeholder(value) for value in required_values)


def _emailjs_failure_response(resp_text):
    message = _normalize_text(resp_text).lower()

    if 'non-browser environments is currently disabled' in message:
        return (
            'EmailJS menolak request dari server. Aktifkan opsi non-browser API access di EmailJS Dashboard > Account > Security.',
            503,
        )

    if 'public key is invalid' in message:
        return ('Konfigurasi EmailJS tidak valid (public key salah).', 503)

    if 'strict mode' in message and 'no private key was provided' in message:
        return (
            'EmailJS strict mode aktif, tetapi private key belum dikirim. Isi EMAILJS_PRIVATE_KEY di backend/.env atau nonaktifkan strict mode di EmailJS Dashboard > Account > Security.',
            503,
        )

    return ('Gagal mengirim email', 500)


# ── POST /api/email/consultation ─────────────────────────────────────────

@email_bp.route('/consultation', methods=['POST'])
def send_consultation():
    try:
        body = request.get_json(silent=True) or {}
        user_name = body.get('user_name', '')
        user_email = body.get('user_email', '')
        symptoms = body.get('symptoms', '')
        summary = body.get('consultation_summary', '')

        if not user_name or not user_email:
            return jsonify(error='Nama dan email harus diisi'), 400

        if not _emailjs_configured():
            return jsonify(error='Layanan email belum dikonfigurasi'), 503

        payload = {
            'service_id': os.getenv('EMAILJS_SERVICE_ID'),
            'template_id': os.getenv('EMAILJS_TEMPLATE_CONSULTATION'),
            'user_id': os.getenv('EMAILJS_PUBLIC_KEY'),
            'template_params': {
                'user_name': user_name,
                'user_email': user_email,
                'from_name': user_name,
                'from_email': user_email,
                'name': user_name,
                'email': user_email,
                'symptoms': symptoms,
                'consultation_summary': summary,
                'reply_to': user_email,
            },
        }
        private_key = _normalize_text(os.getenv('EMAILJS_PRIVATE_KEY', ''))
        if private_key and not _is_placeholder(private_key):
            payload['accessToken'] = private_key

        resp = http_requests.post(
            'https://api.emailjs.com/api/v1.0/email/send',
            json=payload,
            timeout=15,
        )

        if resp.ok:
            return jsonify(success=True, message='Email konsultasi terkirim')
        print(f'EmailJS error: {resp.text}')
        friendly_error, status_code = _emailjs_failure_response(resp.text)
        return jsonify(error=friendly_error), status_code

    except Exception as e:
        print(f'Email Error: {e}')
        return jsonify(error='Gagal mengirim email'), 500


# ── POST /api/email/contact ──────────────────────────────────────────────

@email_bp.route('/contact', methods=['POST'])
def send_contact():
    request_id = None

    try:
        if _is_contact_rate_limited(_client_ip()):
            return jsonify(
                error='Terlalu banyak percobaan. Silakan coba lagi beberapa menit lagi.',
                code='CONTACT_RATE_LIMITED',
            ), 429

        body = request.get_json(silent=True) or {}
        from_name = _normalize_text(body.get('from_name', ''))
        from_email = _normalize_text(body.get('from_email', ''))
        subject = _normalize_text(body.get('subject', ''))
        message = _normalize_text(body.get('message', ''))
        captcha_token = _normalize_text(body.get('captcha_token', ''))

        if not from_name or not from_email or not subject or not message:
            return jsonify(error='Semua field harus diisi', code='CONTACT_VALIDATION_ERROR'), 400

        if not _EMAIL_RE.match(from_email):
            return jsonify(error='Format email tidak valid', code='CONTACT_VALIDATION_ERROR'), 400

        if len(from_name) > 100:
            return jsonify(error='Nama terlalu panjang (maksimal 100 karakter)', code='CONTACT_VALIDATION_ERROR'), 400

        if len(from_email) > 254:
            return jsonify(error='Email terlalu panjang (maksimal 254 karakter)', code='CONTACT_VALIDATION_ERROR'), 400

        if len(subject) > 150:
            return jsonify(error='Subjek terlalu panjang (maksimal 150 karakter)', code='CONTACT_VALIDATION_ERROR'), 400

        if len(message) > 2000:
            return jsonify(error='Pesan terlalu panjang (maksimal 2000 karakter)', code='CONTACT_VALIDATION_ERROR'), 400

        client_ip = _client_ip()
        captcha_ok, captcha_error = _verify_turnstile_token(captcha_token, client_ip)
        if not captcha_ok:
            return jsonify(error=captcha_error, code='CONTACT_CAPTCHA_FAILED'), 400

        request_id = str(uuid4())
        user_agent = (request.headers.get('User-Agent') or '')[:255]
        _save_contact_message(
            request_id=request_id,
            from_name=from_name,
            from_email=from_email,
            subject=subject,
            message=message,
            client_ip=client_ip,
            user_agent=user_agent,
        )

        if not _emailjs_configured():
            _update_contact_message_status(
                request_id=request_id,
                email_status='skipped',
                email_attempted=0,
                email_error='Layanan email belum dikonfigurasi',
            )
            return jsonify(error='Layanan email belum dikonfigurasi'), 503

        payload = {
            'service_id': os.getenv('EMAILJS_SERVICE_ID'),
            'template_id': os.getenv('EMAILJS_TEMPLATE_CONTACT'),
            'user_id': os.getenv('EMAILJS_PUBLIC_KEY'),
            'template_params': {
                'from_name': from_name,
                'from_email': from_email,
                'name': from_name,
                'email': from_email,
                'sender_name': from_name,
                'sender_email': from_email,
                'subject': subject,
                'message': message,
                'reply_to': from_email,
            },
        }
        private_key = _normalize_text(os.getenv('EMAILJS_PRIVATE_KEY', ''))
        if private_key and not _is_placeholder(private_key):
            payload['accessToken'] = private_key

        resp = http_requests.post(
            'https://api.emailjs.com/api/v1.0/email/send',
            json=payload,
            timeout=15,
        )

        if resp.ok:
            _update_contact_message_status(
                request_id=request_id,
                email_status='sent',
                email_attempted=1,
            )
            return jsonify(success=True, message='Email kontak terkirim', request_id=request_id)

        print(f'EmailJS error: {resp.text}')
        friendly_error, status_code = _emailjs_failure_response(resp.text)
        _update_contact_message_status(
            request_id=request_id,
            email_status='failed',
            email_attempted=1,
            email_error=(resp.text or 'EmailJS rejected request')[:1000],
        )
        return jsonify(error=friendly_error), status_code

    except Exception as e:
        print(f'Email Error: {e}')
        if request_id:
            _update_contact_message_status(
                request_id=request_id,
                email_status='failed',
                email_attempted=1,
                email_error=str(e)[:1000],
            )
        return jsonify(error='Gagal mengirim email'), 500


# ── GET /api/email/status ────────────────────────────────────────────────

@email_bp.route('/status', methods=['GET'])
def email_status():
    return jsonify(configured=_emailjs_configured())
