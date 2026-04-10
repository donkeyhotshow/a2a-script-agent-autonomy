# Методология агент-скрипта

Главный метапромпт и обзор рабочих процессов теперь находятся в `methodology/INDEX.md` (≈300 строк).  
Управление запущенным агентом с человека/Cursor через **curl**: `docs/OPERATOR-CURL.md`. **Единый путь после ручного старта стека:** `POST …/api/a2a/sessions` с **`mode: "agent"`** и **`task`**, затем `next` / `async` — `AGENTS.md` → *Unified manual path*; детали vs `invoke`: *Sessions, tests and agent mode*; [ADR-0028](docs/adr/ADR-0028-client-api-deployment-modes.md). **Проверка API сессий / Red Room** — не одна цепочка: полный план [`a2a-client/docs/api-testing-plan.md`](a2a-client/docs/api-testing-plan.md) и [`START-PROMPT-UNLIM.md`](START-PROMPT-UNLIM.md) → *Ручные испытания Client API*. Испытания — через **агентскую сессию** Client API (`mode: "agent"` + `task` на create); при ошибках — **задачи в `tasks/pending/`** + `DEV_STATE` для **других** сессий.

**Пустая очередь:** нет pending / нечего исполнять ⇒ чеклисты и `DEV_STATE` сжать, новую работу найти и вписать — см. `methodology/tasks.md` и `AGENTS.md` (DEV_STATE Protocol).

Дополнительные подробности разделены на:
- `methodology/mode1.md`
- `methodology/mode2.md`
- `methodology/transitions.md`
- `methodology/implementation.md`
- `methodology/tasks.md`
- `methodology/improvements.md`
- `methodology/adr-compliance-orchestrator.md` — очередь ADR + отдельный state-файл + Client API для боевой проверки (см. `docs/adr/README.md` → Tooling)

Для новых сценариев добавляйте файлы в `methodology/`, стараясь держать каждый вспомогательный файл в пределах 100-150 строк.
