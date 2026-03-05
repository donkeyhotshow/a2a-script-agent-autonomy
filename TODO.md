# TODO (2026-03-05)

## start-all
- 2026-03-05: start-all.bat перезапущен из корня после того, как 2a-server/.env начал использовать AI_HUB_URL=http://localhost:11435. Скрипт убивает прослушивающие процессы, очищает .pids.txt, стартует Ollama, ai-интеграцию, 2a-server (лог 2a-server/a2a-server-165.log) и client-api (2a-client/packages/sdk/client-api-12256.log), затем сохраняет PID-ы OLLAMA_PID=3872, AI_INTEGRATION_PID=8344, A2A_SERVER_PID=5636, CLIENT_API_PID=12256.
- kill-all.bat дополнительно завершает CMD-обёртки 	sx watch src/server/index.ts и удаляет .pids.txt; ручная проверка требуется после каждого перезапуска, чтобы убедиться, что не осталось cmd/
pm/ollama.
- TODO: прогнать kill-all.bat → start-all.bat, убедиться, что .pids.txt очищается, логи создаются заново, и новых PID-ов становится ровно четыре (ollama/ai/a2a/client).

## promise-daemon
- 2026-03-05: запущен python ai-integration/scripts/promise_queue_daemon.py --interval 3 --log-level DEBUG --proxy-url http://localhost:11435. В promise-daemon.log демон бесконечно опрашивает /promises/pending, но прокси сразу выполняет promise в _PROMISE_EXECUTOR, поэтому каждое обещание быстро переходит в done, и очередь почти всегда пуста.
- TODO: добиться, чтобы promise оставался в состоянии pending (например, направить его на недоступный 	arget_url, замедлить _PROMISE_EXECUTOR или вручную зарегистрировать promise до вызова xecute), чтобы демон успел логировать шаги xecute → /response. Также повторить запрос после получения модели qwen3:8b и проверить, что лог содержит qwen3:8b output.

## manual-invoke-tests
- 2026-03-05: curl -X POST http://localhost:3001/api/v1/invoke -H "Content-Type: application/json" -d '{"task":"daemon test invoke"}' вернул promiseId cmmdvxzii0000n6zxzkdhcwmm; 2a-server обработал запрос, но Neuron завершился graph_incomplete без вызова LLM (llmHistoryLength:0).
- 2026-03-05: curl -s -X POST http://localhost:11435/api/generate?promise=1 -H "Content-Type: application/json" -d '{"model":"qwen3:8b","prompt":"daemon queue test","stream":false}' вернул promiseId 65b67d219ccb45108a91c440867de805, но /promise/.../response ответил {"error":"model 'qwen3:8b' not found"} и promise быстро перешёл в done. ollama pull qwen3:8b несколько минут ждёт и завершался по таймауту, модель не скачивается.
- TODO: получить рабочую модель (доделать скачивание qwen3:8b или выбрать доступную), повторить POST /api/generate?promise=1, затем дождаться, когда promise_daemon.log покажет Promise ... executed и Qwen output в preview.
