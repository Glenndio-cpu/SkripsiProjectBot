"""Email routes – /api/email/*"""

import os
from flask import Blueprint, request, jsonify
import requests as http_requests

email_bp = Blueprint('email', __name__)


def _emailjs_configured():
    sid = os.getenv('EMAILJS_SERVICE_ID', '')
    pk = os.getenv('EMAILJS_PUBLIC_KEY', '')
    return (
        bool(sid) and sid != 'your_service_id_here'
        and bool(pk) and pk != 'your_public_key_here'
    )


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

        resp = http_requests.post(
            'https://api.emailjs.com/api/v1.0/email/send',
            json={
                'service_id': os.getenv('EMAILJS_SERVICE_ID'),
                'template_id': os.getenv('EMAILJS_TEMPLATE_CONSULTATION'),
                'user_id': os.getenv('EMAILJS_PUBLIC_KEY'),
                'template_params': {
                    'user_name': user_name,
                    'user_email': user_email,
                    'symptoms': symptoms,
                    'consultation_summary': summary,
                    'reply_to': user_email,
                },
            },
            timeout=15,
        )

        if resp.ok:
            return jsonify(success=True, message='Email konsultasi terkirim')
        print(f'EmailJS error: {resp.text}')
        return jsonify(error='Gagal mengirim email'), 500

    except Exception as e:
        print(f'Email Error: {e}')
        return jsonify(error='Gagal mengirim email'), 500


# ── POST /api/email/contact ──────────────────────────────────────────────

@email_bp.route('/contact', methods=['POST'])
def send_contact():
    try:
        body = request.get_json(silent=True) or {}
        from_name = body.get('from_name', '')
        from_email = body.get('from_email', '')
        subject = body.get('subject', '')
        message = body.get('message', '')

        if not from_name or not from_email or not subject or not message:
            return jsonify(error='Semua field harus diisi'), 400

        if not _emailjs_configured():
            return jsonify(error='Layanan email belum dikonfigurasi'), 503

        resp = http_requests.post(
            'https://api.emailjs.com/api/v1.0/email/send',
            json={
                'service_id': os.getenv('EMAILJS_SERVICE_ID'),
                'template_id': os.getenv('EMAILJS_TEMPLATE_CONTACT'),
                'user_id': os.getenv('EMAILJS_PUBLIC_KEY'),
                'template_params': {
                    'from_name': from_name,
                    'from_email': from_email,
                    'subject': subject,
                    'message': message,
                    'reply_to': from_email,
                },
            },
            timeout=15,
        )

        if resp.ok:
            return jsonify(success=True, message='Email kontak terkirim')
        print(f'EmailJS error: {resp.text}')
        return jsonify(error='Gagal mengirim email'), 500

    except Exception as e:
        print(f'Email Error: {e}')
        return jsonify(error='Gagal mengirim email'), 500


# ── GET /api/email/status ────────────────────────────────────────────────

@email_bp.route('/status', methods=['GET'])
def email_status():
    return jsonify(configured=_emailjs_configured())
