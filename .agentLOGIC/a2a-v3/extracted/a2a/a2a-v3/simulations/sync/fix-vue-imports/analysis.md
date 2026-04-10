# Simulation: fix-vue-imports

## Workflow (golden)

1. Client → Server: початковий `task`
2. Server → Client: `execute.form` (router)
3. Client → Server: `result.choice: fix-vue-imports`
4. Server → Client: `execute.script` (vue-import-detect)
5. Client → Server: `result.script.broken_imports[]`
6. Server → Client: `execute.script` (vue-import-resolve)
7. Client → Server: `result.script` з `partial_escalate`, `patches[]`, `unresolved_imports[]`, лічильниками
8. Server → Client: `execute.form` — **Coder** vs **fix-vue-imports-done-partial**
9. Client → Server: `result.choice: coder`
10. Server → Client: `execute.message` (handoff) + `result` з `handoff_mode: coder`

Трансформ гілки після resolve: `fix-vue-imports-4-request.json` (`switch` за `partial_escalate`).

## Internal steps

1. **vue-import-detect** → `execute.script`
2. **vue-import-resolve** → `execute.script`
3. **vue-import-escalate** → `execute.form` (якщо скрипт не закрив усі імпорти)
4. Handoff у **Coder** — фінальний крок симуляції

## Правила

1. **Context**: сервер керує `context`; клієнт не додає полів до `context` без контракту.
2. **Result**: результат клієнта поза `context`.
3. **Перенесення в Coder**: у `context` лишаються `unresolved_imports` для наступного режиму.

## Відмова від Coder + роутер

Див. [`fix-vue-imports-decline/analysis.md`](../fix-vue-imports-decline/analysis.md).
