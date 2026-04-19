"""Shared Blackboard — single source of truth for agent state."""
import asyncio
from typing import Any, Dict, List, Optional

from core.logger import get_logger

_log = get_logger("blackboard")


class Blackboard:
    """Thread-safe (asyncio-lock-protected) shared state store.

    Schema:
        draft          — latest generated script text
        critic_notes   — list of structural notes from Critic
        judge_score    — float 0-10 or None
        skills_loaded  — list of active skill names
        behaviour      — injected system behaviour string
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._data: Dict[str, Any] = {
            "draft": None,
            "critic_notes": [],
            "judge_score": None,
            "skills_loaded": [],
            "behaviour": "",
        }

    async def get(self, key: str) -> Any:
        async with self._lock:
            return self._data.get(key)

    async def set(self, key: str, value: Any) -> None:
        async with self._lock:
            _log.debug("Blackboard.set %s", key)
            self._data[key] = value

    async def append(self, key: str, value: Any) -> None:
        """Append *value* to a list stored at *key*."""
        async with self._lock:
            current = self._data.get(key, [])
            if not isinstance(current, list):
                raise TypeError(f"Blackboard key '{key}' is not a list")
            current.append(value)
            self._data[key] = current

    async def snapshot(self) -> Dict[str, Any]:
        async with self._lock:
            return dict(self._data)

    async def reset(self) -> None:
        async with self._lock:
            self._data = {
                "draft": None,
                "critic_notes": [],
                "judge_score": None,
                "skills_loaded": [],
                "behaviour": "",
            }
