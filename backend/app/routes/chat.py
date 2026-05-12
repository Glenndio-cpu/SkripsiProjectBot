"""Chat routes – POST /api/chat  &  GET /api/chat/status

Integrated with:
- RAG (Retrieval Augmented Generation) for all chat modes
- Chat history persistence to MySQL
"""

import os
import json
import threading
from pathlib import Path
from datetime import datetime
from flask import Blueprint, request, jsonify
import google.generativeai as genai
from app.session_auth import get_authenticated_user
from app.roles import ROLE_PATIENT

chat_bp = Blueprint('chat', __name__)

MODEL_NAME = 'gemini-2.5-flash-lite'


def _safe_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


CHAT_GUEST_DAILY_LIMIT = _safe_int(os.getenv('CHAT_GUEST_DAILY_LIMIT'), 30)
CHAT_PATIENT_DAILY_LIMIT = _safe_int(os.getenv('CHAT_PATIENT_DAILY_LIMIT'), 60)

# ── File-persisted quota tracking ─────────────────────────────────────────
# Quotas survive PM2 restarts / gunicorn worker respawns.

_QUOTA_FILE = Path(__file__).resolve().parent.parent / 'data' / '.chat_quota.json'
_quota_lock = threading.Lock()


def _today_key():
    return datetime.utcnow().strftime('%Y-%m-%d')


def _client_ip():
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr or 'unknown'


def _read_quota_file() -> dict:
    """Read quota data from JSON file. Returns empty structure if missing/corrupt."""
    try:
        if _QUOTA_FILE.exists():
            data = json.loads(_QUOTA_FILE.read_text(encoding='utf-8'))
            if isinstance(data, dict):
                return data
    except Exception:
        pass
    return {'date': '', 'guest': {}, 'patient': {}}


def _write_quota_file(data: dict):
    """Write quota data to JSON file."""
    try:
        _QUOTA_FILE.parent.mkdir(parents=True, exist_ok=True)
        _QUOTA_FILE.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    except Exception:
        pass


def _consume_chat_quota(is_patient_session, user_email):
    today = _today_key()

    with _quota_lock:
        data = _read_quota_file()

        # Auto-reset if date changed (new day)
        if data.get('date') != today:
            data = {'date': today, 'guest': {}, 'patient': {}}

        if is_patient_session and user_email:
            key = user_email.lower()
            used = data['patient'].get(key, 0)
            if used >= CHAT_PATIENT_DAILY_LIMIT:
                return False, used, CHAT_PATIENT_DAILY_LIMIT, 'patient'

            data['patient'][key] = used + 1
            _write_quota_file(data)
            return True, used + 1, CHAT_PATIENT_DAILY_LIMIT, 'patient'

        ip = _client_ip()
        used = data['guest'].get(ip, 0)
        if used >= CHAT_GUEST_DAILY_LIMIT:
            return False, used, CHAT_GUEST_DAILY_LIMIT, 'guest'

        data['guest'][ip] = used + 1
        _write_quota_file(data)
        return True, used + 1, CHAT_GUEST_DAILY_LIMIT, 'guest'

# ── System prompts ─────────────────────────────────────────────────────────

PUBLIC_SYSTEM_PROMPT = """Anda adalah asisten AI yang membantu pengguna dengan pertanyaan umum.

TUGAS ANDA:
- Menjawab pertanyaan pengguna secara jelas dan relevan
- Memberikan penjelasan yang terstruktur dan mudah dipahami
- Jika tersedia konteks referensi, gunakan sebagai sumber utama
- Jika tidak ada konteks relevan, tetap bantu dengan pengetahuan umum yang aman

ATURAN PENTING TENTANG DATA REFERENSI:
- Jika data di bagian DATA REFERENSI relevan dengan pertanyaan, prioritaskan menjawab menggunakan data tersebut.
- Jika data di bagian DATA REFERENSI TIDAK RELEVAN dengan pertanyaan, ABAIKAN data tersebut dan jawab menggunakan pengetahuan umum yang aman.
- JANGAN PERNAH mengulang atau menggunakan data dari riwayat percakapan sebelumnya jika data tersebut sudah dihapus/tidak tersedia.
- Jika menggunakan DATA REFERENSI, SALIN LENGKAP semua item, langkah, nama dari DATA REFERENSI tanpa ada yang dilewati.

ATURAN KRITIS TENTANG PERTANYAAN BARU:
- Setiap pertanyaan pengguna adalah INDEPENDENT. Jawab HANYA pertanyaan yang sedang ditanyakan.
- JANGAN mengulangi atau menyertakan jawaban dari pertanyaan sebelumnya.
- JANGAN mencampur topik. Jika pengguna bertanya tentang jadwal, jawab HANYA tentang jadwal.
- Jika pengguna bertanya topik baru yang berbeda dari sebelumnya, fokus 100% pada topik baru tersebut.

BATASAN ANDA:
- JANGAN mengarang fakta atau sumber
- JANGAN memberikan diagnosis medis pasti
- JANGAN meresepkan obat spesifik atau dosis
- Untuk kondisi gawat darurat, sarankan segera menghubungi tenaga kesehatan

GAYA KOMUNIKASI:
- Ramah dan sopan
- Jelas dan terstruktur
- Bahasa Indonesia yang baik"""

CONSULTATION_SYSTEM_PROMPT = """Anda adalah asisten pendamping kesehatan yang membantu edukasi kesehatan secara aman.

IDENTITAS ANDA:
- Jika ditanya "Siapa Anda?" atau "Apa itu chatbot ini?", jawab bahwa Anda adalah asisten pendamping kesehatan.

PERAN ANDA:
- Memberikan informasi tentang penyakit menular (influenza, TB, demam berdarah, COVID-19, ISPA, dll)
- Menjelaskan gejala, cara penularan, dan pencegahan penyakit
- Memberikan saran kesehatan umum yang dapat dipercaya
- Mendorong konsultasi dengan tenaga medis profesional untuk diagnosis

ATURAN PENTING TENTANG DATA REFERENSI:
- Jika data di bagian DATA REFERENSI relevan dengan pertanyaan, prioritaskan menjawab menggunakan data tersebut.
- Jika data di bagian DATA REFERENSI TIDAK RELEVAN dengan pertanyaan, ABAIKAN data tersebut dan jawab menggunakan pengetahuan umum yang aman.
- JANGAN PERNAH mengulang atau menggunakan data dari riwayat percakapan sebelumnya jika data tersebut sudah dihapus/tidak tersedia.
- Jika menggunakan DATA REFERENSI, SALIN LENGKAP semua item, langkah, nama dari DATA REFERENSI tanpa ada yang dilewati.

ATURAN KRITIS TENTANG PERTANYAAN BARU:
- Setiap pertanyaan pengguna adalah INDEPENDENT. Jawab HANYA pertanyaan yang sedang ditanyakan.
- JANGAN mengulangi atau menyertakan jawaban dari pertanyaan sebelumnya.
- JANGAN mencampur topik. Jika pengguna bertanya tentang jadwal, jawab HANYA tentang jadwal.
- Jika pengguna bertanya topik baru yang berbeda dari sebelumnya, fokus 100% pada topik baru tersebut.

BATASAN ANDA:
- JANGAN mendiagnosis penyakit secara pasti
- JANGAN meresepkan obat spesifik atau dosis
- JANGAN menggantikan konsultasi medis profesional
- Selalu sarankan untuk berkonsultasi dengan dokter jika gejala serius

GAYA KOMUNIKASI:
- Ramah, empati, dan mudah dipahami
- Gunakan bahasa Indonesia yang baik
- Berikan penjelasan yang jelas dan terstruktur dengan poin-poin
- Jika tidak yakin, akui keterbatasan dan sarankan konsultasi profesional

FOKUS UTAMA:
- Pencegahan penyakit menular
- Edukasi kesehatan masyarakat
- Promosi pola hidup sehat
- Informasi layanan kesehatan yang relevan

CONTOH JAWABAN:
Jika ditanya "Siapa Anda?", jawab:
"Saya adalah asisten pendamping kesehatan, di sini untuk membantu Anda dengan informasi kesehatan dan pencegahan penyakit menular."
"""


# ── Topic-change detection ────────────────────────────────────────────────

# Keyword groups that define broad topic categories.
# When the current query falls into a different category than the previous
# one, we consider it a topic change and clear conversation history to
# prevent the model from mixing answers.
_TOPIC_CATEGORIES = {
    'jadwal': {'jadwal', 'jam', 'operasional', 'buka', 'tutup', 'hari', 'waktu', 'schedule'},
    'dokter': {'dokter', 'doctor', 'spesialis', 'praktek', 'praktik'},
    'pendaftaran': {'pendaftaran', 'daftar', 'registrasi', 'alur', 'prosedur'},
    'penyakit': {'penyakit', 'sakit', 'gejala', 'demam', 'batuk', 'pilek', 'flu',
                 'diare', 'mual', 'infeksi', 'virus', 'bakteri', 'covid', 'tb',
                 'ispa', 'dbd', 'malaria', 'tifus', 'pneumonia'},
    'obat': {'obat', 'obatan', 'resep', 'dosis', 'minum obat', 'farmasi'},
    'layanan': {'layanan', 'pelayanan', 'poli', 'ugd', 'rawat', 'poliklinik',
                'posyandu', 'imunisasi', 'vaksin'},
    'rujukan': {'rujukan', 'rumah sakit', 'rs', 'referral'},
    'struktur': {'struktur', 'organisasi', 'kepala', 'petugas', 'staf'},
    'gizi': {'gizi', 'nutrisi', 'makanan', 'diet', 'piringku'},
    'kontak': {'kontak', 'telepon', 'whatsapp', 'alamat', 'lokasi', 'maps'},
    'developer': {'developer', 'pembuat', 'programmer', 'skripsi'},
}


def _classify_topic(text: str) -> set:
    """Return the set of topic categories that a text belongs to."""
    text_lower = text.lower()
    words = set(text_lower.split())
    matched = set()
    for category, keywords in _TOPIC_CATEGORIES.items():
        # Check both individual words AND substring matches for
        # multi-word keywords like "rumah sakit"
        if words & keywords:
            matched.add(category)
        else:
            for kw in keywords:
                if ' ' in kw and kw in text_lower:
                    matched.add(category)
                    break
    return matched


def _detect_topic_change(current_query: str, previous_user_msgs: list) -> bool:
    """Return True if the current query is about a different topic than the
    most recent previous user message.

    This is a lightweight heuristic: if the two messages share zero topic
    categories, we consider it a topic change.
    """
    if not previous_user_msgs:
        return False  # no history → nothing to conflict with

    prev_text = previous_user_msgs[-1] if previous_user_msgs else ''
    if not prev_text:
        return False

    cur_topics = _classify_topic(current_query)
    prev_topics = _classify_topic(prev_text)

    # If BOTH messages have detected topics but zero overlap → topic changed.
    if cur_topics and prev_topics:
        return len(cur_topics & prev_topics) == 0

    # If current message has a topic but previous doesn't (or vice-versa),
    # treat it as a topic change to be safe.
    if cur_topics and not prev_topics:
        return True
    if prev_topics and not cur_topics:
        return True

    return False


# ── Routes ────────────────────────────────────────────────────────────────

@chat_bp.route('', methods=['POST'])
def chat():
    body = request.get_json(silent=True) or {}
    messages = body.get('messages')
    requested_mode = body.get('mode', 'public')

    session_user = get_authenticated_user()
    is_logged_in = session_user is not None
    user_email = (session_user or {}).get('email', '')
    user_role = (session_user or {}).get('role')
    is_patient_session = bool(user_email and user_role == ROLE_PATIENT)

    # Guests are always limited to public mode.
    if not is_logged_in:
        mode = 'public'
    else:
        mode = requested_mode if requested_mode in ('public', 'consultation') else 'consultation'

    can_persist_history = is_patient_session and mode == 'consultation'

    if not messages or not isinstance(messages, list) or len(messages) == 0:
        return jsonify(error='Messages array is required'), 400

    api_key = os.getenv('GEMINI_API_KEY', '')
    if not api_key or api_key == 'your_gemini_api_key_here':
        phone = (os.getenv('PUSKESMAS_PHONE') or '').strip()
        email_addr = (os.getenv('PUSKESMAS_EMAIL') or '').strip()
        addr = (os.getenv('PUSKESMAS_ADDRESS') or '').strip()

        support_lines = []
        if phone:
            support_lines.append(f'- Telepon/WhatsApp: {phone}')
        if email_addr:
            support_lines.append(f'- Email: {email_addr}')
        if addr:
            support_lines.append(f'- Alamat: {addr}')

        support_block = (
            '**Untuk sementara, Anda dapat menghubungi:**\n' + '\n'.join(support_lines)
            if support_lines
            else 'Silakan hubungi administrator sistem untuk informasi kontak layanan.'
        )

        return jsonify(
            error='Chatbot belum dikonfigurasi',
            response=(
                f'**Chatbot Belum Dikonfigurasi**\n\n'
                f'Maaf, layanan chatbot AI belum dikonfigurasi dengan benar.\n\n'
                f'{support_block}'
            ),
        ), 503

    quota_ok, _current_usage, quota_limit, quota_scope = _consume_chat_quota(is_patient_session, user_email)
    if not quota_ok:
        if quota_scope == 'patient':
            return jsonify(
                error=f'Batas harian akun pasien tercapai: maksimal {quota_limit} pertanyaan per hari. Silakan lanjutkan kembali besok.'
            ), 429

        return jsonify(
            error=(
                f'Batas harian mode masyarakat tercapai: maksimal {quota_limit} pertanyaan per hari per IP/perangkat. '
                'Silakan login untuk unlock fitur pasien.'
            )
        ), 429

    last_msg = messages[-1]
    user_text = last_msg.get('content', '')

    # --- Topic-change detection ---
    # Extract previous user messages (excluding the current one)
    prev_user_msgs = [m.get('content', '') for m in messages[:-1] if m.get('role') == 'user']
    _topic_changed = _detect_topic_change(user_text, prev_user_msgs)

    # Save messages only for authenticated sessions.
    if can_persist_history:
        try:
            from app.chat_history import save_message
            save_message(user_email, 'user', user_text, mode)
        except Exception as e:
            print(f'Save history error: {e}')

    try:
        genai.configure(api_key=api_key)

        # RAG: retrieve context from Qdrant for every mode
        rag_context = ''
        try:
            from app.rag import build_rag_context
            rag_context = build_rag_context(user_text)
        except Exception as e:
            print(f'RAG retrieval error (non-fatal): {e}')

        # Build system prompt with RAG context
        if mode == 'public':
            system_prompt = PUBLIC_SYSTEM_PROMPT
            if rag_context:
                system_prompt += (
                    '\n\nBERIKUT ADALAH DATA RESMI YANG HARUS ANDA GUNAKAN UNTUK MENJAWAB.\n'
                    'INSTRUKSI KETAT:\n'
                    '- Jawab BERDASARKAN data referensi di bawah ini jika relevan.\n'
                    '- Jika menggunakan referensi, SALIN LENGKAP semua item, langkah, nama, dan data yang ada di referensi. JANGAN ada yang dilewati.\n'
                    '- Jika referensi berisi daftar 9 langkah, jawaban Anda HARUS berisi 9 langkah lengkap.\n'
                    '- Jika referensi berisi 16 rumah sakit, jawaban Anda HARUS berisi 16 rumah sakit lengkap.\n'
                    '- Jika referensi berisi 2 bagian (misal Edukasi Gizi DAN Layanan Posyandu), jawaban HARUS berisi KEDUA bagian tersebut secara lengkap.\n'
                    '- JANGAN meringkas, menggabungkan, atau memotong data apapun jika menggunakan referensi.\n'
                    '- Jika data referensi TIDAK RELEVAN dengan pertanyaan, ABAIKAN data tersebut dan jawab berdasarkan pengetahuan Anda.\n\n'
                    '--- DATA REFERENSI ---\n'
                    f'{rag_context}\n'
                    '--- AKHIR DATA REFERENSI ---'
                )
        else:
            system_prompt = CONSULTATION_SYSTEM_PROMPT
            if rag_context:
                system_prompt += (
                    '\n\nBERIKUT ADALAH DATA RESMI YANG HARUS ANDA GUNAKAN UNTUK MENJAWAB.\n'
                    'INSTRUKSI KETAT:\n'
                    '- Jawab BERDASARKAN data referensi di bawah ini jika relevan.\n'
                    '- Jika menggunakan referensi, SALIN LENGKAP semua item, langkah, nama, dan data yang ada di referensi. JANGAN ada yang dilewati.\n'
                    '- Jika referensi berisi daftar 9 langkah, jawaban Anda HARUS berisi 9 langkah lengkap.\n'
                    '- Jika referensi berisi 16 rumah sakit, jawaban Anda HARUS berisi 16 rumah sakit lengkap.\n'
                    '- Jika referensi berisi 2 bagian (misal Edukasi Gizi DAN Layanan Posyandu), jawaban HARUS berisi KEDUA bagian tersebut secara lengkap.\n'
                    '- JANGAN meringkas, menggabungkan, atau memotong data apapun jika menggunakan referensi.\n'
                    '- Jika data referensi TIDAK RELEVAN dengan pertanyaan, ABAIKAN data tersebut dan jawab berdasarkan pengetahuan Anda.\n\n'
                    '--- DATA REFERENSI ---\n'
                    f'{rag_context}\n'
                    '--- AKHIR DATA REFERENSI ---'
                )

        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                top_p=0.95,
                top_k=40,
                max_output_tokens=4096,
            ),
        )

        # Build history — Only include the LAST user-assistant pair to maintain
        # minimal conversational context. When a topic change is detected,
        # send NO history at all to prevent the model from mixing answers.
        history = []
        if not _topic_changed and len(messages) >= 3:
            # Find the last user-assistant exchange before the current message
            prev_msgs = messages[:-1]  # everything before the current message
            last_assistant = None
            last_user_before = None
            for msg in reversed(prev_msgs):
                if msg.get('role') == 'assistant' and last_assistant is None:
                    last_assistant = msg.get('content', '')
                elif msg.get('role') == 'user' and last_user_before is None:
                    last_user_before = msg.get('content', '')
                if last_assistant is not None and last_user_before is not None:
                    break
            if last_user_before and last_assistant:
                # Only include the LAST exchange, truncated to avoid overwhelming
                history.append({'role': 'user', 'parts': [last_user_before[:300]]})
                history.append({'role': 'model', 'parts': [last_assistant[:300]]})
        else:
            if _topic_changed:
                print(f'[Chat] Topic change detected – clearing history for clean response.')

        # Build the final user message with appropriate instructions
        if _topic_changed:
            # Strong isolation instruction when topic has changed
            topic_change_prefix = (
                '[INSTRUKSI KRITIS: Ini adalah pertanyaan BARU dengan topik BERBEDA. '
                'ABAIKAN sepenuhnya semua percakapan sebelumnya. '
                'Jawab HANYA berdasarkan pertanyaan berikut ini. '
                'JANGAN menyertakan informasi apapun dari topik sebelumnya.]\n\n'
            )
            if rag_context:
                user_text_with_hint = (
                    f'{topic_change_prefix}{user_text}\n\n'
                    '[Instruksi: Jawab HANYA pertanyaan di atas berdasarkan data referensi jika relevan. '
                    'SALIN LENGKAP tanpa diringkas. '
                    'Jika data referensi TIDAK RELEVAN, abaikan dan jawab dengan pengetahuan umum yang aman.]'
                )
            else:
                user_text_with_hint = (
                    f'{topic_change_prefix}{user_text}\n\n'
                    '[Instruksi: Jawab HANYA pertanyaan di atas. JANGAN mengulangi atau menyertakan apapun dari percakapan sebelumnya.]'
                )
        else:
            # Normal instruction (no topic change)
            if rag_context:
                user_text_with_hint = (
                    f'{user_text}\n\n'
                    '[Instruksi: Jawab HANYA pertanyaan di atas. JANGAN mengulangi jawaban dari percakapan sebelumnya. '
                    'Jika data referensi relevan, jawab berdasarkan referensi tersebut secara LENGKAP tanpa ada yang diringkas. '
                    'Jika data referensi TIDAK RELEVAN, abaikan referensi tersebut dan jawab dengan pengetahuan umum medis dasar yang aman.]'
                )
            else:
                user_text_with_hint = (
                    f'{user_text}\n\n'
                    '[Instruksi: Jawab HANYA pertanyaan di atas. JANGAN mengulangi jawaban dari percakapan sebelumnya.]'
                )

        chat_session = model.start_chat(history=history)
        result = chat_session.send_message(user_text_with_hint)
        response_text = result.text

        # Save assistant response to history
        if can_persist_history:
            try:
                from app.chat_history import save_message
                save_message(user_email, 'assistant', response_text, mode)
            except Exception as e:
                print(f'Save history error: {e}')

        resp = {'response': response_text}
        if rag_context:
            resp['ragUsed'] = True

        return jsonify(resp)

    except Exception as e:
        err = str(e)
        print(f'Chat API Error: {err}')

        if 'API_KEY_INVALID' in err or 'API key not valid' in err:
            return jsonify(error='API key Gemini tidak valid'), 401

        if '429' in err or 'RESOURCE_EXHAUSTED' in err:
            return jsonify(error='Quota API Gemini habis. Silakan coba lagi dalam beberapa menit.'), 429

        if 'SAFETY' in err:
            return jsonify(error='Respons ditolak karena alasan keamanan. Silakan coba pertanyaan lain.'), 400

        return jsonify(error='Gagal menghubungi AI. Silakan coba lagi.'), 500


@chat_bp.route('/status', methods=['GET'])
def chat_status():
    api_key = os.getenv('GEMINI_API_KEY', '')
    configured = bool(api_key and api_key != 'your_gemini_api_key_here')

    rag_enabled = False
    rag_chunks = 0
    try:
        from app.rag import get_rag_status
        rag_info = get_rag_status()
        rag_enabled = rag_info.get('totalChunks', 0) > 0
        rag_chunks = rag_info.get('totalChunks', 0)
    except Exception:
        pass

    return jsonify(
        configured=configured,
        ragEnabled=rag_enabled,
        ragChunks=rag_chunks,
    )
