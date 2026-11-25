export type SourceType = "API_FEED" | "SFTP_BATCH_FILE" | "POLICY_DOC";
export type DomainTag =
    | "OPERATIONS_SOP"
    | "PRODUCT_GUIDE"
    | "INCIDENT_RUNBOOK"
    | "TRADE_COMPLIANCE";

export interface IngestPayload {
    source_system: string;
    target_system: string;
    source_type: SourceType;
    domain: DomainTag;
    document_title: string;
    raw_content: string;
    records_expected: number;
    chunk_size: number;
    overlap: number;
}

export interface JobSummary {
    job_id: string;
    celery_task_id: string | null;
    source_system: string;
    target_system: string;
    source_type: SourceType;
    domain: DomainTag;
    document_title: string;
    status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
    stage: string;
    records_expected: number;
    records_processed: number;
    dq_score: number;
    chunks_created: number;
    error_message: string | null;
    created_at: string;
    updated_at: string;
}

export interface PipelineOverview {
    total_jobs: number;
    completed_jobs: number;
    running_or_queued_jobs: number;
    failed_jobs: number;
    total_rag_chunks: number;
    avg_dq_score: number;
    jobs: JobSummary[];
}

export interface RagChunk {
    chunk_id: string;
    job_id: string;
    document_title: string;
    domain: DomainTag;
    source_system: string;
    chunk_index: number;
    text: string;
    metadata: {
        target_system: string;
        source_type: string;
        word_count: number;
        dq_score: number;
        rag_ready: boolean;
    };
}
