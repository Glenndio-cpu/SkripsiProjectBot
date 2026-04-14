"""Chat routes – POST /api/chat  &  GET /api/chat/status

Integrated with:
- RAG (Retrieval Augmented Generation) for all chat modes
- Chat history persistence to MySQL
"""

import os
from flask import Blueprint, request, jsonify
import google.generativeai as genai
from app.session_auth import get_authenticated_user
from app.roles import ROLE_PATIENT

chat_bp = Blueprint('chat', __name__)

MODEL_NAME = 'gemini-2.5-flash-lite'

# ── System prompts ─────────────────────────────────────────────────────────

PUBLIC_SYSTEM_PROMPT = """Anda adalah asisten AI yang membantu pengguna dengan pertanyaan umum.

TUGAS ANDA:
- Menjawab pertanyaan pengguna secara jelas dan relevan
- Memberikan penjelasan ringkas, terstruktur, dan mudah dipahami
- Jika tersedia konteks referensi, gunakan sebagai sumber utama
- Jika tidak ada konteks relevan, tetap bantu dengan pengetahuan umum yang aman

BATASAN ANDA:
- JANGAN mengarang fakta atau sumber
- JANGAN memberikan diagnosis medis pasti
- JANGAN meresepkan obat spesifik atau dosis
- Untuk kondisi gawat darurat, sarankan segera menghubungi tenaga kesehatan

GAYA KOMUNIKASI:
- Ramah dan sopan
- Singkat dan jelas
- Bahasa Indonesia yang baik"""

CONSULTATION_SYSTEM_PROMPT = """Anda adalah asisten pendamping kesehatan yang membantu edukasi kesehatan secara aman.

IDENTITAS ANDA:
- Jika ditanya "Siapa Anda?" atau "Apa itu chatbot ini?", jawab bahwa Anda adalah asisten pendamping kesehatan.

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
- Informasi layanan kesehatan yang relevan

CONTOH JAWABAN:
Jika ditanya "Siapa Anda?", jawab:
"Saya adalah asisten pendamping kesehatan, di sini untuk membantu Anda dengan informasi kesehatan dan pencegahan penyakit menular."
"""


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

    last_msg = messages[-1]
    user_text = last_msg.get('content', '')

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
                    '\n\nBERIKUT ADALAH INFORMASI REFERENSI DARI BASIS KNOWLEDGE QDRANT.\n'
                    'Gunakan informasi ini untuk menjawab pertanyaan pengguna jika relevan. '
                    'Jika informasi tidak relevan dengan pertanyaan, abaikan saja.\n\n'
                    '--- MULAI REFERENSI ---\n'
                    f'{rag_context}\n'
                    '--- AKHIR REFERENSI ---'
                )
        else:
            system_prompt = CONSULTATION_SYSTEM_PROMPT
            if rag_context:
                system_prompt += (
                    '\n\nBERIKUT ADALAH INFORMASI REFERENSI DARI BASIS KNOWLEDGE QDRANT.\n'
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
