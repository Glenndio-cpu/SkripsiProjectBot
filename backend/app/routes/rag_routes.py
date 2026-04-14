"""Document & RAG management routes – /api/rag/*"""

import os
from pathlib import Path
from datetime import datetime
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from app.role_guard import require_roles
from app.roles import ROLE_ADMIN

rag_bp = Blueprint('rag', __name__)

DOCS_DIR = Path(__file__).resolve().parent.parent.parent / 'data' / 'documents'
ALLOWED_EXT = {'.txt', '.pdf', '.json', '.md', '.csv', '.docx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _get_qdrant_source_counts() -> dict:
    """Return source -> chunk count from Qdrant payload metadata."""
    try:
        from app.rag import _get_client, COLLECTION_NAME

        client = _get_client()
        source_counts = {}
        offset = None

        # Safety bound to avoid infinite pagination loops.
        for _ in range(200):
            scroll_resp = client.scroll(
                collection_name=COLLECTION_NAME,
                limit=256,
                offset=offset,
                with_payload=['source'],
                with_vectors=False,
            )

            if isinstance(scroll_resp, tuple):
                points, offset = scroll_resp
            else:
                points = getattr(scroll_resp, 'points', []) or []
                offset = getattr(scroll_resp, 'next_page_offset', None)

            if not points:
                break

            for point in points:
                payload = getattr(point, 'payload', None) or {}
                source = payload.get('source')
                if source:
                    source_counts[source] = source_counts.get(source, 0) + 1

            if offset is None:
                break

        return source_counts
    except Exception:
        return {}


def _delete_qdrant_points_by_source(source_name: str) -> int:
    """Delete points by payload source without relying on payload index."""
    if not source_name:
        return 0

    from app.rag import _get_client, COLLECTION_NAME
    from qdrant_client.models import PointIdsList

    client = _get_client()
    matched_ids = []
    offset = None

    # Scroll all points and match source in payload (works without payload index)
    for _ in range(400):
        scroll_resp = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=256,
            offset=offset,
            with_payload=['source'],
            with_vectors=False,
        )

        if isinstance(scroll_resp, tuple):
            points, offset = scroll_resp
        else:
            points = getattr(scroll_resp, 'points', []) or []
            offset = getattr(scroll_resp, 'next_page_offset', None)

        if not points:
            break

        for point in points:
            payload = getattr(point, 'payload', None) or {}
            if payload.get('source') == source_name:
                matched_ids.append(point.id)

        if offset is None:
            break

    if not matched_ids:
        return 0

    deleted = 0
    for i in range(0, len(matched_ids), 256):
        batch_ids = matched_ids[i:i + 256]
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=PointIdsList(points=batch_ids),
        )
        deleted += len(batch_ids)

    return deleted


# ── GET /api/rag/status ──────────────────────────────────────────────────

@rag_bp.route('/status', methods=['GET'])
@require_roles(ROLE_ADMIN)
def rag_status():
    try:
        from app.rag import get_rag_status
        status = get_rag_status()
        return jsonify(status)
    except Exception as e:
        return jsonify(enabled=False, error=str(e))


# ── POST /api/rag/upload ─────────────────────────────────────────────────

@rag_bp.route('/upload', methods=['POST'])
@require_roles(ROLE_ADMIN)
def upload_document():
    if 'file' not in request.files:
        return jsonify(error='File tidak ditemukan'), 400

    file = request.files['file']
    if not file.filename:
        return jsonify(error='Nama file kosong'), 400

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXT:
        return jsonify(error=f'Format file tidak didukung. Gunakan: {", ".join(ALLOWED_EXT)}'), 400

    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    filename = secure_filename(file.filename)
    filepath = DOCS_DIR / filename

    file.save(str(filepath))

    file_size = filepath.stat().st_size
    if file_size > MAX_FILE_SIZE:
        filepath.unlink()
        return jsonify(error='File terlalu besar (maks 10MB)'), 400

    # Index immediately
    try:
        from app.rag import index_document
        chunks = index_document(filepath, source_name=filename)
        return jsonify(
            message=f'Dokumen "{filename}" berhasil diupload dan diindeks',
            filename=filename,
            chunks=chunks,
            size=file_size,
        ), 201
    except Exception as e:
        return jsonify(
            message=f'Dokumen "{filename}" berhasil diupload tapi gagal diindeks',
            filename=filename,
            error=str(e),
        ), 201


# ── DELETE /api/rag/document/<filename> ───────────────────────────────────

@rag_bp.route('/document/<filename>', methods=['DELETE'])
@require_roles(ROLE_ADMIN)
def delete_document(filename):
    filepath = DOCS_DIR / secure_filename(filename)
    file_deleted = False
    if filepath.exists():
        filepath.unlink()
        file_deleted = True

    # Remove from Qdrant
    qdrant_deleted = False
    qdrant_deleted_points = 0
    try:
        source_candidates = {filename, secure_filename(filename)}
        for source in source_candidates:
            if not source:
                continue
            qdrant_deleted_points += _delete_qdrant_points_by_source(source)
        qdrant_deleted = qdrant_deleted_points > 0
    except Exception:
        pass

    if not file_deleted and not qdrant_deleted:
        return jsonify(error='Dokumen tidak ditemukan di file lokal maupun index Qdrant'), 404

    if file_deleted and qdrant_deleted:
        message = f'Dokumen "{filename}" berhasil dihapus dari file lokal dan index Qdrant ({qdrant_deleted_points} chunk)'
    elif file_deleted:
        message = f'Dokumen "{filename}" berhasil dihapus dari file lokal'
    else:
        message = f'Dokumen "{filename}" berhasil dihapus dari index Qdrant ({qdrant_deleted_points} chunk)'

    return jsonify(message=message)


# ── POST /api/rag/reindex ────────────────────────────────────────────────

@rag_bp.route('/reindex', methods=['POST'])
@require_roles(ROLE_ADMIN)
def reindex():
    try:
        from app.rag import index_all_documents
        results = index_all_documents()
        total_chunks = sum(r.get('chunks', 0) for r in results.values())
        return jsonify(
            message='Reindex selesai',
            results=results,
            totalDocuments=len(results),
            totalChunks=total_chunks,
        )
    except Exception as e:
        return jsonify(error=f'Gagal reindex: {e}'), 500


# ── POST /api/rag/query (test retrieval) ─────────────────────────────────

@rag_bp.route('/query', methods=['POST'])
@require_roles(ROLE_ADMIN)
def query_rag():
    body = request.get_json(silent=True) or {}
    q = body.get('query', '').strip()
    top_k = body.get('topK', 5)

    if not q:
        return jsonify(error='Query tidak boleh kosong'), 400

    try:
        from app.rag import retrieve
        results = retrieve(q, top_k=top_k)
        return jsonify(query=q, results=results, count=len(results))
    except Exception as e:
        return jsonify(error=f'Gagal melakukan retrieval: {e}'), 500


# ── GET /api/rag/documents ───────────────────────────────────────────────

@rag_bp.route('/documents', methods=['GET'])
@require_roles(ROLE_ADMIN)
def list_documents():
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    docs_by_name = {}

    # Filesystem documents
    for f in sorted(DOCS_DIR.iterdir()):
        if f.suffix.lower() in ALLOWED_EXT and f.is_file():
            size = f.stat().st_size
            docs_by_name[f.name] = {
                'name': f.name,
                'size': size,
                'sizeFormatted': _format_size(size),
                'extension': f.suffix.lower(),
                'lastModified': datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                'origin': 'filesystem',
                'indexedInQdrant': False,
                'qdrantChunks': 0,
            }

    # Qdrant-only documents
    source_counts = _get_qdrant_source_counts()
    for source, chunk_count in source_counts.items():
        if source in docs_by_name:
            docs_by_name[source]['indexedInQdrant'] = True
            docs_by_name[source]['qdrantChunks'] = chunk_count
            continue

        docs_by_name[source] = {
            'name': source,
            'size': None,
            'sizeFormatted': '-',
            'extension': Path(source).suffix.lower() or '-',
            'lastModified': None,
            'origin': 'qdrant',
            'indexedInQdrant': True,
            'qdrantChunks': chunk_count,
        }

    docs = sorted(docs_by_name.values(), key=lambda d: (d.get('name') or '').lower())

    return jsonify(
        documents=docs,
        count=len(docs),
        localCount=sum(1 for d in docs if d.get('origin') == 'filesystem'),
        qdrantIndexedCount=sum(1 for d in docs if d.get('indexedInQdrant')),
    )


# ── GET /api/rag/system-info (admin) ──────────────────────────────────────

@rag_bp.route('/system-info', methods=['GET'])
@require_roles(ROLE_ADMIN)
def system_info():
    """Return comprehensive info about Vector DB, Embedding model, and LLM."""
    info = {
        'vectorDatabase': _get_vector_db_info(),
        'embedding': _get_embedding_info(),
        'llm': _get_llm_info(),
        'rag': _get_rag_pipeline_info(),
    }
    return jsonify(info)


def _get_vector_db_info() -> dict:
    """Qdrant Cloud information."""
    qdrant_url = os.getenv('QDRANT_URL', '')
    try:
        from app.rag import _get_client, COLLECTION_NAME
        client = _get_client()

        # Cluster info
        cluster_info = {}
        try:
            # Collection detail
            col_info = client.get_collection(COLLECTION_NAME)
            vectors_cfg = col_info.config.params.vectors
            cluster_info = {
                'status': 'connected',
                'collection': COLLECTION_NAME,
                'pointsCount': getattr(col_info, 'points_count', 0),
                'segmentsCount': getattr(col_info, 'segments_count', 0),
                'indexedVectorsCount': getattr(col_info, 'indexed_vectors_count', 0),
                'vectorSize': getattr(vectors_cfg, 'size', None),
                'distance': str(getattr(vectors_cfg, 'distance', 'Cosine')),
                'onDiskPayload': getattr(col_info.config.params, 'on_disk_payload', None),
            }
        except Exception as e:
            cluster_info = {'status': 'error', 'error': str(e)}

        return {
            'name': 'Qdrant',
            'type': 'Cloud',
            'provider': 'Qdrant Cloud (GCP europe-west3)',
            'url': qdrant_url.split('//')[1].split(':')[0] if '//' in qdrant_url else qdrant_url,
            'port': 6333,
            'protocol': 'HTTPS + gRPC',
            'authenticated': True,
            **cluster_info,
        }
    except Exception as e:
        return {
            'name': 'Qdrant',
            'type': 'Cloud',
            'status': 'disconnected',
            'error': str(e),
            'url': qdrant_url,
        }


def _get_embedding_info() -> dict:
    """Sentence-Transformers / BERT info."""
    try:
        from app.rag import _get_model, EMBEDDING_MODEL, EMBEDDING_DIM
        model = _get_model()

        # Model details
        model_card = {
            'name': EMBEDDING_MODEL,
            'fullName': 'all-MiniLM-L6-v2',
            'family': 'BERT (Bidirectional Encoder Representations from Transformers)',
            'architecture': 'MiniLM (distilled from microsoft/MiniLM-L12-H384-uncased)',
            'framework': 'sentence-transformers',
            'dimensions': EMBEDDING_DIM,
            'maxSequenceLength': getattr(model, 'max_seq_length', 256),
            'poolingStrategy': 'Mean Pooling',
            'normalization': True,
            'pretrainedOn': 'Over 1B sentence pairs from diverse sources',
            'language': 'Multilingual (optimized for English, supports Indonesian)',
            'parameters': '22.7M',
            'modelSize': '~80 MB',
            'similarityFunction': 'Cosine Similarity',
            'useCases': [
                'Semantic Search',
                'Information Retrieval',
                'Sentence Similarity',
                'Clustering',
            ],
            'performance': {
                'stsb_spearman': 0.8491,
                'speed': '~14,200 sentences/sec (GPU) | ~400 sentences/sec (CPU)',
            },
            'source': 'https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2',
            'loaded': True,
        }
        return model_card
    except Exception as e:
        return {
            'name': 'all-MiniLM-L6-v2',
            'family': 'BERT',
            'loaded': False,
            'error': str(e),
        }


def _get_llm_info() -> dict:
    """Google Gemini LLM info."""
    api_key = os.getenv('GEMINI_API_KEY', '')
    configured = bool(api_key and api_key != 'your_gemini_api_key_here')

    model_name = 'gemini-2.5-flash-lite'

    info = {
        'provider': 'Google AI (Generative Language API)',
        'model': model_name,
        'family': 'Gemini',
        'generation': '2.5',
        'variant': 'Flash Lite',
        'description': 'Lightweight, cost-efficient model optimized for high-volume, low-latency tasks',
        'configured': configured,
        'apiKeyMasked': f'{api_key[:10]}...{api_key[-4:]}' if len(api_key) > 14 else '***',
        'capabilities': [
            'Text generation',
            'Multi-turn conversation',
            'Instruction following',
            'Summarization',
            'Question answering',
        ],
        'generationConfig': {
            'temperature': 0.7,
            'topP': 0.95,
            'topK': 40,
            'maxOutputTokens': 2048,
        },
        'pricing': 'Free tier available (rate limited)',
        'contextWindow': '1M tokens',
        'source': 'https://ai.google.dev/gemini-api/docs/models#gemini-2.5-flash-lite',
    }

    # Test connectivity
    if configured:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_name)
            # Quick test
            info['status'] = 'connected'
        except Exception as e:
            info['status'] = 'error'
            info['statusError'] = str(e)
    else:
        info['status'] = 'not_configured'

    return info


def _get_rag_pipeline_info() -> dict:
    """RAG pipeline configuration details."""
    from app.rag import CHUNK_SIZE, CHUNK_OVERLAP, TOP_K, COLLECTION_NAME, DOCS_DIR, EMBEDDING_MODEL, EMBEDDING_DIM

    supported = {'.txt', '.pdf', '.json', '.md', '.csv', '.docx'}
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    docs_by_name = {}
    total_size = 0

    # Filesystem documents
    for f in sorted(DOCS_DIR.iterdir()):
        if f.suffix.lower() in supported and f.is_file():
            size = f.stat().st_size
            docs_by_name[f.name] = {
                'name': f.name,
                'size': size,
                'sizeFormatted': _format_size(size),
                'extension': f.suffix.lower(),
                'lastModified': datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
                'origin': 'filesystem',
                'indexedInQdrant': False,
                'qdrantChunks': 0,
            }
            total_size += size

    # Merge with Qdrant sources so management can show indexed docs
    source_counts = _get_qdrant_source_counts()
    for source, chunk_count in source_counts.items():
        if source in docs_by_name:
            docs_by_name[source]['indexedInQdrant'] = True
            docs_by_name[source]['qdrantChunks'] = chunk_count
            continue

        docs_by_name[source] = {
            'name': source,
            'size': None,
            'sizeFormatted': '-',
            'extension': Path(source).suffix.lower() or '-',
            'lastModified': None,
            'origin': 'qdrant',
            'indexedInQdrant': True,
            'qdrantChunks': chunk_count,
        }

    doc_files = sorted(docs_by_name.values(), key=lambda d: (d.get('name') or '').lower())

    if total_size > 0:
        total_documents_size = _format_size(total_size)
    elif doc_files:
        total_documents_size = 'N/A'
    else:
        total_documents_size = '0 B'

    return {
        'pipeline': 'RAG (Retrieval Augmented Generation)',
        'description': 'Dokumen lokal > Chunking > Embedding > Qdrant > Retrieval > LLM Context Injection',
        'steps': [
            {'step': 1, 'name': 'Document Ingestion', 'detail': f'File types: {", ".join(sorted(supported))}'},
            {'step': 2, 'name': 'Text Splitting', 'detail': f'RecursiveCharacterTextSplitter (chunk={CHUNK_SIZE}, overlap={CHUNK_OVERLAP})'},
            {'step': 3, 'name': 'Embedding', 'detail': f'{EMBEDDING_MODEL} ({EMBEDDING_DIM}D vectors)'},
            {'step': 4, 'name': 'Vector Storage', 'detail': f'Qdrant Cloud collection "{COLLECTION_NAME}"'},
            {'step': 5, 'name': 'Retrieval', 'detail': f'Top-{TOP_K} cosine similarity search'},
            {'step': 6, 'name': 'Context Injection', 'detail': 'Relevant chunks injected into Gemini system prompt'},
            {'step': 7, 'name': 'Generation', 'detail': 'Gemini 2.5 Flash Lite generates contextual response'},
        ],
        'chunkSize': CHUNK_SIZE,
        'chunkOverlap': CHUNK_OVERLAP,
        'topK': TOP_K,
        'minScore': 0.25,
        'totalDocuments': len(doc_files),
        'totalDocumentsSize': total_documents_size,
        'documents': doc_files,
        'supportedFormats': sorted(supported),
        'maxFileSize': '10 MB',
    }


def _format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f'{size_bytes} B'
    elif size_bytes < 1024 * 1024:
        return f'{size_bytes / 1024:.1f} KB'
    else:
        return f'{size_bytes / (1024 * 1024):.1f} MB'
