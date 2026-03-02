# Симуляція: coder

Повний протокол взаємодії Client → Server для екшена "Діалог з AI-кодером" з можливістю пошуку та запису файлів.

## Кто що робить

| Компонент | Відповідальність | Порт |
|-----------|-----------------|------|
| **Web** (a2a-client/web) | Користувальницький інтерфейс, ввід задачі, відображення панелей сесій | 5173 (Vite) |
| **Client API** (a2a-client) | Зберігання сесій, керування станом, виконання скриптів, координація | 3001 |
| **Server** (a2a-server) | Stateless - обробка запитів, генерація actions/steps, відправка скриптів | 3000 |
| **RAG** (@a2a/rag) | Пошук коду: BM25, semantic search, hybrid search | - |

### Розподіл обов'язків

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WEB (порт 5173)                             │
│  - Ввід задачі користувачем                                         │
│  - Відображення панелей сесій                                       │
│  - Форма введення повідомлень                                        │
│  - НЕ знає адресу сервера                                           │
│  - Спілкується тільки з Client API (порт 3001)                      │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CLIENT API (порт 3001)                           │
│  - Зберігає сесії та стан                                           │
│  - Створює сесії                                                    │
│  - Відправляє task на Server                                         │
│  - Отримує actions/steps від Server                                 │
│  - Виконує DSL скрипти локально                                     │
│  - Виконує RAG пошук                                                │
│  - Читає/записує файли                                              │
│  - Відправляє результати на Server                                   │
│  - Знає адресу Server (localhost:3000)                              │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVER (порт 3000)                             │
│  - STATELESS - НЕ зберігає сесії                                   │
│  - Генерує actions та steps                                         │
│  - Відправляє DSL скрипти для виконання                            │
│  - Приймає результати виконання                                     │
│  - Взаємодіє з LLM (External AI Hub)                               │
│  - Повертає finalResult                                             │
└─────────────────────────────────────────────────────────────────────┘
```

## Огляд

Ця симуляція демонструє повний потік виконання екшена:

1. Користувач надсилає задачу
2. Server повертає екшен coder з llmPrompt
3. Клієнт обирає екшен → Server повертає форму
4. Користувач надсилає повідомлення
5. Server → LLM: system prompt + history + message
6. LLM вирішує: продовжити діалог чи виконати дію (RAG пошук, читання/запис файлів)
7. Server виконує дію на клієнті
8. LLM продовжує з контекстом результатів
9. Цикл повторюється до завершення

## Можливі дії

| Дія | Опис | Параметри |
|-----|------|-----------|
| continue | Продовжити діалог без дій | message |
| rag-search | RAG пошук за натуральним запитом | query |
| read-file | Читання вмісту файлу | file |
| write-file | Запис файлу (звіти, документація) | path, content |
| execute-command | Виконання команди в терміналі | command |

## Пакет @a2a/rag

На клієнті доступний пакет `@a2a/rag`:

- **BM25** - алгоритм пошуку для точного збігу коду
- **TF-IDF** - частота термінів
- **Semantic search** - семантичний пошук з Ollama
- **Hybrid search** - комбінує sparse та dense методи
- **Query understanding** - розуміє намір користувача
- **Search suggestions** - підказки автодоповнення

## Кроки симуляції

### Крок 1: Початковий запит
```json
{ "task": "допоможи розібратись з кодом" }
```

### Крок 2: Вибір екшена
```json
{ "result": { "actionId": "coder" } }
```
Server повертає форму для введення повідомлення.

### Крок 3: Перше питання
```json
{ "input": { "message": "як працює система авторизації?" } }
```
LLM вирішує зробити RAG пошук:
```json
{ "action": "rag-search", "params": { "query": "система авторизації JWT токени" } }
```

### Крок 4: Результати RAG пошуку
RAG повертає результати з snippet та score:
```json
{
  "results": [
    { "file": "src/auth.js", "score": 0.95, "snippet": "async function login..." },
    { "file": "src/middleware/auth.ts", "score": 0.87, "snippet": "export function verifyToken..." }
  ]
}
```
LLM вирішує прочитати файл:
```json
{ "action": "read-file", "params": { "file": "src/auth.js" } }
```

### Крок 5: Відповідь LLM
LLM отримує вміст файлу та відповідає на основі коду. Повертає form для продовження.

### Крок 6: Завершення діалогу
```json
{ "input": { "message": "дякую!" } }
```
LLM повертає `action: completed`, але Server все одно додає form для можливості продовження.

### Крок 7: Запис звіту
```json
{ "input": { "message": "запиши весь звіт в docs/auth-report.md" } }
```
LLM формує повний MD документ та викликає:
```json
{
  "action": "write-file",
  "params": {
    "path": "docs/auth-report.md",
    "content": "# Звіт: Система Авторизації\n\n..."
  }
}
```

### Крок 8: Підтвердження
Клієнт підтверджує запис файлу. LLM повертає `action: completed`.

## Приклад звіту (docs/auth-report.md)

```markdown
# Звіт: Система Авторизації

## Огляд
Досліджено систему авторизації в проекті...

## Функції
### 1. Реєстрація користувача (`register`)
```javascript
async function register(email, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return { email, id: 1 };
}
```

### 2. Вхід користувача (`login`)
```javascript
async function login(email, password) {
  const isValid = await bcrypt.compare(password, storedHash);
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, user: { email } };
}
```

## Джерела
- src/auth.js
- src/middleware/auth.ts
```

## Правила

1. **Context**: Server повністю керує context. Клієнт НЕ додає нічого до context.
2. **Result**: Результат клієнта завжди поза context.
3. **Context propagation**: У кожному новому запиті context такий самий як у попередній відповіді.
4. **Stateless server**: Server не зберігає sessionId/projectId - вони залишаються на боці клієнта.
5. **LLM-controlled flow**: LLM вирішує яку дію виконати наступною.
6. **Form after completed**: Навіть після `action: completed` Server може повернути form для продовження.
7. **RAG-first**: При питаннях про код LLM спочатку робить RAG пошук, потім читає файли.

## Файли симуляції

```
simulations/coder/
├── description.md     # Короткий опис
├── analysis.md        # Детальний аналіз
├── 1/
│   ├── request.json   # Початковий запит
│   └── response.json # Екшени з llmPrompt
├── 2/
│   ├── request.json   # Вибір екшена
│   └── response.json # Форма
├── 3-8/
│   ├── request.json   # Запит з history
│   ├── request.md     # LLM prompt
│   ├── response.json  # Відповідь з execute
│   └── response.md    # LLM response
```

## Порівняння з іншими симуляціями

| Симуляція | Пошук | Читання | Запис | LLM-Dialog |
|-----------|-------|---------|-------|------------|
| dialog | ❌ | ❌ | ❌ | ✅ |
| fix-vue-imports-batched | glob | ✅ | ❌ | ❌ |
| coder | RAG | ✅ | ✅ | ✅ |
