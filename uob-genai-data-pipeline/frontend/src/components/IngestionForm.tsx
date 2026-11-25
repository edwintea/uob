import React, { useState } from "react";
import { DomainTag, IngestPayload, SourceType } from "../types";

interface Props {
    onSubmitted: (jobId: string) => void;
}

const SAMPLE_DOC = `Enterprise Operations & Incident Escalation Runbook
1. Purpose: Standardize data ingestion, validation, and exception handling across upstream operational feeds and downstream GenAI knowledge retrieval workflows.
2. Data Contract & Reconciliation: Every batch or API payload must include source_system, domain tag, timestamp, and expected record count. Any mismatch above 5% flags a reconciliation warning for operational review.
3. Incident Triage: When an upstream feed delays or fails schema validation, isolate the affected batch, preserve raw payload metadata for root cause analysis, notify application and data platform owners, and avoid partial silent writes into downstream search/RAG indexes.
4. RAG Readiness: Normalize whitespace, enrich chunks with source provenance and domain metadata, and verify chunk boundaries before indexing.`;

export const IngestionForm: React.FC<Props> = ({ onSubmitted }) => {
    const [sourceSystem, setSourceSystem] = useState("GTO_KNOWLEDGE_HUB");
    const [targetSystem, setTargetSystem] = useState("GENAI_RAG_INDEX");
    const [sourceType, setSourceType] = useState<SourceType>("POLICY_DOC");
    const [domain, setDomain] = useState<DomainTag>("INCIDENT_RUNBOOK");
    const [documentTitle, setDocumentTitle] = useState(
        "Data Integration & Incident Triage SOP v1.2"
    );
    const [rawContent, setRawContent] = useState(SAMPLE_DOC);
    const [recordsExpected, setRecordsExpected] = useState(3);
    const [chunkSize, setChunkSize] = useState(60);
    const [overlap, setOverlap] = useState(10);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        setDocumentTitle(file.name);
        setRawContent(text);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback(null);

        const payload: IngestPayload = {
            source_system: sourceSystem,
            target_system: targetSystem,
            source_type: sourceType,
            domain,
            document_title: documentTitle,
            raw_content: rawContent,
            records_expected: recordsExpected,
            chunk_size: chunkSize,
            overlap,
        };

        try {
            const res = await fetch("http://localhost:8000/api/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to dispatch ingestion job");
            }
            const data = await res.json();
            setFeedback(`Dispatched ${data.job_id} (Celery Task: ${data.celery_task_id})`);
            onSubmitted(data.job_id);
        } catch (err) {
            setFeedback(err instanceof Error ? err.message : "Unexpected error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={styles.card}>
            <div style={styles.headerRow}>
                <div>
                    <h2 style={styles.title}>1. Upstream Ingestion & Data Contract</h2>
                    <p style={styles.subtitle}>
                        Define source/target mapping, data quality parameters, and dispatch async Celery prep jobs.
                    </p>
                </div>
                <label style={styles.uploadBtn}>
                    Load .txt / .md / .json
                    <input
                        type="file"
                        accept=".txt,.md,.json,.csv,.log"
                        onChange={handleFileUpload}
                        style={{ display: "none" }}
                    />
                </label>
            </div>

            <div style={styles.grid2}>
                <label style={styles.label}>
                    Source System (Upstream)
                    <input
                        style={styles.input}
                        value={sourceSystem}
                        onChange={(e) => setSourceSystem(e.target.value)}
                        required
                    />
                </label>
                <label style={styles.label}>
                    Target Store (Downstream)
                    <input
                        style={styles.input}
                        value={targetSystem}
                        onChange={(e) => setTargetSystem(e.target.value)}
                        required
                    />
                </label>
            </div>

            <div style={styles.grid3}>
                <label style={styles.label}>
                    Integration Channel
                    <select
                        style={styles.input}
                        value={sourceType}
                        onChange={(e) => setSourceType(e.target.value as SourceType)}
                    >
                        <option value="POLICY_DOC">POLICY_DOC (Unstructured)</option>
                        <option value="API_FEED">API_FEED (REST / JSON)</option>
                        <option value="SFTP_BATCH_FILE">SFTP_BATCH_FILE (Batch)</option>
                    </select>
                </label>

                <label style={styles.label}>
                    Domain Tag
                    <select
                        style={styles.input}
                        value={domain}
                        onChange={(e) => setDomain(e.target.value as DomainTag)}
                    >
                        <option value="INCIDENT_RUNBOOK">INCIDENT_RUNBOOK</option>
                        <option value="OPERATIONS_SOP">OPERATIONS_SOP</option>
                        <option value="PRODUCT_GUIDE">PRODUCT_GUIDE</option>
                        <option value="TRADE_COMPLIANCE">TRADE_COMPLIANCE</option>
                    </select>
                </label>

                <label style={styles.label}>
                    Expected Records
                    <input
                        type="number"
                        min={1}
                        style={styles.input}
                        value={recordsExpected}
                        onChange={(e) => setRecordsExpected(Number(e.target.value))}
                    />
                </label>
            </div>

            <div style={styles.grid3}>
                <label style={styles.label}>
                    Document / Feed Title
                    <input
                        style={styles.input}
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                        required
                    />
                </label>
                <label style={styles.label}>
                    Chunk Size (words)
                    <input
                        type="number"
                        min={15}
                        max={1500}
                        style={styles.input}
                        value={chunkSize}
                        onChange={(e) => setChunkSize(Number(e.target.value))}
                    />
                </label>
                <label style={styles.label}>
                    Chunk Overlap (words)
                    <input
                        type="number"
                        min={0}
                        max={300}
                        style={styles.input}
                        value={overlap}
                        onChange={(e) => setOverlap(Number(e.target.value))}
                    />
                </label>
            </div>

            <label style={styles.label}>
                Raw Document / Payload Content
                <textarea
                    rows={7}
                    style={styles.textarea}
                    value={rawContent}
                    onChange={(e) => setRawContent(e.target.value)}
                    required
                />
            </label>

            <div style={styles.footerRow}>
                <button type="submit" disabled={submitting} style={styles.primaryBtn}>
                    {submitting ? "Dispatching..." : "Trigger Celery Data Prep Job"}
                </button>
                {feedback && <span style={styles.feedback}>{feedback}</span>}
            </div>
        </form>
    );
};

const styles: Record<string, React.CSSProperties> = {
    card: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
    },
    headerRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
    },
    title: { margin: 0, fontSize: 18, color: "#0f172a" },
    subtitle: { margin: "4px 0 0", fontSize: 13, color: "#475569" },
    uploadBtn: {
        background: "#f1f5f9",
        color: "#0f172a",
        border: "1px solid #cbd5e1",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    grid2: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
    },
    grid3: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12,
    },
    label: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: 13,
        fontWeight: 600,
        color: "#334155",
    },
    input: {
        padding: "8px 10px",
        borderRadius: 6,
        border: "1px solid #cbd5e1",
        fontSize: 14,
        color: "#0f172a",
        background: "#fff",
    },
    textarea: {
        padding: "10px 12px",
        borderRadius: 6,
        border: "1px solid #cbd5e1",
        fontSize: 13,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        color: "#0f172a",
        background: "#f8fafc",
    },
    footerRow: {
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
    },
    primaryBtn: {
        background: "#1d4ed8",
        color: "#ffffff",
        border: "none",
        borderRadius: 6,
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
    },
    feedback: { fontSize: 13, color: "#0f766e", fontWeight: 500 },
};
