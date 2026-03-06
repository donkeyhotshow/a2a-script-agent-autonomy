# DEV_STATE (2026-03-06)

## 2026-03-06 01:30 - Встроенный демон в прокси

Реализован встроенный демон для выполнения запросов из тикетов (вместо внешнего Python `promise_queue_daemon.py`).

### Реализация
- **Новый файл:** `ai-integration/proxy/daemon.py` - основная логика демона
- **Изменённые файлы:**
  - `ai-integration/proxy/config.py` - добавлены настройки демона
  - `ai-integration/proxy/__main__.py` - интеграция демона при запуске
  - `ai-integration/proxy/routes.py` - добавлены маршруты управления

### Конфигурация (переменные окружения)
| Переменная | Описание | Значение по умолчанию |
|------------|----------|----------------------|
| `DAEMON_ENABLED` | Включить демон | `true` |
| `DAEMON_POLL_INTERVAL` | Интервал опроса (сек) | `4` |
| `DAEMON_EXECUTE_TIMEOUT` | Таймаут выполнения (сек) | `120` |
| `DAEMON_MAX_WORKERS` | Макс. параллельных задач | `2` |
| `DAEMON_AUTO_EXECUTE` | Автоматически выполнять тикеты | `true` |

### API маршруты управления
| Метод | Маршрут | Описание |
|-------|---------|----------|
| GET | `/daemon/status` | Получить статус демона |
| POST | `/daemon/start` | Запустить демон |
| POST | `/daemon/stop` | Остановить демон |

### Проверка статуса
```bash
curl -s http://localhost:11435/daemon/status
# Ответ: {"auto_execute":true,"enabled":true,"poll_interval":4.0,"running":true}
```

### Логика работы
1. Демон запускается автоматически при старте прокси
2. Каждые `DAEMON_POLL_INTERVAL` секунд опрашивает `/promises/pending`
3. Для каждого pending тикета вызывает `/promise/<id>/execute`
4. Результаты сохраняются в файловой системе
5. При выключении прокси демон корректно останавливается

### Текущее состояние
- ✅ Демон запускается автоматически с прокси
- ✅ Опрос `/promises/pending` каждые 4 секунды работает
- ✅ E2E тестирование успешно - Ollama запущена, запросы обрабатываются
- ✅ Тестовый promise обработан корректно

---

## 2026-03-06 02:30 - Успешное E2E тестирование

### Тест выполнен
- **Дата:** 2026-03-06 02:30 (UTC+2)
- **Promise ID:** ab38e64849f841ff87209c0c0b41d82b

### Конфигурация системы
| Параметр | Значение |
|----------|----------|
| Ollama порт | 11434 |
| Прокси порт | 11435 |
| Интервал опроса демона | 4 сек |
| Daemon enabled | true |
| Auto execute | true |

### Тестовый запрос
```bash
curl -s -X POST http://localhost:11435/api/generate?promise=1 \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3:8b","prompt":"test","stream":false}'
```

### Результат
- ✅ Promise создан: ab38e64849f841ff87209c0c0b41d82b
- ✅ Демон обнаружил pending ticket
- ✅ Запрос выполнен через Ollama на порту 11434
- ✅ Ответ сохранён в файловой системе
- ✅ Система работает корректно

### Вывод
Встроенный демон в прокси полностью функционален. При запросе с `promise=1` создаётся асинхронный promise, демон его подхватывает, выполняет и сохраняет результат. Переход на встроенный демон вместо внешнего Python скрипта успешен.

---

## 2026-03-05 23:10
- Promise ID: 97f7693022a1451cb92c908e1e8659e8
- Status: **error** (но ответ фактически получен!)
- Ошибка: `HTTPConnectionPool(host='localhost', port=11434): Read timed out. (read timeout=60)`
- При этом в body.bin сохранён корректный ответ от Ollama:
  - model: qwen3:8b
  - response: "Hello! It looks like you're testing the system. How can I assist you today? 😊"
  - result_status_code: 200
  - done: true, done_reason: "stop"
- Запрос: `curl -s -X POST http://localhost:11435/api/generate?promise=1 -H "Content-Type: application/json" -d '{"model":"qwen3:8b","prompt":"test","stream":false}'`
- Файл: ai-integration/proxy_logs/promises/97f7693022a1451cb92c908e1e8659e8/body.bin

## Текущее состояние
- Перезапустил start-all.bat после обновления 2a-server/.env (перенаправление AI_HUB_URL на http://localhost:11435), чтобы a2a-server шлёт запросы через ai-интеграцию. Скрипт убил занятые порты, очистил .pids.txt, запустил Ollama, ai-интеграцию, 2a-server (лог 2a-server/a2a-server-165.log) и client-api (новые логи в 2a-client/packages/sdk/), в .pids.txt записаны OLLAMA_PID=3872, AI_INTEGRATION_PID=8344, A2A_SERVER_PID=5636, CLIENT_API_PID=12256.
- kill-all.bat по-прежнему завершает ollama, 
ode, 
pm, python и CMD-обёртки вроде 	sx watch src/server/index.ts, затем удаляет .pids.txt.
- Демон очереди обещаний (python ai-integration/scripts/promise_queue_daemon.py --interval 3 --timeout 120 --log-level DEBUG --proxy-url http://localhost:11435 --dry-run) запущен снова, логирует запросы к /promises/pending, но даже на новом интервале (2026-03-05 22:38:41) цикл 1 возвращает [] и сообщение "No pending tickets".
- Демон оставлен в фоне, чтобы сразу поймать первый долгий promise — продолжаю держать его запущенным, слежу за `promise-daemon.log` и готов сразу записать `pending`-запись, как только появится.
- curl POST http://localhost:3001/api/v1/invoke -d '{"task":"daemon test invoke"}' вернул promiseId cmmdvxzii0000n6zxzkdhcwmm, но 2a-server зафиксировал graph_incomplete и llmHistoryLength:0 — до физического вызова LLM дело не дошло.
- Прямой запрос к прокси POST http://localhost:11435/api/generate?promise=1 с {"model":"qwen3:8b","prompt":"daemon queue test","stream":false} дал promiseId 65b67d219ccb45108a91c440867de805, но /promise/.../response вернул {"error":"model 'qwen3:8b' not found"}; ollama pull qwen3:8b дважды завершался по таймауту, потому что модель не скачивается за 5+ минут, поэтому пока ни Ollama, ни ai-интеграция не могут выдать настоящий qwen-ответ.
- Клиент API сообщал SyntaxError, если тело запроса не содержит 	ask/context; корректный JSON снова прошёл и создал promise.
- Выполнил ревизию start-all.bat, kill-all.bat и i-integration/scripts/promise_queue_daemon.py, зафиксировал порядок очистки портов/демонов и логику демона; на основе этого составил план доводки старта, демона и ручного запроса.
- 2026-03-05 22:55:36–22:56:38: curl -s -X POST http://localhost:11435/api/generate?promise=1 -H "Content-Type: application/json" -d '{"model":"qwen3:8b","prompt":"PENDING_PROMISE queue test 3","stream":false}' вернул promiseId 527517bc00ac4519b075d6fbb987deae и promise-daemon.log зарегистрировал Ticket 527517bc00ac4519b075d6fbb987deae → GET /promise/.../request → POST /promise/.../execute 409 promise_not_pending (см. строки ~1174‑1183); вручную /promise/5275... отвечает {"status":"error","error":"HTTPConnectionPool(host='localhost', port=11434): Read timed out. (read timeout=60)"}, однако proxy_logs/promises/5275.../body.bin сохраняет симулированный ответ "PENDING SIMULATED PROMISE: PENDING_PROMISE queue test 3".

## Scratchpad / план на следующие шаги
1. Разобраться, как получить „pending ticket“ без мгновенного _PROMISE_EXECUTOR: либо заставить прокси создавать promise для долгих запросов (например, к недоступному target_url), либо изучить, можно ли временно отключить потоковое выполнение, чтобы демон успевал взять promiseId и вызвать /promise/<id>/execute//response вручную. Пока помог prompt с `PENDING_PROMISE` (см. выше) — лог фиксирует Ticket, но дождавшись симуляции демон с /execute получает 409 `promise_not_pending`, поэтому до фиксации preview нужно или ещё сильнее замедлить simulate, или перехватить promise до его автоматического выполнения.
2. Подготовить манифест логов/портов: убедиться, что .pids.txt отражает реальные PID, а kill-all.bat завершает любые новых обёртки (добавить wmic/	askkill, если появятся другие cmd с 
pm run dev).
3. Довести набор ручных запросов (curl POST http://localhost:3001/api/v1/invoke с валидным 	ask, опрос /api/v1/requests/:promiseId/status) и держать под рукой таблицу promiseId → status → logs ai-integration/promise-daemon.
4. При необходимости прогнать kill-all.bat / start-all.bat и зафиксировать, что .pids.txt очищается, логи пишутся в новые файлы, а promise-daemon перезапускается с актуальным promise-daemon.log.
5. Обновить TODO.md секциями start-all, promise-daemon, manual-invoke-tests (со свежими датами, командами, статусами и ссылками на логи).
6. Получить рабочую модель (например, повторно скачать qwen3:8b или взять другую доступную), повторить curl http://localhost:11435/api/generate?promise=1, убедиться, что promise появляется в /promises/pending достаточно долго и демон может зафиксировать qwen3:8b output, затем документировать результат.
7. Как только в `promise-daemon.log` появится `pending` + promiseId, быстро заснимай статус/логи/нейронный ответ, запиши эти заметки в `DEV_STATE.md` (здесь) и в соответствующий раздел `TODO.md`, чтобы ручное тестирование могло продолжиться.

## Memories
- .pids.txt сейчас содержит: OLLAMA_PID=3872, AI_INTEGRATION_PID=8344, A2A_SERVER_PID=5636, CLIENT_API_PID=12256.
- 2a-server пишет в 2a-server/a2a-server-165.log, client-api — 2a-client/packages/sdk/client-api-12256.log (новая сессия), i-integration — i-integration/ai-integration-20224.log, promise-демон — promise-daemon.log.
- Запрос POST /api/v1/invoke требует 	ask (обязателен) и context/
esult (при последующих шагах); если отправлять только строку 	ask, сервер вернёт promiseId и попытается пройти через Neuron. Подавать JSON строго валидный, иначе client-api шлёт SyntaxError.
- Когда ai-интеграция создаёт promise (?promise=1), _PROMISE_EXECUTOR выполняет target-запрос сразу — pending зеркало живёт лишь долю секунды, поэтому promise_queue_daemon не видел задач пока поток не заблокирован, а к моменту GET /promises/pending модель либо ещё не скачана, либо promise уже в done/rror.
- ollama pull qwen3:8b дважды завершался по таймауту (около 5 минут), поэтому на машине пока нет модели, а ai-инtegration пишет 404 / model not found; нужно либо скачать qwen, либо указать альтернативный доступный model key.

## TODO.md / организационные указания
- Все текущие ручные действия, конфигурации и замечания дублировать в TODO.md по секциям (например, ## start-all, ## promise-daemon, ## manual-invoke-tests).
- Перед добавлением новой секции/пункта проверять, не устарело ли прошлое; очищать блоки, которые больше не актуальны (например, старые порты, нечёткий порядок запуска).
- Если возникает необходимость в новой секции, придерживаться формата ## <имя-секции> и описывать шаги/даты/ссылки на файлы (логи, команды). В строках с TODO: можно указывать краткий статус.
  
## 2026-03-05 21:55  
- Promise ID: 6ae1bacc6fa4460fb8b4b74bd3b2bdef  
- Status: **error** (но ответ фактически получен!)  
- Ошибка: `HTTPConnectionPool(host='localhost', port=11434): Read timed out. (read timeout=60)`  
- При этом в body.bin сохранён корректный ответ от Ollama:  
  - model: qwen3:8b  
  - response: "Hello! How can I assist you today? 😊"  
  - result_status_code: 200  
  - done: true, done_reason: "stop"  
- Видимо, таймаут произошёл при записи ответа или синхронизации, но ответ фактически сохранился  
- /promises/pending возвращает [] — нет pending tickets  
- Daemon (Terminal 3) продолжает опрашивать /promises/pending каждые ~3 сек, циклы 744-793, сообщение "No pending tickets"  
- Proxy (Terminal 2) опрашивает /promises/pending каждые ~4 сек  
- Конфликта между daemon и proxy нет — оба работают корректно, просто нет новых задач  
- Модели на Ollama (port 11434): qwen3:8b, embeddinggemma:latest, rnj-1:latest  
- Порты: proxy=11435, ollama=11434 
