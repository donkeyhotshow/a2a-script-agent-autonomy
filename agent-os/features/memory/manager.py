"""4-layer memory manager.

Layers:
1. SHORT TERM  — Redis (TTL-based)
2. SOLUTIONS   — solutions.json (JSON file with similar-task lookup)
3. BEHAVIOUR   — behaviour.md (injected into system prompt)
4. EPISODIC    — SQLite (long-term log of completed tasks)
"""
import asyncio
import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

from core.logger import get_logger
from core.error_handler import handle
from infra.redis import RedisClient

_log = get_logger("memory.manager")


class MemoryManager:
    def __init__(
        self,
        redis: RedisClient,
        solutions_path: str,
        behaviour_path: str,
        sqlite_path: str,
    ) -> None:
        self._redis = redis
        self._solutions_path = Path(solutions_path)
        self._behaviour_path = Path(behaviour_path)
        self._sqlite_path = Path(sqlite_path)
        self._db: Optional[sqlite3.Connection] = None

    # ------------------------------------------------------------------
    # Bootstrap
    # ------------------------------------------------------------------

    async def setup(self) -> None:
        """Initialise all layers."""
        await self._redis.connect()
        self._db = sqlite3.connect(str(self._sqlite_path))
        self._db.execute(
            """CREATE TABLE IF NOT EXISTS episodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                goal TEXT NOT NULL,
                score REAL,
                draft TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )"""
        )
        self._db.commit()
        _log.info("Memory layers initialised")

    async def teardown(self) -> None:
        await self._redis.close()
        if self._db:
            self._db.close()

    # ------------------------------------------------------------------
    # SHORT TERM (Redis)
    # ------------------------------------------------------------------

    async def short_set(self, key: str, value: Any, ttl: int = 3600) -> None:
        await self._redis.set(key, value, ttl=ttl)

    async def short_get(self, key: str) -> Optional[Any]:
        return await self._redis.get(key)

    # ------------------------------------------------------------------
    # SOLUTIONS (JSON)
    # ------------------------------------------------------------------

    def _load_solutions(self) -> List[Dict]:
        if not self._solutions_path.exists():
            return []
        try:
            return json.loads(self._solutions_path.read_text(encoding="utf-8"))
        except Exception as exc:
            handle(exc, "memory.solutions.load")
            return []

    def _save_solutions(self, data: List[Dict]) -> None:
        self._solutions_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    async def find_similar_solutions(self, goal: str, top_k: int = 3) -> List[Dict]:
        """Naive keyword-overlap similarity — no LLM, deterministic."""
        solutions = self._load_solutions()
        goal_tokens = set(goal.lower().split())
        scored = []
        for sol in solutions:
            sol_tokens = set(sol.get("goal", "").lower().split())
            overlap = len(goal_tokens & sol_tokens)
            if overlap > 0:
                scored.append((overlap, sol))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [s for _, s in scored[:top_k]]

    async def save_solution(self, task_id: str, goal: str, score: float, draft: str) -> None:
        solutions = self._load_solutions()
        solutions.append({"task_id": task_id, "goal": goal, "score": score, "draft": draft})
        self._save_solutions(solutions)

    # ------------------------------------------------------------------
    # BEHAVIOUR (Markdown)
    # ------------------------------------------------------------------

    async def load_behaviour(self) -> str:
        if not self._behaviour_path.exists():
            return ""
        return self._behaviour_path.read_text(encoding="utf-8")

    # ------------------------------------------------------------------
    # EPISODIC (SQLite)
    # ------------------------------------------------------------------

    async def save_episode(self, task_id: str, goal: str, score: Optional[float], draft: str) -> None:
        if not self._db:
            return
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            self._db_save_episode,
            task_id, goal, score, draft,
        )

    def _db_save_episode(self, task_id: str, goal: str, score: Optional[float], draft: str) -> None:
        if self._db:
            self._db.execute(
                "INSERT INTO episodes (task_id, goal, score, draft) VALUES (?, ?, ?, ?)",
                (task_id, goal, score, draft),
            )
            self._db.commit()

    async def get_recent_episodes(self, limit: int = 5) -> List[Dict]:
        if not self._db:
            return []
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._db_get_episodes, limit)

    def _db_get_episodes(self, limit: int) -> List[Dict]:
        if not self._db:
            return []
        cursor = self._db.execute(
            "SELECT task_id, goal, score, draft, created_at FROM episodes ORDER BY id DESC LIMIT ?",
            (limit,),
        )
        cols = ["task_id", "goal", "score", "draft", "created_at"]
        return [dict(zip(cols, row)) for row in cursor.fetchall()]
