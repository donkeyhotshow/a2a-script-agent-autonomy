# Формат файлов симуляций

## Обзор

Каждая симуляция в папке `simulations/` содержит пошаговое взаимодействие.

## Структура

```
simulations/
├── dialog/
│   ├── 1/ - только .json файлы
│   ├── 2/ - только .json файлы  
│   ├── 3/ - .json + .md файлы (есть LLM вызов!)
│   └── 4/ - .json + .md файлы (есть LLM вызов!)
```

## Типы файлов

| Файл | Направление | Описание |
|------|-------------|----------|
| `request.json` | Client → Server | Запрос от клиента |
| `request.md` | Server → LLM | Запрос к LLM (MARKDOWN!) |
| `response.md` | LLM → Server | Ответ от LLM |
| `response.json` | Server → Client | Ответ клиенту |

## ВАЖНО: request.md - это MARKDOWN!

```markdown
## System Prompt

продолжи диалог в json . ответь обновленным json 

```json
{
  "context": {
    "task": "dialog",
    "execution": {
      "action": "dialog",
      "step": "llm-request"
    },
    "history": [
      {
        "role": "user",
        "message": "hello world"
      }
    ]
  }
}
```
```

Это **НЕ** JSON с полями model/messages. Это **MARKDOWN** с system prompt!

## Правила

1. **request.md = MARKDOWN с system prompt** - LLM должен ответить JSON
2. **Client отправляет content без role** - сервер добавляет role
3. **response.md = context с history** - что будет отправлено LLM в следующем шаге
4. **response.json = response.md + execute** - добавляется форма или результат
