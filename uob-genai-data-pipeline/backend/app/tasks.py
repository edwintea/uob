import re
import time
import uuid
from typing import List
from celery import shared_task
from app.store import upsert_job, replace_job_chunks


def _normalize_text(raw: str) -> str:
    cleaned = re.sub(r"\r\n", "\n", raw)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    words = text.split()
    if not words:
        return []
    step = max(1, chunk_size - overlap)
    chunks = []
    for start in range(0, len(words), step):
        piece = " ".join(words[start : start + chunk_size]).strip()
        if piece:
            chunks.append(piece)
        if start + chunk_size >= len(words):
            break
    return chunks


def _compute_dq_score(normalized: str, records_expected: int, chunks_count: int) -> tuple[float, int]:
    # Simulasi validasi kualitas data: kelengkapan konten, non-empty, dan rekonsiliasi record
    has_content = 1.0 if len(normalized) >= 20 else 0.5
    has_chunks = 1.0 if chunks_count > 0 else 0.0
    records_processed = max(1, min(records_expected, chunks_count if chunks_count > 0 else 1))
    reconciliation_ratio = min(1.0, records_processed / max(1, records_expected))
    score = round(((has_content * 0.35) + (has_chunks * 0.35) + (reconciliation_ratio * 0.30)) * 100, 1)
    return score, records_processed


@shared_task(bind=True, name="pipeline.ingest_and_prepare_rag")
def ingest_and_prepare_rag(self, job_id: str, payload: dict):
    try:
        upsert_job(
            job_id,
            {
                "celery_task_id": self.request.id,
                "status": "RUNNING",
                "stage": "1/4 Extracting & Normalizing Upstream Payload",
            },
        )
        time.sleep(1.2)

        normalized = _normalize_text(payload["raw_content"])
        if not normalized:
            raise ValueError("Konten kosong setelah normalisasi.")

        upsert_job(
            job_id,
            {
                "stage": "2/4 Running Data Quality & Schema Checks",
            },
        )
        time.sleep(1.2)

        chunk_size = int(payload.get("chunk_size", 350))
        overlap = int(payload.get("overlap", 50))
        raw_chunks = _chunk_text(normalized, chunk_size=chunk_size, overlap=overlap)

        dq_score, records_processed = _compute_dq_score(
            normalized=normalized,
            records_expected=int(payload.get("records_expected", 1)),
            chunks_count=len(raw_chunks),
        )

        upsert_job(
            job_id,
            {
                "stage": "3/4 Enriching Metadata & Chunking for RAG",
                "dq_score": dq_score,
                "records_processed": records_processed,
            },
        )
        time.sleep(1.2)

        enriched_chunks = []
        for idx, text_piece in enumerate(raw_chunks):
            enriched_chunks.append(
                {
                    "chunk_id": f"chk-{uuid.uuid4().hex[:8]}",
                    "job_id": job_id,
                    "document_title": payload["document_title"],
                    "domain": payload["domain"],
                    "source_system": payload["source_system"],
                    "chunk_index": idx,
                    "text": text_piece,
                    "metadata": {
                        "target_system": payload.get("target_system", "GENAI_RAG_STORE"),
                        "source_type": payload["source_type"],
                        "word_count": len(text_piece.split()),
                        "dq_score": dq_score,
                        "rag_ready": True,
                    },
                }
            )

        upsert_job(
            job_id,
            {
                "stage": "4/4 Reconciling & Persisting RAG Chunks",
            },
        )
        replace_job_chunks(job_id, enriched_chunks)
        time.sleep(0.8)

        upsert_job(
            job_id,
            {
                "status": "COMPLETED",
                "stage": "COMPLETED - Ready for Downstream RAG / Retrieval",
                "chunks_created": len(enriched_chunks),
                "records_processed": records_processed,
                "dq_score": dq_score,
                "error_message": None,
            },
        )
        return {"job_id": job_id, "chunks_created": len(enriched_chunks), "dq_score": dq_score}

    except Exception as exc:
        upsert_job(
            job_id,
            {
                "status": "FAILED",
                "stage": "FAILED during processing",
                "error_message": str(exc),
            },
        )
        raise
