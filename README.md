# GenAI Data Integration & Preparation Workbench

A full-stack reference project demonstrating upstream data ingestion, schema/data-contract validation, asynchronous background processing with **Celery** and **Redis**, data quality scoring and reconciliation, and RAG-ready chunk preparation—paired with a **React + TypeScript** monitoring workbench and **Docker Compose** orchestration.

## Overview & Purpose

This project models how enterprise data pipelines prepare structured, semi-structured, and unstructured data for downstream GenAI / Retrieval-Augmented Generation (RAG) and search workflows without blocking API requests:

- **System Analysis & Data Contracts:** Enforces explicit source/target system metadata, integration channel types (`API_FEED`, `SFTP_BATCH_FILE`, `POLICY_DOC`), domain tags, expected record counts, and chunking parameters.
- **Asynchronous Task Execution:** Dispatches ingestion and data-preparation jobs from **FastAPI** to **Celery** workers backed by **Redis**, tracking job progression (`QUEUED` → `RUNNING` → `COMPLETED` / `FAILED`).
- **Data Quality, Reconciliation & RAG Preparation:** Normalizes text, validates record reconciliation, computes a Data Quality (DQ) score, splits content into overlapping chunks, and attaches provenance metadata for downstream RAG consumers.
- **Operational Observability UI:** Provides a React + TypeScript dashboard to trigger ingestion jobs, monitor Celery task stages, inspect DQ/reconciliation metrics, and filter generated RAG chunks.

## Architecture

1. **Frontend (`React` + `TypeScript` + `Vite` / `Nginx`):** Interactive workbench for submitting ingestion payloads, monitoring job status, and inspecting RAG-ready chunks.
2. **Backend API (`FastAPI`):** Validates incoming requests (`202 Accepted`), persists job/chunk state, enqueues Celery tasks, and exposes overview, job detail, and chunk query endpoints.
3. **Message Broker & Result Backend (`Redis`):** Routes asynchronous tasks between FastAPI and Celery workers.
4. **Background Worker (`Celery`):** Executes the multi-stage pipeline (`1/4 Normalize` → `2/4 Data Quality & Schema Checks` → `3/4 Metadata Enrichment & Chunking` → `4/4 Reconciliation & Persistence`).

## Project Structure

```text
uob-genai-data-pipeline/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── data/
│   └── app/
│       ├── main.py
│       ├── celery_app.py
│       ├── schemas.py
│       ├── store.py
│       └── tasks.py
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── types.ts
        └── components/
            ├── IngestionForm.tsx
            ├── JobMonitor.tsx
            └── RagChunkExplorer.tsx
