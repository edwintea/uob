import React from "react";
import { DomainTag, RagChunk } from "../types";

interface Props {
    chunks: RagChunk[];
    domainFilter: DomainTag | "ALL";
    onDomainChange: (d: DomainTag | "ALL") => void;
}

export const RagChunkExplorer: React.FC<Props> = ({
                                                      chunks,
                                                      domainFilter,
                                                      onDomainChange,
                                                  }) => {
    return (
        <div style={styles.card}>
            <div style={styles.topRow}>
                <div>
                    <h2 style={styles.title}>3. GenAI RAG-Ready Chunks & Metadata</h2>
                    <p style={styles.subtitle}>
                        Inspect normalized text chunks and metadata prepared for downstream retrieval/RAG workflows.
                    </p>
                </div>
                <select
                    style={styles.select}
                    value={domainFilter}
                    onChange={(e) => onDomainChange(e.target.value as DomainTag | "ALL")}
                >
                    <option value="ALL">All Domains</option>
                    <option value="INCIDENT_RUNBOOK">INCIDENT_RUNBOOK</option>
                    <option value="OPERATIONS_SOP">OPERATIONS_SOP</option>
                    <option value="PRODUCT_GUIDE">PRODUCT_GUIDE</option>
                    <option value="TRADE_COMPLIANCE">TRADE_COMPLIANCE</option>
                </select>
            </div>

            {chunks.length === 0 ? (
                <div style={styles.empty}>No RAG chunks available for the current filter.</div>
            ) : (
                <div style={styles.list}>
                    {chunks.map((c) => (
                        <div key={c.chunk_id} style={styles.chunkCard}>
                            <div style={styles.metaHeader}>
                                <strong>
                                    {c.chunk_id} • {c.document_title} (#{c.chunk_index})
                                </strong>
                                <span style={styles.tag}>
                  {c.domain} • {c.metadata.word_count} words • DQ {c.metadata.dq_score}%
                </span>
                            </div>
                            <p style={styles.chunkText}>{c.text}</p>
                            <div style={styles.metaFooter}>
                                Source: {c.source_system} | Target: {c.metadata.target_system} | Channel:{" "}
                                {c.metadata.source_type}
                            </div>
                        </div>
                    ))}
                </div>
            )}
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
    select: {
        padding: "8px 10px",
        borderRadius: 6,
        border: "1px solid #cbd5e1",
        fontSize: 13,
        background: "#fff",
    },
    list: { display: "flex", flexDirection: "column", gap: 10 },
    chunkCard: {
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: 12,
        background: "#f8fafc",
    },
    metaHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        fontSize: 13,
        color: "#0f172a",
    },
    tag: {
        background: "#e0e7ff",
        color: "#1e3a8a",
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
    },
    chunkText: {
        margin: "8px 0",
        fontSize: 13,
        lineHeight: 1.5,
        color: "#1e293b",
    },
    metaFooter: { fontSize: 12, color: "#64748b" },
    empty: { textAlign: "center", padding: 24, color: "#64748b", fontSize: 13 },
};
