import React, { useEffect, useState, useCallback } from "react";
import { DomainTag, PipelineOverview, RagChunk } from "./types";
import { IngestionForm } from "./components/IngestionForm";
import { JobMonitor } from "./components/JobMonitor";
import { RagChunkExplorer } from "./components/RagChunkExplorer";

const INITIAL_OVERVIEW: PipelineOverview = {
    total_jobs: 0,
    completed_jobs: 0,
    running_or_queued_jobs: 0,
    failed_jobs: 0,
    total_rag_chunks: 0,
    avg_dq_score: 0,
    jobs: [],
};

export const App: React.FC = () => {
    const [overview, setOverview] = useState<PipelineOverview>(INITIAL_OVERVIEW);
    const [chunks, setChunks] = useState<RagChunk[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [domainFilter, setDomainFilter] = useState<DomainTag | "ALL">("ALL");

    const fetchData = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (selectedJobId) params.set("job_id", selectedJobId);
            if (domainFilter !== "ALL") params.set("domain", domainFilter);

            const [ovRes, chRes] = await Promise.all([
                fetch("http://localhost:8000/api/overview"),
                fetch(`http://localhost:8000/api/chunks?${params.toString()}`),
            ]);

            if (ovRes.ok) {
                const ovData: PipelineOverview = await ovRes.json();
                setOverview(ovData);
            }
            if (chRes.ok) {
                const chData: RagChunk[] = await chRes.json();
                setChunks(chData);
            }
        } catch {
            // Backend belum menyala atau sedang restart
        }
    }, [selectedJobId, domainFilter]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div style={styles.page}>
            <header style={styles.header}>
                <div>
                    <h1 style={styles.h1}>GenAI Data Integration & Preparation Workbench</h1>
                    <p style={styles.desc}>
                        System Analysis • Data Contracts & Reconciliation • Celery Async Prep • RAG Chunk Readiness
                    </p>
                </div>
            </header>

            <section style={styles.kpiGrid}>
                <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>Total Jobs</div>
                    <div style={styles.kpiValue}>{overview.total_jobs}</div>
                </div>
                <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>Active (Queued / Running)</div>
                    <div style={styles.kpiValue}>{overview.running_or_queued_jobs}</div>
                </div>
                <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>Completed</div>
                    <div style={styles.kpiValue}>{overview.completed_jobs}</div>
                </div>
                <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>Avg DQ Score</div>
                    <div style={styles.kpiValue}>{overview.avg_dq_score}%</div>
                </div>
                <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>RAG Chunks Ready</div>
                    <div style={styles.kpiValue}>{overview.total_rag_chunks}</div>
                </div>
            </section>

            <main style={styles.mainStack}>
                <IngestionForm
                    onSubmitted={(jobId) => {
                        setSelectedJobId(jobId);
                        fetchData();
                    }}
                />
                <JobMonitor
                    jobs={overview.jobs}
                    selectedJobId={selectedJobId}
                    onSelectJob={setSelectedJobId}
                />
                <RagChunkExplorer
                    chunks={chunks}
                    domainFilter={domainFilter}
                    onDomainChange={setDomainFilter}
                />
            </main>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: "24px 16px 48px",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    },
    header: {
        maxWidth: 1120,
        margin: "0 auto 18px",
        background: "#0f172a",
        color: "#ffffff",
        padding: "20px 24px",
        borderRadius: 12,
    },
    h1: { margin: 0, fontSize: 22 },
    desc: { margin: "6px 0 0", fontSize: 13, color: "#cbd5e1" },
    kpiGrid: {
        maxWidth: 1120,
        margin: "0 auto 18px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 12,
    },
    kpiCard: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: 14,
    },
    kpiLabel: { fontSize: 12, color: "#64748b", fontWeight: 600 },
    kpiValue: { fontSize: 22, fontWeight: 800, color: "#0f172a", marginTop: 4 },
    mainStack: {
        maxWidth: 1120,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 18,
    },
};

export default App;
