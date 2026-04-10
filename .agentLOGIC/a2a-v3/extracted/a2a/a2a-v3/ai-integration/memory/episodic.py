"""
Episodic Memory v2.0 — межсессионный лог действий агента.

Источники идей:
- memoire (CoRhino): recent-actions log + behavior context на старте сессии
- hermes-agent (NousResearch): горячий MEMORY.md слой + лимит вставки в промпт
- MemRL / Mem-α: RL-обучение конструированию памяти
- A-MEM: Zettelkasten-связи между записями памяти

Принцип v2.0:
  На старте каждой сессии агент получает:
    1. Semantic Extract — ключевые факты из прошлых запросов
    2. Episodic Recall — поиск похожих ошибок/паттернов
    3. Последние N действий (episodic tail)
    4. Накопленные поведенческие правила (behavior notes)
  После завершения сессии — записывает действия в лог + MEM_STORE блок.
  Раз в 50 сессий — фоновая компрессия (summarize old entries).
  Zettelkasten-связи между записями через embedding similarity.
"""

import os, json, time, threading, re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ── Пути ──────────────────────────────────────────────────────────────────
_BASE = Path(os.getenv("MEMORY_DIR", Path(__file__).parent / "store"))
_BASE.mkdir(parents=True, exist_ok=True)

EPISODIC_LOG      = _BASE / "episodic_log.jsonl"   # одна запись = один action
BEHAVIOR_NOTES    = _BASE / "behavior_notes.md"     # правила/паттерны поведения
SESSION_INDEX     = _BASE / "session_index.json"     # индекс сессий для compaction
SEMANTIC_INDEX    = _BASE / "semantic_index.jsonl" # семантический индекс
LINKS_INDEX       = _BASE / "links_index.json"     # Zettelkisten ссылки между записями

_MAX_HOT_ENTRIES   = 40     # сколько записей вставляем в промпт (горячий слой)
_MAX_PROMPT_CHARS  = 2000   # лимит символов в промпте (hermes-agent: 2200)
_COMPACT_EVERY     = 50     # сессий до compaction старых записей
_RECALL_TOP_K      = 5      # количество записей для episodic recall
_SEMANTIC_SIMILARITY_THRESHOLD = 0.7  # порог сходства для связывания

_lock = threading.Lock()


# ── Инициализация файлов ───────────────────────────────────────────────────
def _ensure_files():
    if not EPISODIC_LOG.exists():
        EPISODIC_LOG.write_text("")
    if not BEHAVIOR_NOTES.exists():
        BEHAVIOR_NOTES.write_text(
            "# Behavior Notes\n\n"
            "> Автоматически обновляется агентом. Правила поведения на основе опыта.\n\n"
        )
    if not SESSION_INDEX.exists():
        SESSION_INDEX.write_text(json.dumps({"total_sessions": 0, "last_compact": 0}))
    if not SEMANTIC_INDEX.exists():
        SEMANTIC_INDEX.write_text("")
    if not LINKS_INDEX.exists():
        LINKS_INDEX.write_text(json.dumps({}))


# ── MEM_STORE Block Parser ─────────────────────────────────────────────────
def parse_mem_store_block(text: str) -> Optional[dict]:
    """
    Парсит [MEM_STORE] блок в конце ответа агента.
    Формат:
    [MEM_STORE]
    {
      "observation": "что произошло",
      "outcome": "ok|failed|partial",
      "reflection": "что улучшить в следующий раз"
    }
    """
    match = re.search(r'\[MEM_STORE\]\s*(\{[\s\S]*?\})\s*$', text.strip(), re.MULTILINE)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    return None


# ── Semantic Extract ───────────────────────────────────────────────────────
def extract_semantic_facts(text: str) -> list[str]:
    """
    Извлекает ключевые факты из текста запроса.
    Простая эвристика: существительные фразы, числа, специфичные термины.
    """
    facts = []

    # Извлекаем числа с единицами измерения
    numbers = re.findall(r'\d+(?:\.\d+)?\s*(?:MB|GB|KB|ms|s|min|час|дней|files|lines|nodes)', text)
    for n in numbers[:3]:
        facts.append(f"quantitative: {n}")

    # Извлекаем специфичные паттерны
    patterns = [
        (r'(?:error|exception|failed):\s*([^\n]+)', 'error'),
        (r'(?:timeout|timed out):\s*([^\n]+)', 'timeout'),
        (r'(?:success|completed|done):\s*([^\n]+)', 'success'),
    ]
    for pattern, label in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches[:2]:
            facts.append(f"{label}: {m[:80]}")

    # Извлекаем домены/категории
    domains = re.findall(r'(?:file|code|test|api|database|config|server|client)', text, re.IGNORECASE)
    for d in set(domains[:3]):
        facts.append(f"domain: {d.lower()}")

    return facts[:5]


# ── Простой embedding (синонимы для подсчёта similarity) ───────────────────
_SYNONYM_GROUPS = [
    {'error', 'fail', 'bug', 'issue', 'problem', 'exception'},
    {'success', 'done', 'complete', 'finished', 'ok', 'working'},
    {'slow', 'timeout', 'delay', 'latency', 'performance'},
    {'fast', 'quick', 'efficient', 'optimized'},
    {'file', 'path', 'directory', 'folder'},
    {'api', 'endpoint', 'route', 'request'},
    {'memory', 'ram', 'storage', 'cache'},
    {'test', 'testing', 'validation', 'verify'},
]

def _get_synonym_key(word: str) -> Optional[str]:
    """Возвращает группу синонимов для слова."""
    word = word.lower()
    for i, group in enumerate(_SYNONYM_GROUPS):
        if word in group:
            return f"syn_{i}"
    return None


def compute_text_similarity(text1: str, text2: str) -> float:
    """
    Простой подсчёт сходства текстов через синонимы и общие слова.
    Возвращает значение 0-1.
    """
    words1 = set(w.lower() for w in re.findall(r'\w+', text1))
    words2 = set(w.lower() for w in re.findall(r'\w+', text2))

    # Добавляем синонимы
    keys1 = set()
    keys2 = set()
    for w in words1:
        keys1.add(w)
        syn = _get_synonym_key(w)
        if syn:
            keys1.add(syn)
    for w in words2:
        keys2.add(w)
        syn = _get_synonym_key(w)
        if syn:
            keys2.add(syn)

    if not keys1 or not keys2:
        return 0.0

    intersection = len(keys1 & keys2)
    union = len(keys1 | keys2)

    return intersection / union if union > 0 else 0.0


# ── Запись действия с MEM_STORE ──────────────────────────────────────────
def log_action(
    session_id: str,
    action: str,
    task: str,
    result_summary: str,
    outcome: str = "ok",   # ok | failed | partial
    thought: str = "",
    agent_response: str = "",  # полный ответ агента для парсинга MEM_STORE
):
    """Дописывает одну запись в episodic log. Thread-safe. Поддерживает MEM_STORE."""
    _ensure_files()

    # Парсим MEM_STORE блок из ответа
    mem_store = None
    semantic_facts = []

    if agent_response:
        mem_store = parse_mem_store_block(agent_response)
        semantic_facts = extract_semantic_facts(task + " " + agent_response)

    entry = {
        "ts":        datetime.now(timezone.utc).isoformat(),
        "session":   session_id,
        "action":    action,
        "task":      task[:120],
        "result":    result_summary[:200],
        "outcome":   outcome,
        "thought":   thought[:80] if thought else "",
        "mem_store": mem_store,  # v2.0: observation, outcome, reflection
        "semantic_facts": semantic_facts,  # v2.0: извлеченные факты
    }

    with _lock:
        with open(EPISODIC_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

        # Обновляем семантический индекс
        _update_semantic_index(entry)

        # Обновляем Zettelkasten связи
        _update_links(entry)


def _update_semantic_index(entry: dict):
    """Обновляет семантический индекс."""
    if not entry.get("semantic_facts"):
        return

    semantic_entry = {
        "ts": entry["ts"],
        "session": entry["session"],
        "task": entry["task"],
        "facts": entry["semantic_facts"],
        "outcome": entry["outcome"],
    }

    with open(SEMANTIC_INDEX, "a", encoding="utf-8") as f:
        f.write(json.dumps(semantic_entry, ensure_ascii=False) + "\n")


def _update_links(entry: dict):
    """Обновляет Zettelkasten связи между записями."""
    links = json.loads(LINKS_INDEX.read_text(encoding="utf-8") or "{}")

    entry_id = entry["ts"]
    new_links = []

    # Читаем последние записи для поиска связей
    try:
        lines = EPISODIC_LOG.read_text(encoding="utf-8").strip().splitlines()
        recent_entries = []
        for line in reversed(lines[:-1]):  # исключаем текущую запись
            if not line.strip():
                continue
            try:
                e = json.loads(line)
                recent_entries.append(e)
                if len(recent_entries) >= 20:
                    break
            except json.JSONDecodeError:
                continue

        # Ищем связанные записи
        for recent in recent_entries:
            recent_id = recent["ts"]
            if recent_id == entry_id:
                continue

            # Проверяем семантическое сходство
            task1 = entry.get("task", "") + " " + " ".join(entry.get("semantic_facts", []))
            task2 = recent.get("task", "") + " " + " ".join(recent.get("semantic_facts", []))

            similarity = compute_text_similarity(task1, task2)

            if similarity >= _SEMANTIC_SIMILARITY_THRESHOLD:
                # Добавляем双向链接
                if recent_id not in links:
                    links[recent_id] = []
                if entry_id not in links[recent_id]:
                    links[recent_id].append(entry_id)
                if entry_id not in links:
                    links[entry_id] = []
                if recent_id not in links[entry_id]:
                    links[entry_id].append(recent_id)
                new_links.append(recent_id)

        LINKS_INDEX.write_text(json.dumps(links, ensure_ascii=False))

        if new_links:
            print(f"[episodic] Added {len(new_links)} Zettelkasten links for entry {entry_id}")

    except Exception as e:
        print(f"[episodic] Link update error: {e}")


# ── Semantic Recall ───────────────────────────────────────────────────────
def recall_similar(
    task: str,
    current_session_id: str = "",
    top_k: int = _RECALL_TOP_K,
) -> list[dict]:
    """
    v2.0: Episodic Recall — поиск похожих записей в памяти.
    Возвращает top-k записей с похожими задачами или фактами.
    """
    _ensure_files()

    if not EPISODIC_LOG.exists():
        return []

    candidates = []

    try:
        lines = EPISODIC_LOG.read_text(encoding="utf-8").strip().splitlines()
        for line in reversed(lines):
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
                # Исключаем текущую сессию
                if entry.get("session") == current_session_id:
                    continue

                # Вычисляем сходство
                task1 = task + " " + " ".join(extract_semantic_facts(task))
                task2 = entry.get("task", "") + " " + " ".join(entry.get("semantic_facts", []))

                similarity = compute_text_similarity(task1, task2)

                if similarity > 0:
                    candidates.append({
                        "entry": entry,
                        "similarity": similarity,
                    })
            except json.JSONDecodeError:
                continue

        # Сортируем по сходству и берём top-k
        candidates.sort(key=lambda x: x["similarity"], reverse=True)
        return [c["entry"] for c in candidates[:top_k]]

    except Exception as e:
        print(f"[episodic] Recall error: {e}")
        return []


# ── Semantic Extract из памяти ─────────────────────────────────────────────
def get_semantic_context(task: str, current_session_id: str = "") -> str:
    """
    v2.0: Semantic Extract — возвращает извлечённые факты из похожих записей.
    """
    similar = recall_similar(task, current_session_id, top_k=3)

    if not similar:
        return ""

    parts = ["## Semantic Context (learned from similar tasks):"]

    for entry in similar:
        ts_short = entry.get("ts", "")[:10]
        outcome_mark = "✓" if entry.get("outcome") == "ok" else ("✗" if entry.get("outcome") == "failed" else "~")
        facts = entry.get("semantic_facts", [])

        parts.append(f"\n[{ts_short}] {outcome_mark} {entry.get('task', '')[:60]}")
        if facts:
            parts.append(f"  Facts: {'; '.join(facts[:3])}")
        if entry.get("mem_store", {}).get("reflection"):
            parts.append(f"  Reflection: {entry['mem_store']['reflection'][:100]}")

    return "\n".join(parts)


# ── Обновление behavior notes ──────────────────────────────────────────────
def add_behavior_note(note: str):
    """Добавляет наблюдение в behavior_notes.md. Дублирование проверяется по первым 60 символам."""
    _ensure_files()
    snippet = note.strip()[:60]
    with _lock:
        content = BEHAVIOR_NOTES.read_text(encoding="utf-8")
        if snippet in content:
            return  # уже есть
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        BEHAVIOR_NOTES.write_text(
            content + f"\n- [{ts}] {note.strip()}\n",
            encoding="utf-8"
        )


# ── Загрузка контекста для промпта v2.0 ─────────────────────────────────
def load_session_context(current_session_id: str = "", task: str = "") -> str:
    """
    Возвращает строку для вставки в системный промпт агента v2.0.
    Включает:
      1. Semantic Extract — извлечённые факты из похожих задач
      2. Episodic Recall — похожие прошлые записи
      3. Behavior notes — поведенческие правила
      4. Recent actions — последние N action-записей
    Ограничено _MAX_PROMPT_CHARS символами.
    """
    _ensure_files()
    parts = []
    remaining_chars = _MAX_PROMPT_CHARS

    # 1. Semantic Extract (v2.0)
    if task:
        semantic = get_semantic_context(task, current_session_id)
        if semantic and len(semantic) < remaining_chars:
            parts.append(semantic)
            remaining_chars -= len(semantic)

    # 2. Behavior notes (всегда)
    behavior = BEHAVIOR_NOTES.read_text(encoding="utf-8").strip()
    if len(behavior) > 200 and remaining_chars > 200:
        behavior_part = "## Behavior notes (learned rules):\n" + behavior[:min(600, remaining_chars)]
        parts.append(behavior_part)
        remaining_chars -= len(behavior_part)

    # 3. Recent actions (episodic tail)
    entries = _read_recent(current_session_id, limit=_MAX_HOT_ENTRIES)
    if entries and remaining_chars > 100:
        lines = ["## Recent actions (last sessions):"]
        for e in entries:
            outcome_mark = "✓" if e["outcome"] == "ok" else ("✗" if e["outcome"] == "failed" else "~")
            ts_short = e["ts"][:10]
            entry_text = (
                f"  [{ts_short}] {outcome_mark} [{e['action']}] {e['task'][:60]}"
                + (f" → {e['result'][:60]}" if e["result"] else "")
            )
            if len("\n".join(lines)) + len(entry_text) < remaining_chars:
                lines.append(entry_text)
        parts.append("\n".join(lines))

    full = "\n\n".join(parts)
    return full[:_MAX_PROMPT_CHARS] if full.strip() else ""


def _read_recent(exclude_session: str, limit: int) -> list:
    """Читает последние N записей из episodic log, исключая текущую сессию."""
    if not EPISODIC_LOG.exists():
        return []
    try:
        lines = EPISODIC_LOG.read_text(encoding="utf-8").strip().splitlines()
        entries = []
        for line in reversed(lines):
            if not line.strip():
                continue
            try:
                e = json.loads(line)
                if e.get("session") != exclude_session:
                    entries.append(e)
                if len(entries) >= limit:
                    break
            except json.JSONDecodeError:
                continue
        return list(reversed(entries))
    except Exception:
        return []


# ── Счётчик сессий + compaction trigger ───────────────────────────────────
def register_session_end(session_id: str):
    """
    Вызывается при завершении сессии.
    Инкрементирует счётчик. Каждые _COMPACT_EVERY сессий запускает compaction в фоне.
    """
    _ensure_files()
    with _lock:
        idx = json.loads(SESSION_INDEX.read_text(encoding="utf-8"))
        idx["total_sessions"] += 1
        SESSION_INDEX.write_text(json.dumps(idx), encoding="utf-8")
        total = idx["total_sessions"]
        last_compact = idx.get("last_compact", 0)

    if total - last_compact >= _COMPACT_EVERY:
        t = threading.Thread(target=_compact_old_entries, daemon=True)
        t.start()


def _compact_old_entries():
    """
    Фоновая компрессия: старые записи (>_MAX_HOT_ENTRIES) сворачиваются
    в summary-строки, чтобы log не рос бесконечно.
    Оставляем последние _MAX_HOT_ENTRIES * 3 записей, остальное удаляем.
    """
    try:
        with _lock:
            lines = EPISODIC_LOG.read_text(encoding="utf-8").strip().splitlines()
            keep = _MAX_HOT_ENTRIES * 3
            if len(lines) <= keep:
                return
            # Оставляем только последние keep
            new_lines = lines[-keep:]
            EPISODIC_LOG.write_text("\n".join(new_lines) + "\n", encoding="utf-8")

            idx = json.loads(SESSION_INDEX.read_text(encoding="utf-8"))
            idx["last_compact"] = idx["total_sessions"]
            SESSION_INDEX.write_text(json.dumps(idx), encoding="utf-8")

        print(f"[episodic] compacted: kept {keep} of {len(lines)} entries")
    except Exception as e:
        print(f"[episodic] compact error: {e}")


# ── Debug: показать все связи ─────────────────────────────────────────────
def show_links(session_id: str = "") -> dict:
    """Показывает Zettelkasten связи для заданной сессии или всех записей."""
    _ensure_files()
    links = json.loads(LINKS_INDEX.read_text(encoding="utf-8") or "{}")

    if session_id:
        # Находим записи по session_id
        matching = []
        try:
            lines = EPISODIC_LOG.read_text(encoding="utf-8").strip().splitlines()
            for line in lines:
                if not line.strip():
                    continue
                try:
                    e = json.loads(line)
                    if e.get("session") == session_id:
                        matching.append(e["ts"])
                except json.JSONDecodeError:
                    continue

            # Собираем все связи
            all_linked = set()
            for ts in matching:
                if ts in links:
                    all_linked.update(links[ts])

            return {"session": session_id, "entries": matching, "linked_to": list(all_linked)}
        except Exception as e:
            return {"error": str(e)}

    return {"total_links": len(links)}
