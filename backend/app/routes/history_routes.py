"""Chat history routes – /api/chat/history/*"""

from flask import Blueprint, request, jsonify
from app.chat_history import get_history, clear_history, get_history_count
from app.role_guard import require_email_match_or_roles

history_bp = Blueprint('chat_history', __name__)


# ── GET /api/chat/history/<email> ─────────────────────────────────────────

@history_bp.route('/<email>', methods=['GET'])
@require_email_match_or_roles('nurse', source='path', field='email')
def load_history(email):
    mode = request.args.get('mode', 'consultation')
    limit = request.args.get('limit', 50, type=int)
    try:
        messages = get_history(email, mode=mode, limit=limit)
        return jsonify(messages=messages, count=len(messages))
    except Exception as e:
        print(f'Load History Error: {e}')
        return jsonify(error='Gagal memuat riwayat chat'), 500


# ── DELETE /api/chat/history/<email> ──────────────────────────────────────

@history_bp.route('/<email>', methods=['DELETE'])
@require_email_match_or_roles('nurse', source='path', field='email')
def delete_history(email):
    mode = request.args.get('mode')
    try:
        clear_history(email, mode=mode)
        return jsonify(message='Riwayat chat berhasil dihapus')
    except Exception as e:
        print(f'Clear History Error: {e}')
        return jsonify(error='Gagal menghapus riwayat chat'), 500


# ── GET /api/chat/history/count/<email> ───────────────────────────────────

@history_bp.route('/count/<email>', methods=['GET'])
@require_email_match_or_roles('nurse', source='path', field='email')
def history_count(email):
    try:
        counts = get_history_count(email)
        return jsonify(counts=counts)
    except Exception as e:
        print(f'History Count Error: {e}')
        return jsonify(error='Gagal menghitung riwayat chat'), 500
