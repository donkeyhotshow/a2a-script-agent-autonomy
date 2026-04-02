# AI-Integration Web UI & Promise Diagnostics

## Зачем
`ai-integration` уже управляет всеми вызовами к Ollama и хранит асинхронные `promiseId`. Веб-интерфейс позволяет быстро просматривать `pending` обещания, копировать запрос, вручную подставлять ответ или переслать запрос дальше — это ускоряет отладку и выкатку новых моделей.

## Что нужно сделать
- Прокси должен выгружать новые endpoints:
  - `GET /promises/pending` — список ожидающих `promiseId`, отсортированных по `created_at`.
  - `GET /promise/<promise_id>/request` — JSON тела запроса (`headers`, `body`, `method`, `path`).
  - `POST /promise/<promise_id>/answer` — вручную установить результат (код, тип содержимого, тело).
  - `POST /promise/<promise_id>/execute` — форвардит запрос к реальному Ollama и сохраняет ответ через `.promises`.
  - Статические файлы `ai-integration/web/*.html|.js` выдаются через `@app.route('/web/<path:filename>')`.
- Web UI (`promise-viewer.html`) должна:<br>
  1. Запрашивать `pending` promises и показывать первый.
  2. Показывать `request` и позволять копировать его, запускать `execute`, вставлять ответ вручную и утверждать его.
  3. Писать `status` и `trace` (например, `Proxy error`, `fetch failed`) рядом с кнопками.
  4. Работать без специальной авторизации (или через `SKIP_AUTH`).

## Быстрое продвижение
1. Создать файл `ai-integration/web/promise-viewer.html` и дополняющий JS/CSS; использовать Fetch API для новых endpoints.
2. Убедиться, что UI подхватывает логи из `proxy_logs/requests/request_*` (они уже сохраняют `save_request`, `save_response`).
3. Подключить страницы к `start-all.*` и `docs/SYSTEM_STARTUP.md` (UI доступен по `http://localhost:11434/web/promise-viewer.html`).
4. Добавить smoke-test: `curl http://localhost:11434/promises/pending` после запуска стека.

## Promise queue daemon

Для сценариев без UI (либо когда нужно сразу одобрять тикеты и собирать вывод qwen), используется скрипт `ai-integration/scripts/promise_queue_daemon.py`.
Он циклично вызывает `/promises/pending`, автоматически запускает `/promise/<promiseId>/execute`, ждёт `/promise/<promiseId>/response` и печатает превью результата.

Пример запуска:
```
python ai-integration/scripts/promise_queue_daemon.py --interval 3 --log-level DEBUG
```

Опции:
- `--proxy-url` — базовый URL прокси (по умолчанию `PROMISE_PROXY_URL`, `PROXY_URL` или `http://localhost:11434`).
- `--no-auto-approve` / `--dry-run` — помочь диагностике без выполнения/авторизации, просто логируются ожидающие тикеты.
- `--response-attempts` / `--response-delay` — рестартит ответ до получения `status 200`.
- `--max-empty-cycles` — выйти после заданного числа циклов без тикетов.

Скрипт полезен, когда нужно держать очередь promise «обработанной» без ручного клика на веб-интерфейсе: он сам одобряет запрос, а затем пишет стрим из Ollama/Qwen в лог.

## Расширенные ссылки
- Подробный план API/UI и workflow — `ai-integration/docs/promise-viewer-plan.md`.
- Связать с `docs/production/PROD_TESTS.md` (ссылка ниже), чтобы прогревать стек и открывать веб-интерфейс до запуска `prod-test`.
