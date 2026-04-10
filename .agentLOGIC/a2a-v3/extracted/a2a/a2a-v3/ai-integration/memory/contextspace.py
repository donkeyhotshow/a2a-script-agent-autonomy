"""
Contextspace — стандартизированный контекст пробуждения агента.

Источник: codex-autorunner (CAR)
  «Когда агент просыпается, он получает: знания о системе,
   предопределённый contextspace, текущий тикет,
   и финальный вывод предыдущего агента.»

Назначение:
  Каждая новая сессия агента начинается с полного contextspace-объекта,
  который содержит всё необходимое для немедленного старта без
  дополнительных вопросов.

Поля contextspace:
  - system:      краткая справка о стеке (порты, ключевые команды)
  - memory:      episodic context из предыдущих сессий
  - current_task: текущий тикет из tasks/pending/ (если есть)
  - prev_output: финальный вывод предыдущей сессии
  - health:      последний статус сервисов
  - budget:      оставшийся iteration budget
"""

import os, json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

_ROOT      = Path(os.getenv("REPO_ROOT", Path(__file__).parent.parent.parent))
_TASKS_DIR = _ROOT / "tasks" / "pending"
_RUNTIME   = _ROOT / "runtime"
_STORE     = Path(os.getenv("MEMORY_DIR", Path(__file__).parent / "store"))
_STORE.mkdir(parents=True, exist_ok=True)

_PREV_OUTPUT_FILE = _STORE / "prev_session_output.json"

# Краткая системная справка (вставляется всегда, ≤ 400 символов)
_SYSTEM_BRIEF = """Stack: a2a-client:5173 (sessions /api/a2a/*) · a2a-server:3000 (/api/v1/invoke) · ai-integration:11434 · ollama:11435 · postgres:5432 · redis:6379.
Start: start-all.bat (Windows) / start-all.sh (Linux) from REPO ROOT only.
Tasks: tasks/pending/ → execute → tasks/archive/.
DEV_STATE: update before AND after every task."""


def build_contextspace(
    session_id: str,
    task_override: Optional[str] = None,
) -> dict:
    """
    Строит полный contextspace для новой сессии агента.

    Args:
        session_id:    ID новой сессии
        task_override: задача из запроса пользователя (если есть)

    Returns:
        Словарь готовый к вставке в системный промпт / начало сессии.
    """
    ctx = {
        "session_id":    session_id,
        "created_at":    datetime.now(timezone.utc).isoformat(),
        "system":        _SYSTEM_BRIEF,
        "current_task":  None,
        "prev_output":   None,
        "memory":        "",
        "health":        _load_last_health(),
        "budget_hint":   f"max {os.getenv('AGENT_ITER_BUDGET', '90')} iterations",
    }

    # 1. Текущий тикет
    if task_override:
        ctx["current_task"] = {
            "title":       task_override,
            "source":      "user_request",
            "description": task_override,
        }
    else:
        ctx["current_task"] = _pick_pending_task()

    # 2. Вывод предыдущей сессии
    ctx["prev_output"] = _load_prev_output()

    # 3. Episodic memory
    try:
        from memory.episodic import load_session_context
        ctx["memory"] = load_session_context(current_session_id=session_id)
    except Exception as e:
        print(f"[contextspace] episodic load failed: {e}")
        ctx["memory"] = ""

    return ctx


def format_for_prompt(ctx: dict) -> str:
    """
    Сериализует contextspace в строку для вставки в начало системного промпта.
    Ограничивается ~3000 символами суммарно.
    """
    lines = [
        "═══ AGENT CONTEXTSPACE ═══",
        f"Session: {ctx['session_id']}",
        "",
        "## System",
        ctx["system"],
    ]

    # Health
    health = ctx.get("health")
    if health:
        status_line = "  ".join(f"{k}:{v}" for k, v in health.items())
        lines += ["", "## Last health check", status_line]

    # Текущая задача
    task = ctx.get("current_task")
    if task:
        lines += ["", "## Current task"]
        lines.append(f"  [{task.get('priority','?').upper()}] {task['title']}")
        if task.get("description") and task["description"] != task["title"]:
            lines.append(f"  {task['description'][:200]}")
        if task.get("acceptance_criteria"):
            lines.append("  Criteria: " + "; ".join(task["acceptance_criteria"][:3]))

    # Вывод предыдущей сессии
    prev = ctx.get("prev_output")
    if prev and prev.get("summary"):
        lines += ["", "## Previous session output"]
        lines.append(f"  [{prev.get('session_id','?')[:8]}] {prev['summary'][:200]}")
        if prev.get("pending_notes"):
            lines.append(f"  Pending notes: {prev['pending_notes'][:150]}")

    # Memory
    memory = ctx.get("memory", "")
    if memory.strip():
        lines += ["", memory]

    lines += ["", f"Budget: {ctx.get('budget_hint','90 iterations max')}"]
    lines.append("═══ END CONTEXTSPACE ═══")

    result = "\n".join(lines)
    return result[:3000]  # hard cap


def save_session_output(
    session_id: str,
    summary: str,
    pending_notes: str = "",
    completed_tasks: list = None,
):
    """
    Сохраняет финальный вывод сессии — будет доступен следующей сессии
    через contextspace["prev_output"].

    Вызывается агентом в конце работы (или при budget stop).
    """
    data = {
        "session_id":       session_id,
        "saved_at":         datetime.now(timezone.utc).isoformat(),
        "summary":          summary[:500],
        "pending_notes":    pending_notes[:300],
        "completed_tasks":  (completed_tasks or [])[:10],
    }
    _PREV_OUTPUT_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )


def _pick_pending_task() -> Optional[dict]:
    """Выбирает первый pending-тикет (high priority первым)."""
    if not _TASKS_DIR.exists():
        return None
    files = sorted(_TASKS_DIR.glob("*.json"))
    # Сначала high priority
    for priority in ("high", "medium", "low", None):
        for f in files:
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                if data.get("status", "pending") != "pending":
                    continue
                if priority is None or data.get("priority") == priority:
                    return data
            except Exception:
                continue
    return None


def _load_prev_output() -> Optional[dict]:
    """Загружает вывод предыдущей сессии."""
    if not _PREV_OUTPUT_FILE.exists():
        return None
    try:
        return json.loads(_PREV_OUTPUT_FILE.read_text(encoding="utf-8"))
    except Exception:
        return None


def _load_last_health() -> dict:
    """Загружает последний health-статус из tasks/pending/current.json."""
    current = _TASKS_DIR / "current.json"
    if current.exists():
        try:
            data = json.loads(current.read_text(encoding="utf-8"))
            return data.get("discovered", {}).get("health", {})
        except Exception:
            pass
    return {}
