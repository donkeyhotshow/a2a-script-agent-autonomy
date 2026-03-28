# Simulation: coder

## Опис

Тестуємо екшен "Діалог з AI-кодером" з можливістю пошуку та читання файлів через RAG.

## Пакет @a2a/rag

На клієнті доступний пакет `@a2a/rag`:

- **BM25** - алгоритм пошуку для точного збігу коду
- **TF-IDF** - частота термінів
- **Semantic search** - семантичний пошук з Ollama
- **Hybrid search** - комбінує sparse та dense методи
- **Query understanding** - розуміє намір користувача
- **Suggestions** - підказки автодоповнення

## Workflow

```
1. Client → Server: { task: "допоможи розібратись з кодом" }
           ↓
2. Server → Client: { context, actions: [coder з llmPrompt + file actions] }
           ↓
3. Client → Server: { context, result: { actionId: "coder" } }
           ↓
4. Server → Client: { context, execute: { form } } - запитує повідомлення
           ↓
5. Client → Server: { context, input: { message: "як працює авторизація?" } }
           ↓
6. Server → LLM: system prompt + history + message
           ↓
7. LLM → Server: { response: "потрібно пошукати в коді про авторизацію" }
           ↓
8. Server → Client: { context, execute: { action: rag-search } }
           ↓
9. Client → Server: { context, result: { results: [...], files: [...] } }
           ↓
10. Server → Client: { context, execute: { action: read-file } }
           ↓
11. Client → Server: { context, result: { content: "..." } }
           ↓
12. Server → LLM: продовжує діалог з контекстом файлів
           ↓
13. LLM → Server: { response: "ось як працює авторизація..." }
           ↓
14. Server → Client: { context, result: "ось як працює авторизація...", execute: { form } }
           ↓
... повторюємо діалог
N. Завершення: step = "completed"
```

## Ключові відмінності від dialog

1. **RAG пошук**: замість простого search-files, використовує @a2a/rag:
    - Натуральні запити (не glob pattern)
    - BM25 + semantic search
    - Query understanding

2. **LLM вибирає дію**: LLM аналізує повідомлення користувача і вирішує:
    - Продовжити діалог без дій
    - Виконати RAG пошук
    - Прочитати файл
    - Виконати команду

3. **Context зберігає**:
    - history: історія діалогу
    - searchResults: результати RAG пошуку
    - fileContents: прочитані файли

## Приклад LLM-поведінки

### Крок 5: Користувач питає про авторизацію

```json
{
  "message": "як працює система авторизації?"
}
```

### Крок 7: LLM вирішує зробити RAG пошук

```json
{
  "action": "rag-search",
  "params": {
    "query": "система авторизації JWT токени"
  }
}
```

### Крок 8: Сервер виконує RAG пошук

```json
{
  "execute": {
    "action": "rag-search",
    "query": "система авторизації JWT токени"
  }
}
```

### Крок 9: Клієнт повертає RAG результати

```json
{
  "result": {
    "results": [
      { "file": "src/auth.js", "score": 0.95, "snippet": "function login() {...}" },
      { "file": "src/middleware/auth.ts", "score": 0.87, "snippet": "export function verify() {...}" }
    ],
    "files": ["src/auth.js", "src/middleware/auth.ts"]
  }
}
```

### Крок 12: LLM продовжує з контекстом

LLM отримує повідомлення + RAG результати і може:

- Попросити прочитати конкретний файл
- Відповісти на основі знайденого коду
- Виконати команду

## Очікувані результати

1. Сервер пропонує екшен coder з llmPrompt + RAG actions
2. LLM може вибирати між діалогом та RAG пошуком
3. Контекст зберігає історію та результати операцій
4. Діалог продовжується до завершення

## Правила

1. **Context**: Сервер повністю керує context. Клієнт НЕ додає нічого до context.
2. **Result**: Результат клієнта завжди поза context.
3. **Context propagation**: У кожному новому запиті context такий самий як у попередній відповіді.
4. **Stateless server**: Сервер не зберігає sessionId/projectId - вони залишаються на боці клієнта.
5. **LLM-controlled flow**: LLM вирішує яку дію виконати наступною.
6. **RAG-first**: Спочатку шукаємо через RAG, потім читаємо файли.
