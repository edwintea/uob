import React from "react";
import { JobSummary } from "../types";

interface Props {
    jobs: JobSummary[];
    selectedJobId: string | null;
    onSelectJob: (jobId: string | null) => void;
}

const badgeStyle = (status: JobSummary["status"]): React.CSSProperties => {
    const map: Record<JobSummary["status"], { bg: string; fg: string }> = {
        COMPLETED: { bg: "#dcfce7", fg: "#166534" },
        RUNNING: { bg: "#dbeafe", fg: "#1e40af" },
        QUEUED: { bg: "#fef9c3", fg: "#854d0e" },
        FAILED: { bg: "#fee2e2", fg: "#991b1b" },
    };
    const c = map[status];
    return {
        background: c.bg,
        color: c.fg,
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        display: "inline-block",
    };
};

export const JobMonitor: React.FC<Props> = ({
                                                jobs,
                                                selectedJobId,
                                                onSelectJob,
                                            }) => {
    return (
        <div style={styles.card}>
            <div style={styles.topRow}>
                <div>
                    <h2 style={styles.title}>2. Celery Pipeline & Reconciliation Monitor</h2>
                    <p style={styles.subtitle}>
                        Click a row to filter RAG chunks by job_id. Click again to clear filter.
                    </p>
                </div>
                {selectedJobId && (
                    <button onClick={() => onSelectJob(null)} style={styles.clearBtn}>
                        Clear Filter ({selectedJobId})
                    </button>
                )}
            </div>

            <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                    <thead>
                    <tr>
                        <th style={styles.th}>Job / Task</th>
                        <th style={styles.th}>Flow & Domain</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Pipeline Stage</th>
                        <th style={styles.th}>Reconciliation</th>
                        <th style={styles.th}>DQ Score</th>
                        <th style={styles.th}>Chunks</th>
                    </tr>
                    </thead>
                    <tbody>
                    {jobs.length === 0 ? (
                        <tr>
                            <td colSpan={7} style={styles.empty}>
                                No ingestion jobs yet. Dispatch one above to test the pipeline.
                            </td>
                        </tr>
                    ) : (
                        jobs.map((job) => {
                            const active = selectedJobId === job.job_id;
                            return (
                                <tr
                                    key={job.job_id}
                                    onClick={() => onSelectJob(active ? null : job.job_id)}
                                    style={{
                                        ...styles.tr,
                                        background: active ? "#eff6ff" : "#ffffff",
                                    }}
                                >
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: 700 }}>{job.job_id}</div>
                                        <div style={styles.monoSmall}>
                                            {job.celery_task_id ? job.celery_task_id.slice(0, 12) : "pending"}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={{ fontWeight: 600 }}>{job.document_title}</div>
                                        <div style={styles.mutedSmall}>
                                            {job.source_system} → {job.target_system} • {job.domain}
                                        </div>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={badgeStyle(job.status)}>{job.status}</span>
                                    </td>
                                    <td style={styles.td}>
                                        <div>{job.stage}</div>
                                        {job.error_message && (
                                            <div style={{ color: "#b91c1c", fontSize: 12 }}>
                                                {job.error_message}
                                            </div>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        {job.records_processed} / {job.records_expected}
                                    </td>
                                    <td style={styles.td}>{job.dq_score}%</td>
                                    <td style={styles.td}>{job.chunks_created}</td>
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                </table>
            </div>
        </div>
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
    topRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
    },
    title: { margin: 0, fontSize: 18, color: "#0f172a" },
    subtitle: { margin: "4px 0 0", fontSize: 13, color: "#475569" },
    clearBtn: {
        background: "#f1f5f9",
        border: "1px solid #cbd5e1",
        borderRadius: 6,
        padding: "6px 10px",
        fontSize: 12,
        cursor: "pointer",
    },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
    th: {
        textAlign: "left",
        padding: "10px 8px",
        borderBottom: "2px solid #e2e8f0",
        color: "#475569",
        fontWeight: 700,
    },
    tr: { cursor: "pointer", borderBottom: "1px solid #f1f5f9" },
    td: { padding: "10px 8px", verticalAlign: "top", color: "#0f172a" },
    monoSmall: {
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        color: "#64748b",
    },
    mutedSmall: { fontSize: 12, color: "#64748b", marginTop: 2 },
    empty: { textAlign: "center", padding: 24, color: "#64748b" },
};
