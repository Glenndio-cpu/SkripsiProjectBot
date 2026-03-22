"""Chat routes – POST /api/chat  &  GET /api/chat/status

Integrated with:
- RAG (Retrieval Augmented Generation) for consultation mode
- Chat history persistence to MySQL
"""

import os, re
from flask import Blueprint, request, jsonify
import google.generativeai as genai

chat_bp = Blueprint('chat', __name__)

MODEL_NAME = 'gemini-2.5-flash-lite'

# ── System prompts (identical to old Node backend) ────────────────────────

PUBLIC_SYSTEM_PROMPT = """Anda adalah asisten informasi Puskesmas Wori Online.

TUGAS ANDA:
- Menjawab pertanyaan tentang informasi Puskesmas Wori
- Memberikan informasi jam layanan, alamat, lokasi, dan rute
- Menjelaskan cara menggunakan website/aplikasi
- Informasi kontak dan WhatsApp Puskesmas
- Informasi biaya, administrasi, dan persyaratan layanan
- Layanan yang tersedia di Puskesmas
- Alur pendaftaran dan antrian
- Jadwal imunisasi dan vaksinasi
- Cara membuat akun, login, dan register

BATASAN ANDA:
- JANGAN memberikan konsultasi medis
- JANGAN mendiagnosis penyakit atau gejala
- JANGAN memberikan rekomendasi obat
- JANGAN menjawab pertanyaan tentang penyakit spesifik
- Jika ditanya tentang kesehatan/penyakit, minta user untuk login terlebih dahulu

RESPONS SAAT DITANYA MEDIS:
"Untuk konsultasi medis dan informasi penyakit, silakan login terlebih dahulu. Saat ini saya hanya dapat membantu dengan informasi umum Puskesmas seperti jam layanan, lokasi, pendaftaran, kontak, dan jadwal imunisasi."

GAYA KOMUNIKASI:
- Ramah dan sopan
- Singkat dan jelas
- Bahasa Indonesia yang baik"""

CONSULTATION_SYSTEM_PROMPT = """Anda adalah Chatbot Pendamping Puskesmas Desa Wori yang ahli dalam kesehatan dan pencegahan penyakit menular.

IDENTITAS ANDA:
- Jika ditanya "Siapa Anda?" atau "Apa itu chatbot ini?", jawab: "Saya adalah Chatbot Pendamping Puskesmas Desa Wori"
- JANGAN PERNAH menyebut diri sebagai "Asisten Virtual" atau "AI Assistant"
- SELALU gunakan identitas "Chatbot Pendamping Puskesmas Desa Wori"

PERAN ANDA:
- Memberikan informasi tentang penyakit menular (influenza, TB, demam berdarah, COVID-19, ISPA, dll)
- Menjelaskan gejala, cara penularan, dan pencegahan penyakit
- Memberikan saran kesehatan umum yang dapat dipercaya
- Mendorong konsultasi dengan tenaga medis profesional untuk diagnosis

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
- Informasi layanan Puskesmas Wori

CONTOH JAWABAN:
Jika ditanya "Siapa Anda?", jawab:
"Saya adalah Chatbot Pendamping Puskesmas Desa Wori, di sini untuk membantu Anda dengan informasi kesehatan, pencegahan penyakit menular, dan layanan Puskesmas Wori.\""""

# ── Public-mode topic filter ──────────────────────────────────────────────

_GREETINGS = [
    re.compile(
        r'^(halo|hai|hi|hello|hey|selamat\s+(pagi|siang|sore|malam)|assalamu|'
        r'apa\s+kabar|permisi|terima\s+kasih|makasih|ok|oke|ya|iya|tidak|baik|siapa)',
        re.I,
    )
]

_ALLOWED = [
    re.compile(p, re.I) for p in [
        r'jam|buka|tutup|operasional',
        r'lokasi|alamat|rute|maps|arah',
        r'kontak|telepon|whats?app|wa|hubungi',
        r'layanan|fitur|fasilitas',
        r'pendaftaran|daftar|antrian|booking',
        r'jadwal|vaksin|imunisasi',
        r'biaya|gratis|administrasi|tarif',
        r'akun|login|register|daftar\s+akun|masuk',
        r'privasi|syarat|ketentuan',
        r'cara\s+pakai|cara\s+gunakan|tutorial',
    ]
]

_BLOCKED = [
    re.compile(p, re.I) for p in [
        r'gejala|diagnos|sakit',
        r'obat|dosis|resep|medicine',
        r'penyakit|flu|demam|dbd|covid|asma|batuk|pilek|diare|muntah',
        r'hipertensi|diabetes|kanker|jantung|stroke',
        r'tb|malaria|hiv|aids|hepatitis',
        r'alergi|sesak|pusing|nyeri|lemas',
    ]
]


def _is_public_allowed(text: str) -> bool:
    t = text.strip()
    if any(rx.search(t) for rx in _GREETINGS):
        return True
    if any(rx.search(t) for rx in _BLOCKED):
        return False
    return any(rx.search(t) for rx in _ALLOWED)


# ── Routes ────────────────────────────────────────────────────────────────

@chat_bp.route('', methods=['POST'])
def chat():
    body = request.get_json(silent=True) or {}
    messages = body.get('messages')
    mode = body.get('mode', 'public')
    user_email = body.get('email', '')

    if not messages or not isinstance(messages, list) or len(messages) == 0:
        return jsonify(error='Messages array is required'), 400

    api_key = os.getenv('GEMINI_API_KEY', '')
    if not api_key or api_key == 'your_gemini_api_key_here':
        phone = os.getenv('PUSKESMAS_PHONE', '+62 896-5739-8733')
        email_addr = os.getenv('PUSKESMAS_EMAIL', 'puskesmas.desawori@gmail.com')
        addr = os.getenv('PUSKESMAS_ADDRESS', 'Puskesmas Wori')
        return jsonify(
            error='Chatbot belum dikonfigurasi',
            response=(
                f'**Chatbot Belum Dikonfigurasi**\n\n'
                f'Maaf, layanan chatbot AI belum dikonfigurasi dengan benar.\n\n'
                f'**Untuk sementara, Anda dapat:**\n'
                f'- Hubungi: {phone} (WhatsApp)\n'
                f'- Email: {email_addr}\n'
                f'- Kunjungi: {addr}'
            ),
        ), 503

    last_msg = messages[-1]
    user_text = last_msg.get('content', '')

    # Public mode: reject medical questions
    if mode == 'public' and not _is_public_allowed(user_text):
        return jsonify(
            response='Untuk konsultasi medis dan informasi penyakit, silakan login terlebih dahulu. '
                     'Saat ini saya hanya dapat membantu dengan informasi umum Puskesmas seperti '
                     'jam layanan, lokasi, pendaftaran, kontak, dan jadwal imunisasi.'
        )

    # Save user message to history
    if user_email:
        try:
            from app.chat_history import save_message
            save_message(user_email, 'user', user_text, mode)
        except Exception as e:
            print(f'Save history error: {e}')

    try:
        genai.configure(api_key=api_key)

        # RAG: retrieve context for consultation mode
        rag_context = ''
        if mode == 'consultation':
            try:
                from app.rag import build_rag_context
                rag_context = build_rag_context(user_text)
            except Exception as e:
                print(f'RAG retrieval error (non-fatal): {e}')

        # Build system prompt with RAG context
        if mode == 'public':
            system_prompt = PUBLIC_SYSTEM_PROMPT
        else:
            system_prompt = CONSULTATION_SYSTEM_PROMPT
            if rag_context:
                system_prompt += (
                    '\n\nBERIKUT ADALAH INFORMASI REFERENSI DARI DOKUMEN PUSKESMAS WORI.\n'
                    'Gunakan informasi ini untuk menjawab pertanyaan pengguna jika relevan. '
                    'Jika informasi tidak relevan dengan pertanyaan, abaikan saja.\n\n'
                    '--- MULAI REFERENSI ---\n'
                    f'{rag_context}\n'
                    '--- AKHIR REFERENSI ---'
                )

        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.7,
                top_p=0.95,
                top_k=40,
                max_output_tokens=2048,
            ),
        )

        # Build history (all except last message)
        history = []
        for msg in messages[:-1]:
            role = 'model' if msg.get('role') == 'assistant' else 'user'
            history.append({'role': role, 'parts': [msg['content']]})

        chat_session = model.start_chat(history=history)
        result = chat_session.send_message(user_text)
        response_text = result.text

        # Save assistant response to history
        if user_email:
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
