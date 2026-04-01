# Апгрейд ai-integration (Ollama Proxy)

Цель апгрейда: сделать прокси более управляемым и безопасным без правок клиентского кода — через конфиг:

- маппинг (алиасы) имен моделей для защиты от "кривых" названий;
- async-режим через `promise` (сразу вернуть `promiseId`, а результат забрать позже);
- симуляция ответа и "скриптование" (правила, которые роутят запросы по моделям или подменяют ответы).

## Что добавлено

### 1) Маппинг имен моделей (алиасы)

Прокси умеет заменять `model` в запросах (JSON body или query `model=...`) по словарю `model_aliases`.

Это решает типичные проблемы:

- клиент присылает "не то имя" (опечатка/старое имя/внутренний алиас);
- нужно централизованно переименовать модель без изменений в клиентах.

Опционально можно включить строгий режим `strict_model_aliases=true`: тогда если `model` не найден в `model_aliases`,
прокси вернёт `400 unknown_model`.

### 2) Promise-режим (не "залипать" на долгом ответе)

Если запрос содержит `promise` (query/header/body), прокси:

1) сразу возвращает `202` и JSON: `{ "promiseId": "...", "status": "pending" }`;
2) выполняет реальный запрос (или симуляцию) в фоне;
3) результат можно забрать по `promiseId`.

Поддерживаемые способы включить promise:

- query: `?promise=1`
- header: `X-Promise: 1`
- JSON body: `"promise": true` (ключ вырезается и наружу не уходит)

Эндпоинты:

- `GET /promise/<promiseId>` — статус (`202 pending`, `200 done`, `500 error`)
- `GET /promise/<promiseId>/response` — итоговый raw-ответ (как у нейронки)

### 3) Симуляция ответа + скриптование правил

Через конфиг можно описать правила:

- *когда* (match): путь, метод, модель (запрошенная/разрешённая), условия по промпту;
- *что делать* (then): подменить модель (`set_model`) или вернуть симулированный ответ (`simulate`).

Это позволяет:

- не дергать "большую" модель (перенаправить на другую или симулировать ответ);
- "прогонять" сценарии без запуска/доступа к реальной нейронке;
- управлять логикой маршрутизации централизованно.

### 4) Виртуальные модели (presence в /api/tags и /api/show)

Если вы хотите "притвориться", что в Ollama установлена модель (чтобы клиенты видели её в списке моделей и могли
получить метаданные),
используйте `virtual_models` в конфиге.

Прокси:

- добавляет виртуальные модели в `GET /api/tags` (и вернёт только виртуальные модели, если Ollama недоступна);
- отдаёт `GET /api/show?model=<name>` из конфига, не ходя в Ollama.

## Конфиг (schema file)

Путь к конфигу задаётся переменной окружения:

- `AI_HUB_CONFIG=...path/to/ai-hub.config.json`

Прокси подхватывает изменения файла по `mtime` (на следующем запросе).

См.:

- пример: `docs/ai-hub.config.example.json`
- JSON Schema: `docs/ai-hub.config.schema.json`

## Примеры использования

### Маппинг моделей

В конфиге:

```
json
{
  "model_aliases": {
    "qwen3:8b": "qwen3:8b",
    "BIG-MODEL": "qwen3:8b"
  }
}
```

Запрос клиента:

```
bash
curl -s http://localhost:11435/api/generate -H "Content-Type: application/json" -d "{\"model\":\"BIG-MODEL\",\"prompt\":\"hi\"}"
```

В Ollama уйдёт `model=qwen3:8b`.

### Promise (async)

```
bash
curl -s "http://localhost:11434/api/generate?promise=1" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"qwen3:8b\",\"prompt\":\"long prompt...\"}"
```

Ответ:

```
json
{"promiseId":"...","status":"pending"}
```

Проверка статуса:

```
bash
curl -i http://localhost:11434/promise/<promiseId>
```

Получение результата:

```
bash
curl -i http://localhost:11434/promise/<promiseId>/response
```

### Симуляция

Правило (пример): если промпт содержит `SIMULATE:` — не ходить в Ollama, вернуть ответ сами.

```
json
{
  "rules": [
    {
      "id": "simulate_smoke",
      "when": { "path_regex": "^api/generate$", "prompt_contains": ["SIMULATE:"] },
      "then": {
        "type": "simulate",
        "builder": "ollama.generate",
        "text": "SIMULATED: {prompt}",
        "delay_ms": 50
      }
    }
  ]
}
```

### Симуляция присутствия модели `rnj-L` (как "топовая Mistral")

См. пример в `docs/ai-hub.config.example.json` (`virtual_models.rnj-L`).
Примечание: чтобы "не палиться", заполняйте `tags/show` данными в формате Ollama (реалистичные
`digest/size/details/license/modelfile`) и не добавляйте произвольные поля, которых нет в ответах Ollama.

### Скрипт для прогона запросов и отчёта в Markdown

Скрипт перезаписывает файл отчёта при каждом запуске и кладёт ответы "блоками" в `.md`.

```
bash
python generate_virtual_model_report.py --base-url http://localhost:11435 --model rnj-L --out docs/virtual_model_report.md
```

Важно: скрипт сначала проверяет, что по `--base-url` отвечает именно наш proxy (`GET /health` должен вернуть JSON со
`status=running`). Если на порту другой сервис или прокси не запущен — скрипт завершится с ошибкой и не запишет отчёт.

Если не хотите руками запускать сервер, используйте авто-режим:

```
bash
python generate_virtual_model_report.py --start-proxy --proxy-port 11434 --config docs/ai-hub.config.example.json --model rnj-L --out docs/virtual_model_report.md
```

## Перспективы (roadmap)

- Плагины/хуки на Python для сложной логики (не только rules JSON).
- Поддержка нескольких провайдеров (Ollama/OpenAI/Anthropic/…): единый роутинг по `provider + model`.
- Очередь задач для promises (Redis/RabbitMQ) + гарантированная доставка/перезапуск.
- Нормальная поддержка стриминга (proxy streaming + логирование чанков).
- Безопасность: токены, ACL, rate limiting, аудит, маскирование секретов/PII в логах.
- Наблюдаемость: метрики, трассировка (OpenTelemetry), structured logs.
- UI для просмотра логов, promises, правил, статистики.
