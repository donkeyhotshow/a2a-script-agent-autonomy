"""
Drive System — автономная генерация задач при пустой очереди.

Источники:
  - MAX (unimaginative-artist): self-directed drive system, auto-discover goals
  - AGENTS.md (a2a-v3): "Empty queue — mandatory" протокол
  - codex-autorunner: contextspace при старте + тикет-система

Назначение:
  Заменяет расплывчатый idle-шаг («почистить, найти, записать») на
  структурированный алгоритм с конкретными scan-стратегиями и
  автоматической записью в tasks/pending/.

Drive-приоритеты (сканируются по порядку):
  1. RETRY   — провалившиеся задачи из последних сессий
  2. DEBT    — технический долг: DEV_STATE незаполненные пункты
  3. HEALTH  — аномалии в runtime/metrics.json
  4. QUALITY — симуляции с предупреждениями, тесты без покрытия
  5. EXPLORE — backlog / рискованный код без тестов (самостоятельные идеи)
"""

import os, json, re, time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

_ROOT        = Path(os.getenv("REPO_ROOT", Path(__file__).parent.parent.parent))
_TASKS_DIR   = _ROOT / "tasks" / "pending"
_ARCHIVE_DIR = _ROOT / "tasks" / "archive"
_RUNTIME     = _ROOT / "runtime"
_MEMORY_DIR  = Path(os.getenv("MEMORY_DIR", Path(__file__).parent / "store"))

_TASKS_DIR.mkdir(parents=True, exist_ok=True)


# ── Публичный интерфейс ────────────────────────────────────────────────────

def run_idle_protocol(session_id: str, model_router=None) -> list[dict]:
    """
    Запускает полный idle-протокол. Возвращает список созданных задач.
    Вызывается когда tasks/pending/ пуст (или содержит только completed записи).

    Алгоритм (из AGENTS.md + drive system):
      1. Scan по пяти стратегиям
      2. Дедупликация (не создавать уже существующие задачи)
      3. Запись в tasks/pending/
      4. Возврат созданных задач вызывающему коду
    """
    print(f"[drive] idle protocol started for session={session_id}")
    candidates = []

    candidates += _scan_failed_retries(session_id)
    candidates += _scan_dev_state_debt()
    candidates += _scan_metrics_anomalies()
    candidates += _scan_simulation_warnings()
    candidates += _scan_explore_backlog(model_router)

    # Дедупликация с уже существующими pending
    existing_titles = _get_existing_task_titles()
    new_tasks = [c for c in candidates if c["title"] not in existing_titles]

    if not new_tasks:
        print("[drive] no new tasks discovered — queue genuinely empty")
        return []

    created = []
    for task in new_tasks[:5]:  # максимум 5 за один idle-цикл
        path = _write_task(task, session_id)
        print(f"[drive] created task: {task['title']} → {path.name}")
        created.append(task)

    return created


# ── Стратегии сканирования ─────────────────────────────────────────────────

def _scan_failed_retries(session_id: str) -> list[dict]:
    """RETRY: ищем failed-записи в episodic log."""
    tasks = []
    try:
        from memory.episodic import EPISODIC_LOG
        if not EPISODIC_LOG.exists():
            return []
        lines = EPISODIC_LOG.read_text(encoding="utf-8").strip().splitlines()[-50:]
        seen = set()
        for line in reversed(lines):
            try:
                e = json.loads(line)
                if e.get("outcome") == "failed" and e.get("task") not in seen:
                    seen.add(e["task"])
                    tasks.append({
                        "title":    f"retry: {e['task'][:60]}",
                        "priority": "high",
                        "source":   "drive:retry",
                        "description": (
                            f"Задача провалилась в сессии {e.get('session','?')[:8]} "
                            f"({e.get('ts','?')[:10]}). "
                            f"Action: {e.get('action','?')}. "
                            f"Result: {e.get('result','?')[:100]}. "
                            "Повторить с диагностикой."
                        ),
                        "acceptance_criteria": [
                            "Задача выполнена успешно",
                            "Причина прошлого сбоя задокументирована в DEV_STATE"
                        ]
                    })
            except Exception:
                continue
    except Exception as e:
        print(f"[drive:retry] scan error: {e}")
    return tasks[:2]


def _scan_dev_state_debt() -> list[dict]:
    """DEBT: ищем незакрытые [ ] пункты в DEV_STATE.md."""
    tasks = []
    dev_state_files = list(_ROOT.glob("**/DEV_STATE.md"))
    for f in dev_state_files[:4]:
        try:
            content = f.read_text(encoding="utf-8")
            unchecked = re.findall(r"- \[ \] (.+)", content)
            if unchecked:
                module = f.parent.name
                # Берём только первый незакрытый пункт из каждого модуля
                item = unchecked[0].strip()
                tasks.append({
                    "title":    f"dev-state: [{module}] {item[:60]}",
                    "priority": "medium",
                    "source":   "drive:debt",
                    "description": (
                        f"Незакрытый пункт в {f.relative_to(_ROOT)}: \"{item}\". "
                        "Выполнить или переместить в backlog с обоснованием."
                    ),
                    "acceptance_criteria": [
                        f"Пункт [ ] закрыт в {f.name}",
                        "DEV_STATE.md обновлён"
                    ]
                })
        except Exception:
            continue
    return tasks[:2]


def _scan_metrics_anomalies() -> list[dict]:
    """HEALTH: проверяем runtime/metrics.json на аномалии."""
    tasks = []
    metrics_file = _RUNTIME / "metrics.json"
    if not metrics_file.exists():
        return []
    try:
        data    = json.loads(metrics_file.read_text(encoding="utf-8"))
        cycles  = data.get("cycles", [])
        if not cycles:
            return []
        last    = cycles[-1]
        err_rate = last.get("errorRate", 0)
        age      = last.get("pendingQueueAge", 0)
        success  = last.get("taskSuccessRate", 1)

        if err_rate > 0.05:
            tasks.append({
                "title":    f"health: error_rate={err_rate:.1%} exceeded threshold",
                "priority": "high",
                "source":   "drive:health",
                "description": (
                    f"runtime/metrics.json: errorRate={err_rate:.1%} > 5% threshold. "
                    "Проверить логи a2a-server и ai-integration. "
                    "Переключиться в Debug Mode если нужно."
                ),
                "acceptance_criteria": [
                    "Причина ошибок найдена и задокументирована",
                    "error_rate < 5% в следующем цикле"
                ]
            })
        if age > 90 * 60:  # >90 минут
            tasks.append({
                "title":    "health: pending_queue_age > 90min — tasks stalled",
                "priority": "high",
                "source":   "drive:health",
                "description": (
                    f"Задачи в очереди не обрабатывались {age//60:.0f} минут. "
                    "Проверить статус сервисов и возобновить выполнение."
                ),
                "acceptance_criteria": [
                    "pending_queue_age < 60 min",
                    "Задача обработана или перемещена в archive с обоснованием"
                ]
            })
    except Exception as e:
        print(f"[drive:health] scan error: {e}")
    return tasks


def _scan_simulation_warnings() -> list[dict]:
    """QUALITY: ищем симуляции с warnings."""
    tasks = []
    sims_dir = _ROOT / "simulations"
    if not sims_dir.exists():
        return []
    try:
        # Ищем файлы с known warning patterns
        for f in list(sims_dir.rglob("*.json"))[:20]:
            try:
                content = f.read_text(encoding="utf-8")
                data    = json.loads(content)
                warn    = data.get("warningCount", 0) or data.get("warnings", 0)
                if warn and warn > 0:
                    tasks.append({
                        "title":    f"quality: sim warnings in {f.name}",
                        "priority": "medium",
                        "source":   "drive:quality",
                        "description": (
                            f"Симуляция {f.relative_to(_ROOT)} содержит {warn} предупреждений. "
                            "Исправить до нуля. Запустить sim:validate после исправления."
                        ),
                        "acceptance_criteria": [
                            f"warningCount == 0 в {f.name}",
                            "sim:validate проходит без ошибок"
                        ]
                    })
            except Exception:
                continue
    except Exception as e:
        print(f"[drive:quality] scan error: {e}")
    return tasks[:1]


def _scan_explore_backlog(model_router=None) -> list[dict]:
    """
    EXPLORE: если LLM доступен — генерируем одну идею задачи на основе
    контекста проекта. Если нет — используем статичный список известных
    улучшений из DEV_STATE_COMPLETION_PLAN.md.
    """
    tasks = []

    # Попытка прочитать completion plan
    plan_file = _ROOT / "DEV_STATE_COMPLETION_PLAN.md"
    if plan_file.exists():
        try:
            content = plan_file.read_text(encoding="utf-8")
            # Берём первый незакрытый пункт
            items = re.findall(r"- \[ \] (.+)", content)
            if items:
                item = items[0].strip()
                tasks.append({
                    "title":    f"explore: {item[:70]}",
                    "priority": "low",
                    "source":   "drive:explore",
                    "description": (
                        f"Из DEV_STATE_COMPLETION_PLAN.md: \"{item}\". "
                        "Исследовать и выполнить или задокументировать почему не нужно."
                    ),
                    "acceptance_criteria": [
                        "Пункт в completion plan закрыт или перемещён в backlog с обоснованием"
                    ]
                })
        except Exception:
            pass

    # Если есть LLM — можно добавить AI-генерацию идей (опционально)
    if model_router and not tasks:
        try:
            dev_state = (_ROOT / "DEV_STATE.md").read_text(encoding="utf-8")[:1000]
            prompt = (
                f"Repository DEV_STATE.md:\n{dev_state}\n\n"
                "In ONE sentence, name the single highest-value improvement "
                "for this codebase that is NOT already listed. "
                "Format: verb + object, max 12 words. No explanation."
            )
            idea = model_router.generate(prompt)
            if idea and len(idea.strip()) > 10:
                tasks.append({
                    "title":    f"explore: {idea.strip()[:70]}",
                    "priority": "low",
                    "source":   "drive:llm-explore",
                    "description": (
                        f"Идея сгенерирована автоматически: \"{idea.strip()}\". "
                        "Оценить применимость. Если ценна — выполнить. Если нет — архивировать."
                    ),
                    "acceptance_criteria": [
                        "Задача выполнена или отклонена с обоснованием в DEV_STATE"
                    ]
                })
        except Exception as e:
            print(f"[drive:explore] llm idea failed: {e}")

    return tasks[:1]


# ── Утилиты ────────────────────────────────────────────────────────────────

def _get_existing_task_titles() -> set[str]:
    """Собирает заголовки из всех pending-файлов чтобы не дублировать."""
    titles = set()
    if not _TASKS_DIR.exists():
        return titles
    for f in _TASKS_DIR.glob("*.json"):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            title = data.get("title", "") or data.get("status", "")
            if title:
                titles.add(title)
        except Exception:
            pass
    return titles


def _write_task(task: dict, session_id: str) -> Path:
    """Записывает задачу в tasks/pending/{timestamp}-drive.json."""
    ts   = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
    slug = re.sub(r"[^a-z0-9]+", "-", task["title"].lower())[:30]
    name = f"{ts}-{slug}.json"
    path = _TASKS_DIR / name

    payload = {
        **task,
        "created_at":    datetime.now(timezone.utc).isoformat(),
        "created_by":    f"drive_system (session={session_id})",
        "status":        "pending",
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return path
