from typing import Literal, Optional, List, Dict, Any
from pydantic import BaseModel, Field


SourceType = Literal["API_FEED", "SFTP_BATCH_FILE", "POLICY_DOC"]
DomainTag = Literal["OPERATIONS_SOP", "PRODUCT_GUIDE", "INCIDENT_RUNBOOK", "TRADE_COMPLIANCE"]


class IngestRequest(BaseModel):
    source_system: str = Field(..., min_length=2, example="CORE_DOC_REPO")
    target_system: str = Field(default="GENAI_RAG_STORE")
    source_type: SourceType = "POLICY_DOC"
    domain: DomainTag = "OPERATIONS_SOP"
    document_title: str = Field(..., min_length=3, example="FX Settlement Exception Handling SOP")
    raw_content: str = Field(..., min_length=10)
    records_expected: int = Field(default=1, ge=1)
    chunk_size: int = Field(default=350, ge=100, le=1500)
    overlap: int = Field(default=50, ge=0, le=300)


class JobSummary(BaseModel):
    job_id: str
    celery_task_id: Optional[str] = None
    source_system: str
    target_system: str
    source_type: SourceType
    domain: DomainTag
    document_title: str
    status: Literal["QUEUED", "RUNNING", "COMPLETED", "FAILED"]
    stage: str
    records_expected: int
    records_processed: int
    dq_score: float
    chunks_created: int
    error_message: Optional[str] = None
    created_at: str
    updated_at: str


class RagChunk(BaseModel):
    chunk_id: str
    job_id: str
    document_title: str
    domain: DomainTag
    source_system: str
    chunk_index: int
    text: str
    metadata: Dict[str, Any]


class PipelineOverview(BaseModel):
    total_jobs: int
    completed_jobs: int
    running_or_queued_jobs: int
    failed_jobs: int
    total_rag_chunks: int
    avg_dq_score: float
    jobs: List[JobSummary]
