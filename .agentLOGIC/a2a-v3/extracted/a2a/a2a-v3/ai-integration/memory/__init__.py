"""
ai-integration/memory — модули автономности агента.

Компоненты:
  episodic.py         — межсессионный лог действий (memoire-подход)
  iteration_budget.py — счётчик итераций, защита от зависания (hermes-agent)
  drive_system.py     — автономная генерация задач при idle (MAX/CAR)
  contextspace.py     — структурированный контекст пробуждения (codex-autorunner)

store/  — персистентные данные (создаётся автоматически):
  episodic_log.jsonl     — лог actions
  behavior_notes.md      — накопленные поведенческие правила
  session_index.json     — индекс для compaction
  prev_session_output.json — вывод последней сессии
  budget_{session_id}.json — снапшоты бюджетов (для long sessions)
"""
