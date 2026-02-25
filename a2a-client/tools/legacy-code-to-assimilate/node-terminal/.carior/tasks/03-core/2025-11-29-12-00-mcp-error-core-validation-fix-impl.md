# Реализация плана стабилизации MCP server (errorCoreManager / validationUtils)

## Дата создания
2025-11-29 12:00:00

## Исходный запрос пользователя
Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

## Улучшенная формулировка
Реализовать ранее согласованный план стабилизации MCP server, устранив причины ошибок `this.errorCoreManager.registerError is not a function` и `ReferenceError: validationUtils is not defined` за счёт локального адаптера error-core и выравнивания использования `validationUtils` во всех модулях MCP server, не изменяя сам план задачи и сохраняя внешний контракт инструмента `terminal` и обёртки `scripts/wrapper/server-wrapper-simple.cjs`.

## Контекст
Существующий документ `2025-11-29-02-42-mcp-error-core-manager-validationutils.md` в фазе `03-core` описывает анализ проблемы и план действий. Текущая задача — выполнить реализацию в коде, обновить привязку к логам и убедиться, что MCP server больше не порождает указанные ошибки и не создаёт новые `mcp-server-rejection-*.json` при нормальной работе.

## Фаза проекта
- [x] 03-core
- [ ] 01-init
- [ ] 02-foundation
- [ ] 04-architecture
- [ ] 05-development
- [ ] 06-documentation
- [ ] 07-testing
- [ ] 08-security
- [ ] 09-optimization
- [ ] 10-deployment

## Требования
- [ ] Реализовать локальный адаптер error-core, гарантирующий наличие метода `registerError(error, context?)` и защищающий от падений при отсутствии или некорректной реализации `errorCoreManager` во внешних библиотеках.
- [ ] Обеспечить предсказуемое использование `validationUtils` во всех модулях MCP server: явный импорт с fallback или адаптер без зависимости от глобальных переменных.
- [ ] Сохранить внешний контракт MCP инструмента `terminal` и обёртки `server-wrapper-simple.cjs` (интерфейс и поведение для клиента не меняются).
- [ ] Минимизировать объём правок, ограничившись MCP server и его локальными модулями.

## Технические ограничения
- [ ] Не изменять код внешних `@libs/*` библиотек в рамках этого цикла.
- [ ] Не менять версии зависимостей и конфигурацию сборки.
- [ ] Все изменения должны быть обратимы через простой git-откат.
- [ ] Не редактировать существующий план задачи `2025-11-29-02-42-mcp-error-core-manager-validationutils.md`, использовать его только как базу.

## Ожидаемый результат
- [ ] MCP server и обёртка `server-wrapper-simple.cjs` запускаются без внутренних ошибок, связанных с `errorCoreManager` и `validationUtils`.
- [ ] В логах отсутствуют новые записи вида `TypeError: this.errorCoreManager.registerError is not a function` и `ReferenceError: validationUtils is not defined`.
- [ ] В нормальной работе не создаются новые файлы `mcp-server-rejection-*.json`.

## Решение (кратко)
- [ ] Реализовать локальный адаптер error-core и подключить его в `mcp-server.cjs`, привязав к `errorHandler` так, чтобы любые внешние обращения к `this.errorCoreManager` получали объект с безопасным `registerError`.
- [ ] Обновить модули, использующие `validationUtils`, чтобы они выполняли безопасный импорт с fallback-реализацией (минимальные проверки типов и валидация) вместо зависимости от потенциально отсутствующей глобальной переменной.
- [ ] Выполнить быстрый прогон `node -e "require(...)"` через MCP terminal для проверки отсутствия синтаксических/рантайм ошибок при загрузке модулей.
- [ ] При необходимости дополнительно проверить поведение через `server-wrapper-simple.cjs` и убедиться по логам, что ошибки не воспроизводятся.

## Результат
- В процессе реализации (будет обновлено после завершения всех шагов и тестов).

## Статус
- В процессе

## Связанные файлы
- `.carior/tasks/03-core/2025-11-29-02-42-mcp-error-core-manager-validationutils.md` — исходный план стабилизации.
- `mcp-server.cjs` — инициализация ядра, error-handling и валидации.
- `mcp/server/Validation.cjs` — утилиты валидации CWD и путей.
- `mcp/SearchEngine.cjs` — использование `validationUtils` в поиске.
- `mcp/server/modules/Atomic.cjs` — атомарные файловые операции, зависящие от `validationUtils`.
- `lib/archive-adapter.cjs` — адаптер работы с архивами, использующий `validationUtils`.
- `scripts/wrapper/server-wrapper-simple.cjs` — обёртка MCP server для запуска и логирования (для валидации поведения после правок).
















