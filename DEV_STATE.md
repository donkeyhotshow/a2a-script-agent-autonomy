# DEV_STATE (2026-03-05)

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

## Scratchpad / план на следующие шаги
1. Разобраться, как получить „pending ticket“ без мгновенного _PROMISE_EXECUTOR: либо заставить прокси создавать promise для долгих запросов (например, к недоступному target_url), либо изучить, можно ли временно отключить потоковое выполнение, чтобы демон успевал взять promiseId и вызвать /promise/<id>/execute//response вручную.
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
- Запрос POST /api/v1/invoke требует 	ask (обязателен) и context/esult (при последующих шагах); если отправлять только строку 	ask, сервер вернёт promiseId и попытается пройти через Neuron. Подавать JSON строго валидный, иначе client-api шлёт SyntaxError.
- Когда ai-интеграция создаёт promise (?promise=1), _PROMISE_EXECUTOR выполняет target-запрос сразу — pending зеркало живёт лишь долю секунды, поэтому promise_queue_daemon не видел задач пока поток не заблокирован, а к моменту GET /promises/pending модель либо ещё не скачана, либо promise уже в done/rror.
- ollama pull qwen3:8b дважды завершался по таймауту (около 5 минут), поэтому на машине пока нет модели, а ai-инtegration пишет 404 / model not found; нужно либо скачать qwen, либо указать альтернативный доступный model key.

## TODO.md / организационные указания
- Все текущие ручные действия, конфигурации и замечания дублировать в TODO.md по секциям (например, ## start-all, ## promise-daemon, ## manual-invoke-tests).
- Перед добавлением новой секции/пункта проверять, не устарело ли прошлое; очищать блоки, которые больше не актуальны (например, старые порты, нечёткий порядок запуска).
- Если возникает необходимость в новой секции, придерживаться формата ## <имя-секции> и описывать шаги/даты/ссылки на файлы (логи, команды). В строках с TODO: можно указывать краткий статус.
