import os
import uuid
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.schemas import (
    IngestRequest,
    IngestResponse,
    JobSummary,
    PipelineOverview,
    RagChunk,
    VectorSearchResult,
)
from app.store import get_job, list_chunks, list_jobs, now_iso, upsert_job
from app.tasks import ingest_and_prepare_rag
from app.vector_store import search_vectors

app = FastAPI(
    title="Enterprise GenAI Data Integration & Preparation API",
    version="1.0.0",
)

cors_origins_env = os.getenv(
    "CORS_ALLOW_ORIGINS",
    "http://localhost:30080,http://127.0.0.1:30080,http://localhost:5173,http://127.0.0.1:5173",
)
allow_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": now_iso()}


@app.post("/api/ingest", status_code=202)
def trigger_ingestion(req: IngestRequest):
    job_id = f"job-{uuid.uuid4().hex[:8]}"
    created = now_iso()

    job_record = {
        "job_id": job_id,
        "celery_task_id": None,
        "source_system": req.source_system,
        "target_system": req.target_system,
        "source_type": req.source_type,
        "domain": req.domain,
        "document_title": req.document_title,
        "status": "QUEUED",
        "stage": "Queued in Celery Broker",
        "records_expected": req.records_expected,
        "records_processed": 0,
        "dq_score": 0.0,
        "chunks_created": 0,
        "error_message": None,
        "created_at": created,
        "updated_at": created,
    }
    upsert_job(job_id, job_record)

    async_result = ingest_and_prepare_rag.delay(job_id, req.model_dump())
    upsert_job(job_id, {"celery_task_id": async_result.id})

    return {
        "message": "Ingestion job dispatched to Celery queue.",
        "job_id": job_id,
        "celery_task_id": async_result.id,
        "status": "QUEUED",
    }


@app.get("/api/overview", response_model=PipelineOverview)
def get_overview():
    jobs = list_jobs()
    chunks = list_chunks()

    completed = sum(1 for j in jobs if j.get("status") == "COMPLETED")
    failed = sum(1 for j in jobs if j.get("status") == "FAILED")
    active = sum(1 for j in jobs if j.get("status") in ("QUEUED", "RUNNING"))

    scores = [float(j.get("dq_score", 0.0)) for j in jobs if j.get("status") == "COMPLETED"]
    avg_dq = round(sum(scores) / len(scores), 1) if scores else 0.0

    return PipelineOverview(
        total_jobs=len(jobs),
        completed_jobs=completed,
        running_or_queued_jobs=active,
        failed_jobs=failed,
        total_rag_chunks=len(chunks),
        avg_dq_score=avg_dq,
        jobs=jobs,
    )


@app.get("/api/jobs/{job_id}")
def get_job_detail(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/api/chunks", response_model=list[RagChunk])
def get_rag_chunks(job_id: Optional[str] = None, domain: Optional[str] = None):
    return list_chunks(job_id=job_id, domain=domain)


@app.get(
    "/api/search",
    response_model=list[VectorSearchResult],
    tags=["RAG Chunks"],
    summary="Pencarian semantik di Vector DB (ChromaDB)",
    description="Melakukan query embedding dan mengambil chunk paling mirip dari ChromaDB beserta skor jarak (distance) dan metadata.",
)
def search_rag_vectors(
    q: str = Query(
        ...,
        min_length=2,
        description="Kata kunci atau pertanyaan untuk dicari kemiripan semantiknya.",
    ),
    top_k: int = Query(
        default=3,
        ge=1,
        le=10,
        description="Jumlah chunk teratas yang dikembalikan.",
    ),
    domain: Optional[str] = Query(default=None, description="Filter domain opsional."),
    job_id: Optional[str] = Query(default=None, description="Filter job_id opsional."),
):
    return search_vectors(query=q, top_k=top_k, domain=domain, job_id=job_id)