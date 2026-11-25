import json
import os
from datetime import datetime
from threading import Lock
from typing import Dict, List, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
STATE_FILE = os.path.join(DATA_DIR, "pipeline_state.json")
_lock = Lock()


def now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _ensure_file() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(STATE_FILE):
        initial = {"jobs": {}, "chunks": []}
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(initial, f, indent=2)


def load_state() -> dict:
    with _lock:
        _ensure_file()
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)


def save_state(state: dict) -> None:
    with _lock:
        _ensure_file()
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)


def upsert_job(job_id: str, patch: dict) -> dict:
    state = load_state()
    existing = state["jobs"].get(job_id, {})
    existing.update(patch)
    existing["updated_at"] = now_iso()
    state["jobs"][job_id] = existing
    save_state(state)
    return existing


def get_job(job_id: str) -> Optional[dict]:
    state = load_state()
    return state["jobs"].get(job_id)


def list_jobs() -> List[dict]:
    state = load_state()
    jobs = list(state["jobs"].values())
    jobs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return jobs


def replace_job_chunks(job_id: str, new_chunks: List[dict]) -> None:
    state = load_state()
    remaining = [c for c in state["chunks"] if c.get("job_id") != job_id]
    remaining.extend(new_chunks)
    state["chunks"] = remaining
    save_state(state)


def list_chunks(job_id: Optional[str] = None, domain: Optional[str] = None) -> List[dict]:
    state = load_state()
    chunks = state["chunks"]
    if job_id:
        chunks = [c for c in chunks if c.get("job_id") == job_id]
    if domain and domain != "ALL":
        chunks = [c for c in chunks if c.get("domain") == domain]
    return chunks
