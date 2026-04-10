# Протокол действия: scan-directory

## Описание

Имя `scan-directory` **зарезервировано** в обсуждениях протокола как «объединённое» сканирование (glob, группировка, кэш). В текущей кодовой базе **нет** отдельного ключа `execute` / `result` `scan-directory`: он не зарегистрирован в серверном реестре действий и не обрабатывается клиентским SDK как самостоятельный тип.

## Статус

➖ **Не реализовано как отдельное действие** — используйте [`list-directory.md`](list-directory.md) и [`grep-search.md`](grep-search.md).

## Что использовать вместо

| Задача | Действие | Примечание |
|--------|----------|------------|
| Список файлов под каталогом, фильтр по имени | `list-directory` | На сервере: `dirPath`, `recursive`, `pattern` (упрощённое выражение: `*` в шаблоне заменяется на `.*`, затем `RegExp` по **имени** записи). Есть `maxDepth`, `limit`. |
| Поиск текста по проекту с glob путей | `grep-search` | `pattern`, опционально `path`, `glob`. |
| «Глубокий» glob вида `**/*.test.ts` | — | Полный glob-матчинг **не** описан отдельным контрактом; комбинируйте `list-directory` + `grep-search` или уточняйте `pattern` / `glob` в рамках этих двух действий. |

## Сопоставление с ранним «планом» (не контракт)

Ранее в этом файле фигурировали поля вроде `options.groupBy`, `groups`, `totalSize`, кэш — **они не являются частью реализованного протокола** и остаются вне scope до появления отдельного действия или расширения схем.

## Связанные файлы (реализация)

- Сервер: [`a2a-server/src/actions/handlers/file-operations/list-directory.ts`](../../../../a2a-server/src/actions/handlers/file-operations/list-directory.ts), [`grep-search.ts`](../../../../a2a-server/src/actions/handlers/grep-search.ts)
- Реестр симуляций: [`a2a-server/src/actions/action-handler-registry.ts`](../../../../a2a-server/src/actions/action-handler-registry.ts)
- Клиент (workspace tools): [`a2a-client/packages/sdk/src/action-handlers/workspace-tool-handlers.ts`](../../../../a2a-client/packages/sdk/src/action-handlers/workspace-tool-handlers.ts)

## Связанные схемы

Отдельной JSON-схемы для `scan-directory` нет. Актуальные ключи — те же, что для `list-directory` / `grep-search` в общих схемах execute/result.
