# Ollama Actions - LLM действия

Действия с использованием локальных LLM моделей через Ollama.

## Модели

### Доступные модели
- llama3.2 - General purpose
- codellama - Code generation
- mistral - Fast inference
- phi3 - Lightweight

## Использование

### 1. Task Decomposition
```
agent: Разбиение задачи на подзадачи
model: llama3.2
prompt: Проанализируй задачу и разбей на atomic действия
```

### 2. Code Generation
```
agent: Генерация кода
model: codellama
prompt: Сгенерируй код на основе контекста
```

### 3. Semantic Analysis
```
agent: Семантический анализ
model: mistral
prompt: Проанализируй семантику кода
```

## Конфигурация

```
json
{
  "model": "llama3.2",
  "temperature": 0.7,
  "max_tokens": 4096,
  "stream": false
}
