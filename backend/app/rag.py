"""RAG (Retrieval Augmented Generation) service.

Uses:
- Qdrant Cloud for vector storage
- sentence-transformers all-MiniLM-L6-v2 (384 dimensions) for embeddings
- RecursiveCharacterTextSplitter (500 chars, 50 overlap)
- Cosine similarity for retrieval
"""

import os
import json
import hashlib
import uuid
from pathlib import Path
from typing import List, Optional

from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue,
)

# ── Config ────────────────────────────────────────────────────────────────

COLLECTION_NAME = 'puskesbot_docs'
EMBEDDING_MODEL = 'all-MiniLM-L6-v2'
EMBEDDING_DIM = 384
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 100
TOP_K = 5
TOP_K_COMPREHENSIVE = 20  # For queries requesting complete/all data

DATA_DIR = Path(__file__).resolve().parent.parent / 'data'
DOCS_DIR = DATA_DIR / 'documents'

# ── Lazy singletons ──────────────────────────────────────────────────────

_model: Optional[SentenceTransformer] = None
_client: Optional[QdrantClient] = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def _get_client() -> QdrantClient:
    global _client
    if _client is None:
        qdrant_url = os.getenv('QDRANT_URL', '')
        qdrant_key = os.getenv('QDRANT_API_KEY', '')
        if qdrant_url and qdrant_key:
            _client = QdrantClient(url=qdrant_url, api_key=qdrant_key)
        else:
            raise RuntimeError('QDRANT_URL dan QDRANT_API_KEY belum dikonfigurasi di .env')
        _ensure_collection(_client)
    return _client


def _ensure_collection(client: QdrantClient):
    collections = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in collections:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=EMBEDDING_DIM, distance=Distance.COSINE),
        )
    # Ensure payload index on 'source' for efficient filtering
    try:
        from qdrant_client.models import PayloadSchemaType
        client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name='source',
            field_schema=PayloadSchemaType.KEYWORD,
        )
    except Exception:
        pass  # Index may already exist


# ── Text splitting ────────────────────────────────────────────────────────

def _split_text(text: str, chunk_size: int = CHUNK_SIZE,
                overlap: int = CHUNK_OVERLAP) -> List[str]:
    """RecursiveCharacterTextSplitter-style splitting."""
    separators = ['\n\n', '\n', '. ', ', ', ' ', '']
    chunks = []
    _recursive_split(text, separators, chunk_size, overlap, chunks)
    return [c.strip() for c in chunks if c.strip()]


def _recursive_split(text: str, separators: List[str],
                     chunk_size: int, overlap: int,
                     result: List[str]):
    if len(text) <= chunk_size:
        result.append(text)
        return

    sep = separators[0] if separators else ''
    next_seps = separators[1:] if len(separators) > 1 else ['']

    if sep == '':
        # character-level split
        for i in range(0, len(text), chunk_size - overlap):
            result.append(text[i:i + chunk_size])
        return

    parts = text.split(sep)
    current = ''
    for part in parts:
        candidate = (current + sep + part) if current else part
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                result.append(current)
            if len(part) > chunk_size:
                _recursive_split(part, next_seps, chunk_size, overlap, result)
                current = ''
            else:
                current = part
    if current:
        result.append(current)


# ── File readers ──────────────────────────────────────────────────────────

def _read_file(filepath: Path) -> str:
    suffix = filepath.suffix.lower()
    if suffix == '.pdf':
        return _read_pdf(filepath)
    elif suffix == '.json':
        return _read_json(filepath)
    elif suffix == '.docx':
        return _read_docx(filepath)
    else:
        return filepath.read_text(encoding='utf-8', errors='ignore')


def _read_pdf(filepath: Path) -> str:
    try:
        import PyPDF2
        text_parts = []
        with open(filepath, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return '\n'.join(text_parts)
    except ImportError:
        return ''


def _read_json(filepath: Path) -> str:
    data = json.loads(filepath.read_text(encoding='utf-8'))
    if isinstance(data, list):
        parts = []
        for item in data:
            if isinstance(item, dict):
                parts.append(' '.join(str(v) for v in item.values()))
            else:
                parts.append(str(item))
        return '\n'.join(parts)
    elif isinstance(data, dict):
        return ' '.join(str(v) for v in data.values())
    return str(data)


def _read_docx(filepath: Path) -> str:
    try:
        from docx import Document
        doc = Document(str(filepath))
        return '\n\n'.join(p.text for p in doc.paragraphs if p.text.strip())
    except ImportError:
        return ''


# ── Indexing ──────────────────────────────────────────────────────────────

def _file_hash(filepath: Path) -> str:
    return hashlib.md5(filepath.read_bytes()).hexdigest()


def index_document(filepath: Path, source_name: str = None) -> int:
    """Index a single document file. Returns number of chunks indexed."""
    client = _get_client()
    model = _get_model()

    text = _read_file(filepath)
    if not text.strip():
        return 0

    source = source_name or filepath.name
    file_md5 = _file_hash(filepath)

    # Remove old points from the same source
    try:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[FieldCondition(key='source', match=MatchValue(value=source))]
            ),
        )
    except Exception:
        pass

    chunks = _split_text(text)
    if not chunks:
        return 0

    embeddings = model.encode(chunks, show_progress_bar=False).tolist()

    points = []
    for i, (chunk, vec) in enumerate(zip(chunks, embeddings)):
        points.append(PointStruct(
            id=str(uuid.uuid4()),
            vector=vec,
            payload={
                'text': chunk,
                'source': source,
                'file_hash': file_md5,
                'chunk_index': i,
            },
        ))

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    return len(points)


def index_all_documents() -> dict:
    """Scan data/documents/ and index all supported files.
    Returns summary dict.
    """
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    supported = {'.txt', '.pdf', '.json', '.md', '.csv', '.docx'}
    results = {}

    for filepath in sorted(DOCS_DIR.iterdir()):
        if filepath.suffix.lower() in supported and filepath.is_file():
            try:
                count = index_document(filepath)
                results[filepath.name] = {'chunks': count, 'status': 'ok'}
            except Exception as e:
                results[filepath.name] = {'chunks': 0, 'status': f'error: {e}'}

    return results


# ── Query analysis ────────────────────────────────────────────────────────

_COMPREHENSIVE_KEYWORDS = [
    # Exhaustive-list triggers
    'semua', 'seluruh', 'sebutkan semua', 'daftar lengkap', 'daftar semua',
    'tampilkan semua', 'berikan semua', 'list semua', 'ada berapa',
    'berapa banyak', 'berapa jumlah', 'total', 'keseluruhan',
    'sebutkan daftar', 'lengkap', 'semuanya', 'masing-masing',
    'satu per satu', 'secara lengkap',
    # Step-by-step / procedural triggers
    'langkah', 'langkah-langkah', 'tahapan', 'tahap-tahap', 'tahap demi tahap',
    'alur', 'prosedur', 'proses', 'cara mendaftar', 'cara daftar',
    'bagaimana cara', 'urutan', 'step', 'skenario',
    'panduan', 'petunjuk', 'tutorial', 'tata cara',
    # Structure / personnel triggers
    'struktur', 'susunan', 'organisasi', 'anggota',
    'jadwal', 'daftar jadwal', 'jam layanan', 'jam operasional',
]


def _is_comprehensive_query(query_text: str) -> bool:
    """Detect if the user is asking for a complete/exhaustive list.

    Examples: 'sebutkan semua rumah sakit', 'daftar lengkap dokter',
    'ada berapa rumah sakit rujukan', etc.
    """
    q = query_text.lower().strip()
    return any(kw in q for kw in _COMPREHENSIVE_KEYWORDS)

# ── Query enrichment for Indonesian ───────────────────────────────────────

# Maps Indonesian keywords to related terms that help the embedding model
# find better matches (since all-MiniLM-L6-v2 is English-optimized).
_QUERY_ENRICHMENT = {
    'jadwal': 'jadwal schedule waktu jam hari tanggal',
    'perawat': 'perawat nurse tenaga medis dinas shift',
    'dokter': 'dokter doctor tenaga medis spesialis',
    'rumah sakit': 'rumah sakit hospital RS rujukan',
    'rujukan': 'rujukan referral rumah sakit RS',
    'pendaftaran': 'pendaftaran registrasi daftar alur langkah prosedur',
    'alur': 'alur tahapan langkah prosedur proses skenario',
    'langkah': 'langkah tahapan alur prosedur step',
    'layanan': 'layanan pelayanan service kesehatan',
    'gizi': 'gizi nutrisi edukasi makanan diet piringku',
    'posyandu': 'posyandu balita imunisasi bayi',
    'promosi': 'promosi kesehatan edukasi program',
    'struktur': 'struktur organisasi petugas tenaga medis kepala',
    'visi': 'visi misi identitas puskesmas',
    'misi': 'visi misi identitas puskesmas',
    'operasional': 'operasional jam buka pelayanan jadwal',
    'jkn': 'jkn jaminan kesehatan bpjs asuransi',
    'bpjs': 'bpjs jkn jaminan kesehatan asuransi',
    'developer': 'developer pembuat programmer skripsi peneliti',
    'pembuat': 'pembuat developer programmer skripsi peneliti',
    'penyakit': 'penyakit sakit gejala penyebab pencegahan',
    'tipe': 'tipe jenis kategori kelompok klasifikasi',
}


def _enrich_query(query_text: str) -> str:
    """Enrich an Indonesian query with related terms to improve embedding match.

    Since all-MiniLM-L6-v2 is English-optimized, adding English equivalents
    and related Indonesian terms helps the model find better vector matches.
    """
    q_lower = query_text.lower()
    extras = set()
    for keyword, expansion in _QUERY_ENRICHMENT.items():
        if keyword in q_lower:
            extras.update(expansion.split())
    if not extras:
        return query_text
    # Remove words already in the query to avoid redundancy
    existing = set(q_lower.split())
    new_terms = extras - existing
    if not new_terms:
        return query_text
    return f'{query_text} {" ".join(sorted(new_terms))}'


# ── Retrieval ─────────────────────────────────────────────────────────────

def retrieve(query_text: str, top_k: int = TOP_K) -> List[dict]:
    """Retrieve the most relevant chunks for a query.

    Strategy:
    1. Query enrichment for Indonesian → English terms
    2. Multi-query: encode original + enriched, merge by best score
    3. Source-name boosting: if the source filename contains query keywords,
       boost its score so the most relevant document rises to the top.
    """
    client = _get_client()
    model = _get_model()

    enriched = _enrich_query(query_text)

    # Encode both original and enriched queries
    queries_to_run = [query_text]
    if enriched != query_text:
        queries_to_run.append(enriched)

    # Fetch more candidates than needed for re-ranking
    fetch_limit = max(top_k * 2, 15)

    best_by_id: dict[str, dict] = {}

    for q in queries_to_run:
        query_vec = model.encode(q, show_progress_bar=False).tolist()
        response = client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vec,
            limit=fetch_limit,
        )
        for point in response.points:
            pid = str(point.id)
            score = round(point.score, 4)
            if pid not in best_by_id or score > best_by_id[pid]['score']:
                best_by_id[pid] = {
                    'text': point.payload.get('text', ''),
                    'source': point.payload.get('source', ''),
                    'score': score,
                    'chunk_index': point.payload.get('chunk_index', 0),
                }

    # ── Source-name boosting ──────────────────────────────────────────
    # Boost results whose source filename matches query keywords.
    # e.g. query "jadwal perawat" → source "JADWAL_PERAWAT_xxx.txt" gets boosted.
    query_words = set(query_text.lower().split())
    # Remove common stop words that would match too broadly
    stop_words = {'di', 'ke', 'dan', 'yang', 'apa', 'saya', 'berikan',
                  'mau', 'ingin', 'tolong', 'bisa', 'ada', 'dari',
                  'untuk', 'dengan', 'ini', 'itu', 'puskesmas', 'wori'}
    meaningful_words = query_words - stop_words

    if meaningful_words:
        total_words = len(meaningful_words)
        for pid, entry in best_by_id.items():
            source_lower = entry['source'].lower().replace('_', ' ').replace('.txt', '')
            # Count how many query words appear in the source filename
            match_count = sum(1 for w in meaningful_words if w in source_lower)
            if match_count > 0:
                # Boost based on match ratio SQUARED for sharp discrimination.
                # 100% match → ratio² = 1.0 → boost +0.55
                #  50% match → ratio² = 0.25 → boost +0.14
                #  33% match → ratio² = 0.11 → boost +0.06
                # Squaring ensures partial matches get much less boost.
                match_ratio = match_count / total_words
                boost = round(match_ratio * match_ratio * 0.55, 4)
                entry['score'] = round(entry['score'] + boost, 4)

    # Sort by boosted score descending and return top_k
    results = sorted(best_by_id.values(), key=lambda x: x['score'], reverse=True)
    return results[:top_k]


def _fetch_all_chunks_by_source(source_name: str) -> List[dict]:
    """Fetch ALL chunks belonging to a specific source document from Qdrant.

    This ensures we get complete data when a document is split across
    multiple chunks (e.g. a list of 16 hospitals split into 3 chunks).

    Uses manual scroll + payload match (no scroll_filter) to work
    regardless of whether a payload index exists on 'source'.
    """
    client = _get_client()
    all_chunks = []
    seen_texts = set()
    offset = None

    for _ in range(200):  # safety bound
        scroll_resp = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=256,
            offset=offset,
            with_payload=True,
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
                text = payload.get('text', '')
                # Deduplicate by text content (some chunks appear twice)
                text_key = text.strip()[:120]
                if text_key and text_key not in seen_texts:
                    seen_texts.add(text_key)
                    all_chunks.append({
                        'text': text,
                        'source': payload.get('source', ''),
                        'score': 1.0,  # source-matched, full relevance
                        'chunk_index': payload.get('chunk_index', 0),
                    })

        if offset is None:
            break

    # Sort by chunk_index to preserve original document order
    all_chunks.sort(key=lambda c: c.get('chunk_index', 0))
    return all_chunks


def build_rag_context(query_text: str, top_k: int = TOP_K,
                      min_score: float = 0.35) -> str:
    """Build a context string from retrieved chunks for injection into prompt.

    Strategy:
    1. Retrieve top-K similar chunks via cosine similarity
    2. For EVERY relevant source document found in the results, fetch ALL
       chunks belonging to that source.  This guarantees completeness –
       numbered lists and step-by-step procedures are never truncated.
    3. For comprehensive queries the initial retrieval uses a higher top_k
       to cast a wider net.
    """
    is_comprehensive = _is_comprehensive_query(query_text)

    # Use higher top_k for comprehensive queries
    effective_top_k = TOP_K_COMPREHENSIVE if is_comprehensive else top_k
    hits = retrieve(query_text, effective_top_k)
    relevant = [h for h in hits if h['score'] >= min_score]

    if not relevant:
        return ''

    # ── Always complete source documents ──────────────────────────────
    # Even for normal (non-comprehensive) queries, we fetch ALL chunks
    # from every relevant source so the AI receives the full document.
    source_scores: dict[str, float] = {}
    for h in relevant:
        src = h['source']
        if src not in source_scores or h['score'] > source_scores[src]:
            source_scores[src] = h['score']

    completed_chunks: list[dict] = []
    seen_texts: set[str] = set()

    # Minimum score to qualify a source for full-document fetch
    source_threshold = 0.30 if is_comprehensive else 0.40

    for source, best_score in source_scores.items():
        if best_score >= source_threshold:
            all_src_chunks = _fetch_all_chunks_by_source(source)
            for chunk in all_src_chunks:
                text_key = chunk['text'].strip()[:100]
                if text_key not in seen_texts:
                    seen_texts.add(text_key)
                    chunk['score'] = best_score
                    completed_chunks.append(chunk)

    # Keep hits from sources below the threshold (they still passed min_score)
    for h in relevant:
        text_key = h['text'].strip()[:100]
        if text_key not in seen_texts:
            seen_texts.add(text_key)
            completed_chunks.append(h)

    parts = []
    for i, h in enumerate(completed_chunks, 1):
        parts.append(f'[Sumber: {h["source"]}, Relevansi: {h["score"]}]\n{h["text"]}')

    return '\n\n---\n\n'.join(parts)


# ── Status ────────────────────────────────────────────────────────────────

def get_rag_status() -> dict:
    """Return RAG system status and statistics."""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    supported = {'.txt', '.pdf', '.json', '.md', '.csv', '.docx'}
    doc_files = [f.name for f in DOCS_DIR.iterdir()
                 if f.suffix.lower() in supported and f.is_file()]

    try:
        client = _get_client()
        info = client.get_collection(COLLECTION_NAME)
        points_count = info.points_count
        indexed = True
    except Exception:
        points_count = 0
        indexed = False

    return {
        'enabled': True,
        'indexed': indexed,
        'totalChunks': points_count,
        'totalDocuments': len(doc_files),
        'documents': doc_files,
        'embeddingModel': EMBEDDING_MODEL,
        'embeddingDim': EMBEDDING_DIM,
        'chunkSize': CHUNK_SIZE,
        'chunkOverlap': CHUNK_OVERLAP,
        'topK': TOP_K,
        'similarity': 'cosine',
    }
