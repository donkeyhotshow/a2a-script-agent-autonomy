# Documentation State Document (Док. Состояние #1)
**Дата итерации:** 2024-10 (итерация 2: dup scan + distribution analysis)
**Цель:** Планирование распределения документации по правильным местам в монопо, оптимизация (слияние дублей, удаление избыточного), итеративное обновление при постепенном анализе.  
**Формат обновления:** Markdown таблица с колонками Status | File/Path | Current Location | Target Location | Action | Notes/Merge | Priority | Dependencies.  
**TODO Tracker:** [docs/TODO.md](docs/TODO.md)

## Information Gathered (Инфо из анализа)
- **Структура проекта:** Монопо с подпроектами (a2a-client/, a2a-server/, ai-integration/, a2a-prototype/, infrastucture/, runbook/, etc.). Каждый имеет docs/ с index.md. Root docs/ существует.
- **Распределение docs:** ~127 .md файлов. Многие в docs/ подпроектов (e.g. a2a-client/docs/WEB-UI.md, API-SERVER.md). Root docs/ имеет ARCHITECTURE.md, PROTOCOL.md, SIMULATION-FORMAT.md, etc. Тестовые симуляции имеют README.md/description.md с похожим контентом (request/response структуры).
- **Дубли/похожести:** Много упоминаний request.md/response.md шаблонов в a2a-server/docs/*.md и симуляциях. AGENTS.md, DEV_STATE.md, GLOSSARY.md в root + подпроектах (нужен мерж в root). TODO.md уже имеет план перемещений (CLIENT-DIALOG → a2a-client/docs/, etc.).
- **Ключевые файлы:** docs/index.md (общий индекс), TODO.md (существующий план), AGENTS.md/GLOSSARY.md (глобальные, дубли в подпроектах), DEV_STATE.md (cross-module).
- **Проблемы:** Рассеянные README.md в tests/simulations/, дубли шаблонов в docs/ и sims/. Нет единого стиля index.md.

## Plan (План обновлений по файлам)
1. **Распределение:** Переместить файлы по темам/подпроектам (e.g. client docs → a2a-client/docs/, sims → a2a-server/docs/simulations/).
2. **Оптимизация:** Слить дубли (e.g. все request/response описания в один PROTOCOL.md в root/a2a-server). Удалить/заархивировать redundant README.md в sims.
3. **Новые файлы:** docs/DOC-STATE.md (этот файл, обновляемый), обновить все index.md с ссылками на глобальный план.
4. **Итеративно:** После перемещений — scan на новые дубли (search_files), update этого файла.

| Status | File/Path | Current | Target | Action | Notes/Merge | Priority | Dependencies |
|--------|-----------|---------|--------|--------|-------------|----------|--------------|
| ✅ | docs/DOC-STATE.md | - | docs/ | created | Этот файл | High | - |
| ✅ | AGENTS.md | root → docs/AGENTS.md | docs/AGENTS.md | moved | Глобальный, no subs dups | High | - |
| ✅ | GLOSSARY.md | root → docs/GLOSSARY.md | docs/GLOSSARY.md | moved | Слить alerts/rooms, no subs dups | High | - |
| ✅ | tests/simulations/README.md + sync/README.md | tests/simulations/ | docs/SIMULATIONS-STRUCTURE.md | merge | Sim layout + rules | High | read tests/simulations/README.md |
| ✅ | request/response templates | a2a-server/docs/*.md | docs/PROTOCOL.md | merge | Один шаблон from dups | High | read a2a-server/docs/server-elements* |

| ✅ | All index.md | subs/docs/index.md | subs/docs/index.md | update links | → root/docs/DOC-STATE.md | Med | - |
| ✅ | DEV_STATE.md | root → docs/DEV_STATE.md | docs/DEV_STATE.md | summarized root | Subs keep full | Med | - |

## Completed Steps
- ✅ docs/TODO.md created with breakdown.
- ✅ docs/DOC-STATE.md created (self).
- ✅ Doc dedup iteration: DEV_STATE triangle/alerts → GLOSSARY/TRIANGLE; evidence rule → AGENTS.md; Task Monitor → OPERATOR-MONITOR-MANUAL-QA.md (2026-04-08).

## Dependent Files to Edit
- AGENTS.md, GLOSSARY.md (merge to docs/).
- docs/index.md (link DOC-STATE).
- Subs index.md.

## Followup Steps
1. **Scan:** `search_files` для дублей после moves.
2. **Test:** Manual review tabs, search "DOC-STATE".
3. **Итерация #2:** Update table после Step 2-4.

**Next:** Proceed to Step 2 (AGENTS/GLOSSARY merge). See [TODO.md](TODO.md).

