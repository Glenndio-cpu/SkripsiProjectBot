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
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
TOP_K = 5

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


# ── Retrieval ─────────────────────────────────────────────────────────────

def retrieve(query_text: str, top_k: int = TOP_K) -> List[dict]:
    """Retrieve the most relevant chunks for a query."""
    client = _get_client()
    model = _get_model()

    query_vec = model.encode(query_text, show_progress_bar=False).tolist()

    response = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vec,
        limit=top_k,
    )

    results = []
    for point in response.points:
        results.append({
            'text': point.payload.get('text', ''),
            'source': point.payload.get('source', ''),
            'score': round(point.score, 4),
        })

    return results


def build_rag_context(query_text: str, top_k: int = TOP_K,
                      min_score: float = 0.25) -> str:
    """Build a context string from retrieved chunks for injection into prompt."""
    hits = retrieve(query_text, top_k)
    relevant = [h for h in hits if h['score'] >= min_score]

    if not relevant:
        return ''

    parts = []
    for i, h in enumerate(relevant, 1):
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
