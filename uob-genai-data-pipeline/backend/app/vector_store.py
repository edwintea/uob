import hashlib
import math
import os
from typing import Any, Dict, List, Optional
import chromadb
import ollama

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "/app/data/chroma")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
COLLECTION_NAME = "genai_rag_chunks"

os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
_chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
_ollama_client = ollama.Client(host=OLLAMA_BASE_URL)


def get_collection():
    return _chroma_client.get_or_create_collection(name=COLLECTION_NAME)


def _fallback_embedding(text: str, dim: int = 384) -> List[float]:
    """Fallback vektor deterministik jika server/model Ollama belum tersedia."""
    vec = [0.0] * dim
    tokens = text.lower().split() or ["empty"]
    for idx, tok in enumerate(tokens):
        digest = hashlib.sha256(f"{idx}:{tok}".encode("utf-8")).digest()
        bucket = int.from_bytes(digest[:4], "big") % dim
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vec[bucket] += sign * (1.0 + (digest[5] / 255.0))
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def embed_texts(texts: List[str]) -> tuple[List[List[float]], str]:
    """Menghasilkan vector embedding via Ollama; otomatis fallback bila Ollama offline."""
    if not texts:
        return [], "none"
    try:
        resp = _ollama_client.embed(model=EMBED_MODEL, input=texts)
        embeddings = resp.get("embeddings") or []
        if len(embeddings) == len(texts) and len(embeddings[0]) > 0:
            return embeddings, f"ollama:{EMBED_MODEL}"
    except Exception:
        pass

    return [_fallback_embedding(t) for t in texts], "local-hash-fallback"


def upsert_chunks_to_vectordb(job_id: str, chunks: List[Dict[str, Any]]) -> dict:
    """Menghapus chunk lama milik job_id (jika re-run) lalu menyimpan embedding baru ke ChromaDB."""
    collection = get_collection()

    existing = collection.get(where={"job_id": job_id})
    if existing and existing.get("ids"):
        collection.delete(ids=existing["ids"])

    if not chunks:
        return {"indexed_count": 0, "embedding_provider": "none", "vector_dim": 0}

    texts = [c["text"] for c in chunks]
    embeddings, provider = embed_texts(texts)

    ids = [c["chunk_id"] for c in chunks]
    metadatas = [
        {
            "job_id": c["job_id"],
            "document_title": c["document_title"],
            "domain": c["domain"],
            "source_system": c["source_system"],
            "target_system": c["metadata"].get("target_system", "GENAI_RAG_STORE"),
            "source_type": c["metadata"].get("source_type", "POLICY_DOC"),
            "chunk_index": int(c["chunk_index"]),
            "word_count": int(c["metadata"].get("word_count", 0)),
            "dq_score": float(c["metadata"].get("dq_score", 0.0)),
        }
        for c in chunks
    ]

    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )

    return {
        "indexed_count": len(ids),
        "embedding_provider": provider,
        "vector_dim": len(embeddings[0]) if embeddings else 0,
    }


def search_vectors(
    query: str,
    top_k: int = 3,
    domain: Optional[str] = None,
    job_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Mencari chunk paling relevan di ChromaDB berdasarkan kemiripan vektor + filter metadata."""
    collection = get_collection()
    if collection.count() == 0:
        return []

    query_vecs, _ = embed_texts([query])
    where_clauses = []
    if domain and domain != "ALL":
        where_clauses.append({"domain": domain})
    if job_id:
        where_clauses.append({"job_id": job_id})

    where_filter = None
    if len(where_clauses) == 1:
        where_filter = where_clauses[0]
    elif len(where_clauses) > 1:
        where_filter = {"$and": where_clauses}

    res = collection.query(
        query_embeddings=query_vecs,
        n_results=top_k,
        where=where_filter,
    )

    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    ids = (res.get("ids") or [[]])[0]
    distances = (res.get("distances") or [[]])[0]

    matches = []
    for cid, doc, meta, dist in zip(ids, docs, metas, distances):
        matches.append(
            {
                "chunk_id": cid,
                "text": doc,
                "distance": round(float(dist), 4),
                "metadata": meta,
            }
        )
    return matches