# Development Workflow

## Итерационный цикл

1. Прочитай `DEV_STATE.md` (корень) + `docs/DEV_STATE_SERVER.md` — текущий статус
2. Прочитай `tasks/` — активные задачи; `prompts-to-agent-mode/` — очередь монитора
3. Спроектируй изменение — минимальный diff, сохраняй архитектуру
4. Зафикси допущения в `DEV_STATE.md` до начала работы
5. Просканируй затронутый код — найди противоречия с планом
6. Реализуй по одному логическому блоку — тест перед переходом к следующему
7. Убери тихие ошибки (`catch` без лога, silent fail)
8. Запусти offline-gate: `npm run test:before-start`
9. Обнови `DEV_STATE.md` — дата, статус, следующий шаг
10. Выполненные задачи → `tasks/_completed/` или `tasks/completed/`

## Правила агента

- **Не задавай вопросов пользователю** — если что-то неясно, зафикси как допущение и продолжай
- Выполняй от простого к сложному
- Один логический блок за раз — тест перед переходом
- Silent errors — баги: каждый `catch` должен логировать
- Нет неявного `any`
- Импорты требуют `.js` расширения (NodeNext moduleResolution)
- `a2a-server` не имеет входящих зависимостей от `a2a-client` пакетов
- Устаревшие файлы → `_deprecated/` (не удалять)
- После каждой фазы — явная сводка находок в `DEV_STATE.md`

## Empty Queue Policy

"Очередь пуста" ≠ "работа завершена". Всегда:
1. Pruне выполненные элементы
2. Обнаружь новую работу
3. Запиши задачи
4. Запусти Task Monitor если очередь всё ещё пуста

Никогда не останавливайся без этого цикла обслуживания.

## Evidence Rule

Каждая итерация должна записывать runtime-доказательства:
- Запусти конкретную проверку (тест / сессия / curl / скрипт)
- Захвати идентификаторы/сигналы (sessionId, promiseId, test output)
- Запиши в `DEV_STATE.md`

Нет доказательств = нет закрытия.

## DEV_STATE.md формат

```markdown
# DEV_STATE — YYYY-MM-DD

## Services
| Service | Status | Port | Notes |
|---------|--------|------|-------|
| a2a-server | running | 3000 | — |
| client-api | running | 3001 | — |
| web-ui | running | 5173 | — |
| a2a-ai-hub | running | 11434 | — |

## Open questions
- [ ] вопрос 1

## Completed this session
- task-name: краткое описание + evidence

## Next step
Конкретное следующее действие
```

## Запуск стека

```bash
# Полный стек (всегда из корня репозитория)
npm run dev

# Проверка здоровья
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:11434/health

# Остановка
node scripts/runbook-cli.js stop
# или
.\stop-all-node.bat
```

## Task Monitor (основной драйвер)

```bash
# Один проход очереди prompts-to-agent-mode/
npm run monitor:once

# Непрерывный режим
npm run monitor

# Полный offline-gate + monitor:once
npm run central

# Только offline-gate (без monitor:once)
npm run central:offline
```

## Offline gate (перед деплоем)

```bash
npm run test:before-start
# = indirect tests + server unit tests + test:monitor + verify:audit-session-storage

# Симуляции
npm run sim:lint -- --all
npm run sim:validate -- --all

# Кросс-системная валидация
npm run cross-system:validate
```

## Schema debugging

При проблемах с формой данных — начинай с:
```
tests/direct-tests/README.md
tests/direct-tests/validators/README.md
```

Validators: `npm run scan-promise-bodies`, `npm run scan-session-responses`, `npm run verify:gray-room`

## Гигиена (застрявший монитор / зомби-стек)

```bash
# Убить все процессы
.\stop-all-node.bat
# или
node scripts/runbook-cli.js stop

# Очистить сессии и storage
npm run cleanup:state

# Сбросить указатель Task Monitor
npm run monitor:reset

# Затем перезапустить
npm run dev
```
