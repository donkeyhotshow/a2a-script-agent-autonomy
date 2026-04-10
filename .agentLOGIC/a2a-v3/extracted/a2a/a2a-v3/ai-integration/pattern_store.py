import os, json
import numpy as np

DB_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/a2a_server")

# ── Embedding ──────────────────────────────────────────────────────────────
def _embed(text: str) -> list:
    import requests
    try:
        resp = requests.post(
            f"http://localhost:{os.getenv('OLLAMA_PORT', 11435)}/api/embeddings",
            json={"model": "nomic-embed-text", "prompt": text},
            timeout=10
        )
        return resp.json()["embedding"]
    except Exception as e:
        print(f"[pattern_store] embedding error: {e}")
        return [0.0] * 1536

def _cosine(a, b) -> float:
    a, b = np.array(a), np.array(b)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom > 0 else 0.0

# ── DB helpers ─────────────────────────────────────────────────────────────
def _conn():
    import psycopg2
    return psycopg2.connect(DB_URL)

def _ensure_schema():
    try:
        c = _conn()
        with c.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS success_patterns (
                    id SERIAL PRIMARY KEY,
                    session_id TEXT,
                    task_text TEXT,
                    action_name TEXT,
                    result_summary TEXT,
                    embedding TEXT,
                    score FLOAT DEFAULT 1.0,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
        c.commit(); c.close()
    except Exception as e:
        print(f"[pattern_store] schema error: {e}")

# ── Save pattern ───────────────────────────────────────────────────────────
def save_pattern(session_id: str, task: str, action_name: str, result_summary: str):
    """Save a successful pattern. Merges with similar existing ones (cosine > 0.85)."""
    try:
        _ensure_schema()
        embedding = _embed(task)

        # Check for near-duplicate to merge instead of insert
        existing = _load_all_embeddings()
        for row_id, row_emb, row_task in existing:
            if _cosine(embedding, row_emb) > 0.85:
                # Merge: update result_summary, bump score
                c = _conn()
                with c.cursor() as cur:
                    cur.execute(
                        "UPDATE success_patterns SET result_summary=%s, score=LEAST(score+0.05, 2.0) WHERE id=%s",
                        (result_summary, row_id)
                    )
                c.commit(); c.close()
                print(f"[pattern_store] merged with existing pattern id={row_id}")
                return

        # Insert new
        c = _conn()
        with c.cursor() as cur:
            cur.execute(
                "INSERT INTO success_patterns (session_id,task_text,action_name,result_summary,embedding,score) "
                "VALUES (%s,%s,%s,%s,%s,1.0)",
                (session_id, task, action_name, result_summary, json.dumps(embedding))
            )
        c.commit(); c.close()
    except Exception as e:
        print(f"[pattern_store] save error: {e}")

def _load_all_embeddings():
    """Returns list of (id, embedding_list, task_text)."""
    try:
        c = _conn()
        with c.cursor() as cur:
            cur.execute("SELECT id, embedding, task_text FROM success_patterns WHERE score > 0.3")
            rows = cur.fetchall()
        c.close()
        return [(r[0], json.loads(r[1]), r[2]) for r in rows]
    except Exception:
        return []

# ── Score decay ────────────────────────────────────────────────────────────
def update_score(task: str, delta: float):
    """
    Adjust score of patterns matching this task.
    delta = +0.1 on success, -0.2 on failure.
    Patterns with score < 0.3 are excluded from few-shot (XENON approach).
    """
    try:
        embedding = _embed(task)
        c = _conn()
        with c.cursor() as cur:
            cur.execute("SELECT id, embedding FROM success_patterns")
            rows = cur.fetchall()
            for row_id, row_emb_json in rows:
                row_emb = json.loads(row_emb_json)
                if _cosine(embedding, row_emb) > 0.7:
                    cur.execute(
                        "UPDATE success_patterns SET score = GREATEST(0.0, LEAST(2.0, score + %s)) WHERE id=%s",
                        (delta, row_id)
                    )
        c.commit(); c.close()
    except Exception as e:
        print(f"[pattern_store] update_score error: {e}")

# ── Find similar ───────────────────────────────────────────────────────────
def find_similar_patterns(task: str, top_k: int = 3) -> list:
    """Find top-k similar past patterns with score > 0.3."""
    try:
        embedding = _embed(task)
        c = _conn()
        with c.cursor() as cur:
            cur.execute(
                "SELECT task_text, action_name, result_summary, score, embedding "
                "FROM success_patterns WHERE score > 0.3"
            )
            rows = cur.fetchall()
        c.close()

        scored = []
        for task_text, action_name, result_summary, score, emb_json in rows:
            emb = json.loads(emb_json)
            sim = _cosine(embedding, emb)
            if sim > 0.7:
                scored.append({
                    "task": task_text,
                    "action": action_name,
                    "result": result_summary,
                    "score": score,
                    "similarity": sim
                })

        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:top_k]
    except Exception as e:
        print(f"[pattern_store] find error: {e}")
        return []

# ── Defrag (periodic cleanup) ──────────────────────────────────────────────
def defrag_patterns():
    """
    Remove patterns with score < 0.3 (permanently bad patterns).
    Run periodically (e.g. every 100 sessions).
    """
    try:
        c = _conn()
        with c.cursor() as cur:
            cur.execute("DELETE FROM success_patterns WHERE score < 0.3")
            deleted = cur.rowcount
        c.commit(); c.close()
        print(f"[pattern_store] defrag: removed {deleted} low-score patterns")
    except Exception as e:
        print(f"[pattern_store] defrag error: {e}")

def format_patterns_for_prompt(patterns: list) -> str:
    if not patterns:
        return "No relevant past patterns."
    lines = ["## Past successful patterns (reference only):"]
    for p in patterns:
        sim = round(p.get("similarity", 0), 2)
        lines.append(f"- [{sim}] Task: {p['task']} → {p['action']}: {p['result']}")
    return "\n".join(lines)
