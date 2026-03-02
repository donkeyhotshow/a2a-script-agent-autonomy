# ROADMAP - План розвитку

> Пріоритети та етапи розвитку системи A2A

---

## Пріоритети

| Пріоритет | Компонент        | Опис                         |
|-----------|------------------|------------------------------|
| 🔴 P0     | api-server       | Додати session management    |
| 🔴 P0     | Web → Client API | Переписати web-api-client.js |
| 🟡 P1     | UI панелей       | Панелі сесій з drag & drop   |
| 🟡 P1     | Server stateless | Прибрати сесії з сервера     |
| 🟢 P2     | RAG покращення   | Покращити пошук              |
| 🟢 P2     | Graph UI         | Візуалізація залежностей     |

---

## Етап 1: Client API (P0)

### Мета

Створити повноцінний Client API сервер на порту 3001, який:

1. Зберігає сесії
2. Проксує запити до Server
3. Надає API для Web UI

### Задачі

1. **Оновити api-server**
    - [ ] Змінити порт на 3001
    - [ ] Додати session storage (в пам'яті + файл)
    - [ ] Додати endpoints:
      ```typescript
      // Sessions
      POST /api/sessions          // Створити сесію
      GET /api/sessions           // Список сесій
      GET /api/sessions/:id       // Отримати сесію
      POST /api/sessions/:id/task    // Надіслати задачу
      POST /api/sessions/:id/action  // Обрати дію
      POST /api/sessions/:id/next    // Наступний крок
      POST /api/sessions/:id/cancel  // Відмінити
 
      // Projects
      GET /api/projects           // Список проектів
      POST /api/projects          // Створити проект
 
      // Config
      GET /api/config             // Конфігурація
      POST /api/config            // Зберегти конфігурацію
      ```

2. **Інтегрувати api-client**
    - [ ] Підключити @a2a/api-client для зв'язку з Server
    - [ ] Обробляти відповіді Server (actions, execute)

### Результат

```
Web (5173) → Client API (3001) → Server (3000)
```

---

## Етап 2: Web → Client API (P0)

### Мета

Переписати Web UI для використання Client API замість прямого зв'язку з Server

### Задачі

1. **Оновити web-api-client.js**
    - [ ] Змінити serverUrl на `http://localhost:3001`
    - [ ] Додати методи для session management

2. **Знайти та замінити всі fetch до /api/v1/**
    - [ ] app-enhancements.js
    - [ ] sessions.js
    - [ ] flow/protocol.js
    - [ ] flow/init.js

### Файли для перевірки

```bash
# Знайти всі звернення до /api/v1/
grep -r "/api/v1/" a2a-client/web/js/
```

---

## Етап 3: UI Панелей (P1)

### Мета

Реалізувати панелі сесій згідно бачення з README.md:

- Кожна сесія в окремій панелі
- Drag & drop
- Згортання в drop-зону
- Кнопки "Далее", "Авто/Стоп", "Отменить"

### Задачі

1. **Створити компонент SessionPanel**
    - [ ] session-panel.js
    - [ ] session-panel.css

2. **Інтегрувати в web**
    - [ ] При створенні сесії - створювати панель
    - [ ] Оновлювати панель при зміні статусу

3. **Додати кнопки управління**
    - [ ] "Далее" - ручний режим
    - [ ] "Авто" / "Стоп" - автоматичний режим
    - [ ] "Отменить" - відмінити сесію
    - [ ] "Применить" - запустити виконання

---

## Етап 4: Server Stateless (P1)

### Мета

Зробити Server повністю stateless - прибрати зберігання сесій

### Задачі

1. **Прибрати session storage з Server**
    - [ ] Видалити session.repository.ts
    - [ ] Видалити зв'язки з сесіями в routes

2. **Переконатися що Server не зберігає стан**
    - [ ] Перевірити всі endpoints
    - [ ] Переконатися що sessionId тільки в URL

---

## Етап 5: RAG покращення (P2)

### Мета

Покращити пошук коду через RAG

### Задачі

1. **Покращити семантичний пошук**
    - [ ] Додати більше моделей для ембедінгів
    - [ ] Оптимізувати індексацію

2. **Додати функціональність**
    - [ ] Query suggestions
    - [ ] Autocomplete
    - [ ] History пошуку

---

## Етап 6: Graph UI (P2)

### Мета

Візуалізація залежностей коду

### Задачі

1. **Створити graph компоненти**
    - [ ] Graph visualization
    - [ ] Impact analysis
    - [ ] Entity extraction

---

## Залежності між етапами

```
Етап 1 (Client API) ─────┐
                         ├──► Етап 2 (Web → Client API)
Етап 4 (Server Stateless) ┘

Етап 2 ──────────────────────► Етап 3 (UI Панелей)

Етап 3 ──────────────────────► Етап 5 (RAG)

Етап 3 ──────────────────────► Етап 6 (Graph UI)
```

---

## Нотатки

1. **Етапи 1-2 тісно пов'язані** - спочатку потрібен Client API, потім Web
2. **Етап 4 можна робити паралельно** з Етапом 1-2
3. **Етапи 5-6 залежать від Етапу 3** - потрібен працюючий UI

---

## Посилання

- [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md) - Статус реалізації
- [CURRENT-ISSUES.md](CURRENT-ISSUES.md) - Поточні проблеми
- [ACTION-MAP.md](ACTION-MAP.md) - Карта коду
- [PROTOCOL.md](PROTOCOL.md) - Протокол взаємодії
