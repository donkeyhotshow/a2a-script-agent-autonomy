"""
reasoning.py — центральный обработчик агентных запросов.

Улучшения (внедрены 2026-03):
  ① Episodic memory   — межсессионный лог действий (из memoire)
  ② Iteration budget  — счётчик итераций, защита от зависания (из hermes-agent)
  ③ Drive system      — автономная генерация задач при пустой очереди (из MAX/CAR)
  ④ Contextspace      — структурированный контекст пробуждения (из codex-autorunner)
  ⑤ Memory nudge      — напоминание сохранить важное при высоком использовании бюджета
"""

import os
import json
from model_router import ModelRouter

router = ModelRouter()

# ── Memory imports (graceful degradation) ─────────────────────────────────
try:
    from memory.episodic        import log_action, load_session_context, add_behavior_note, register_session_end
    from memory.iteration_budget import IterationBudget
    from memory.drive_system    import run_idle_protocol
    from memory.contextspace    import build_contextspace, format_for_prompt, save_session_output
    _MEMORY_AVAILABLE = True
except ImportError as _mem_err:
    print(f"[reasoning] memory modules not available: {_mem_err}")
    _MEMORY_AVAILABLE = False

# ── In-memory budget registry ──────────────────────────────────────────────
_budgets: dict = {}


# ── Pattern store integration ──────────────────────────────────────────────
def find_similar_patterns(task):
    try:
        from pattern_store import find_similar_patterns as _find
        return _find(task)
    except Exception:
        return []

def format_patterns_for_prompt(patterns):
    if not patterns:
        return ""
    lines = ["## Successful past patterns (use as reference):"]
    for p in patterns[:3]:
        lines.append(f"- Task: {p.get('task','')} -> Action: {p.get('action','')} | {p.get('result','')}")
    return "\n".join(lines)

def save_pattern_with_outcome(session_id, task, action_name, result_summary, outcome):
    try:
        from pattern_store import save_pattern, update_score
        save_pattern(session_id, task, action_name, result_summary)
        if outcome == "failed":
            update_score(task, delta=-0.2)
        elif outcome == "completed":
            update_score(task, delta=+0.1)
    except Exception as e:
        print(f"[reasoning] pattern save error: {e}")


# ── Response parser ────────────────────────────────────────────────────────
def parse_reasoning_response(raw):
    try:
        import re
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
        return {"action-name": "error", "post": "Failed to parse response"}
    except Exception:
        return {"action-name": "error", "post": "Failed to parse response"}


# ── System prompt ──────────────────────────────────────────────────────────
REASONING_SYSTEM_PROMPT = """
You are an autonomous technical agent. Priority: ACT, not explain.

## TAO loop — run every turn

T (Think):   What do I know? What is missing? What is the single highest-value next step?
A (Act):     Choose exactly ONE action.
O (Observe): After result — confirmed or contradicted?
             Contradicted -> stay, re-Think. Confirmed -> advance.

## Self-verify before writing files

Before any write action:
- Is the path confirmed in findings? If not -> read first.
- Is it already in files_touched? If yes -> skip.

## ONE-STEP LAW — each response contains EXACTLY ONE of:
  (A) action  -> execute it, report one sentence AFTER
  (B) question -> only if task is physically impossible without answer

## FORBIDDEN:
  x "I will now do X" — just do X
  x question + action in same response
  x two questions in a row
  x explaining the obvious

## WHEN TO ASK (only these cases):
  - direct contradiction in the task
  - two paths with irreversibly different consequences
  - specific ID/name needed that cannot be inferred

## WHEN NOT TO ASK — act and report assumption:
  - unknown file -> find most likely, act, write "assumed X"
  - unclear style -> use existing project style
  - low confidence -> try most probable path, note "assumed X"

## WORKBENCH sections — update every turn:
  findings:      what was discovered
  files_touched: every file written this session
  decisions:     choices made and WHY
  next_step:     the very next action (one line)

Every 8 turns: compact findings into 3-line summary.

## RETRY GUARD:
  If same action fails 3 times -> explain what failed, why, and stop.
  Do NOT loop a 4th time.

## BUDGET STOP:
  If you receive action-name "budget_stop" — write remaining work to tasks/pending/
  via save_to_pending action, then stop. Do NOT continue iterating.

## RESPONSE FORMAT — strict JSON:
```json
{
  "action-name": "action_name",
  "thought": "T: what I know / A: chosen action / O: expected result",
  "verify": "path confirmed in findings",
  "execute": { ... },
  "post": "one sentence what was done"
}
```
"""

# ── Task classifier ────────────────────────────────────────────────────────
AMBIGUITY_SIGNALS = [
    lambda t: len(t.split()) < 6,
    lambda t: not any(w in t.lower() for w in [
        "fix","add","remove","update","create","change","refactor","delete",
        "isправь","добавь","удали","обнови","создай","измени","убери","перенеси",
        "виправ","додай","видали","онови","створи","зміни","перенеси"
    ]),
    lambda t: t.count(" або ") > 1 or t.count(" or ") > 1 or t.count(" или ") > 1,
]

def classify_task(task: str) -> str:
    has_file = any(ext in task.lower() for ext in [".ts",".js",".py",".json",".md",".vue",".php"])
    score = sum(1 for s in AMBIGUITY_SIGNALS if s(task))
    if score >= 2 and not has_file:
        return "ambiguous"
    return "clear"


# ── History formatter ──────────────────────────────────────────────────────
def _format_history(history: list) -> str:
    lines = []
    total = len(history)
    for i, h in enumerate(history):
        age = total - i
        action = h.get('action', '?')
        if age <= 5:
            result = h.get('result_summary', h.get('summary', ''))[:70]
            thought = h.get('thought', '')
            entry = f"[{action}]: {result}"
            if thought:
                entry += f" | T: {thought[:50]}"
            lines.append(entry)
        else:
            lines.append(f"[{action}]")
    return "\n".join(lines[-12:]) or "none"


# ── Memory nudge ──────────────────────────────────────────────────────────
def _maybe_inject_memory_nudge(budget, prompt: str) -> str:
    if not budget or not _MEMORY_AVAILABLE:
        return prompt
    if budget.used / budget.max_iterations >= 0.75:
        nudge = (
            "\n\n## MEMORY NUDGE\n"
            f"You have used {budget.used}/{budget.max_iterations} iterations. "
            "Before budget runs out: save key findings via add_behavior_note action, "
            "and write remaining tasks to tasks/pending/. "
            "Prioritize completing or handing off current task cleanly."
        )
        return prompt + nudge
    return prompt


# ── Prompt builder ─────────────────────────────────────────────────────────
def build_reasoning_prompt(task, context, history_str, patterns_ctx, agent_md="", episodic_ctx=""):
    agent_rules = f"\n## Project rules (AGENT.md):\n{agent_md}\n" if agent_md else ""
    episodic_section = f"\n## Episodic context (recent sessions):\n{episodic_ctx}\n" if episodic_ctx else ""
    return (
        f"{REASONING_SYSTEM_PROMPT}"
        f"{agent_rules}"
        f"{episodic_section}"
        f"\n\nHistory:\n{history_str}"
        f"\n\nPatterns:\n{patterns_ctx}"
        f"\n\nTask: {task}"
        f"\nContext: {context}"
    )

def _load_agent_md() -> str:
    for path in ["AGENT.md", "../AGENT.md", "../../AGENT.md"]:
        if os.path.exists(path):
            try:
                with open(path) as f:
                    return f.read()[:2000]
            except Exception:
                pass
    return ""


# ── Session lifecycle ──────────────────────────────────────────────────────
def init_session(session_id: str, task: str = "") -> dict:
    """
    Вызывается при создании новой агентной сессии.
    Возвращает contextspace для вставки в первый системный промпт.
    """
    if not _MEMORY_AVAILABLE:
        return {"session_id": session_id}

    budget = IterationBudget.load_or_create(session_id)
    _budgets[session_id] = budget

    ctx = build_contextspace(session_id, task_override=task or None)
    return {
        "contextspace":     ctx,
        "contextspace_str": format_for_prompt(ctx),
        "budget_remaining": budget.remaining,
    }


def end_session(session_id: str, summary: str, pending_notes: str = "", completed_tasks: list = None):
    """Вызывается при завершении агентной сессии."""
    if not _MEMORY_AVAILABLE:
        return
    save_session_output(session_id, summary, pending_notes, completed_tasks)
    register_session_end(session_id)
    _budgets.pop(session_id, None)


# ── Main handler ───────────────────────────────────────────────────────────
def handle_agent_request(task, context, history, session_id=""):

    # ① Iteration budget check
    budget = None
    if _MEMORY_AVAILABLE and session_id:
        budget = _budgets.get(session_id)
        if budget is None:
            budget = IterationBudget.load_or_create(session_id)
            _budgets[session_id] = budget

        ok, status_msg = budget.tick(action="handle_agent_request", note=task[:40])
        if not ok:
            if _MEMORY_AVAILABLE:
                log_action(session_id, "budget_stop", task, status_msg, outcome="partial")
            return budget.forced_stop_response()

    # ② Classify task
    if classify_task(task) == "ambiguous":
        clarify_prompt = (
            f'Task "{task}" is ambiguous. '
            f'Ask ONE clarifying question. Only the question, max 12 words.'
        )
        question = router.generate(clarify_prompt).strip()
        return {"execute": {"ask_user": {"question": question}}}

    # ③ Drive system: idle / empty task
    if not task.strip() or task.strip().lower() in ("idle", "empty", "пусто", "нет задач"):
        if _MEMORY_AVAILABLE:
            new_tasks = run_idle_protocol(session_id, model_router=router)
            if new_tasks:
                return {
                    "execute": {
                        "idle_complete": {
                            "discovered": len(new_tasks),
                            "tasks": [t["title"] for t in new_tasks],
                        }
                    },
                    "meta": {
                        "thought": f"Drive system discovered {len(new_tasks)} tasks",
                        "post": f"Idle protocol complete. Created {len(new_tasks)} new tasks.",
                    }
                }
            else:
                return {
                    "execute": {"idle_complete": {"discovered": 0}},
                    "meta": {
                        "thought": "Queue genuinely empty",
                        "post": "Idle protocol: no new tasks discovered. Queue is clean.",
                    }
                }

    # ④ Build context
    history_str  = _format_history(history)
    patterns     = find_similar_patterns(task)
    patterns_ctx = format_patterns_for_prompt(patterns)
    agent_md     = _load_agent_md()

    episodic_ctx = ""
    if _MEMORY_AVAILABLE and session_id:
        try:
            episodic_ctx = load_session_context(current_session_id=session_id)
        except Exception:
            pass

    prompt = build_reasoning_prompt(task, context, history_str, patterns_ctx, agent_md, episodic_ctx)

    # ⑤ Memory nudge
    prompt = _maybe_inject_memory_nudge(budget, prompt)

    # Generate
    raw    = router.generate(prompt)
    parsed = parse_reasoning_response(raw)

    action_name  = parsed.get("action-name", "error")
    thought      = parsed.get("thought", "")
    verify       = parsed.get("verify", "")
    post         = parsed.get("post", "")
    execute_body = parsed.get("execute", {})

    # ⑥ Episodic log
    if _MEMORY_AVAILABLE and session_id:
        outcome = "failed" if action_name == "error" else "ok"
        log_action(
            session_id=session_id,
            action=action_name,
            task=task,
            result_summary=post or str(execute_body)[:100],
            outcome=outcome,
            thought=thought[:80] if thought else "",
        )
        if budget and budget.used % 10 == 0:
            budget.save()

    return {
        "execute": {action_name: execute_body},
        "meta": {
            "thought": thought,
            "verify":  verify,
            "post":    post,
            "iter":    budget.snapshot() if budget else None,
        }
    }
