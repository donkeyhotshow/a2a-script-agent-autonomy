# Методология работы с агент-скриптом через A2A систему (мета-уровень)

> **Версия**: 2.0 (мета-протокол)
> **Дата**: 2026-03-28
> **Статус**: Активная разработка

---

## Содержание

1. [Мета-протокол - общая схема](#1-мета-протокол---общая-схема)
2. [Режим 1: Рабочий](#2-режим-1-рабочий)
3. [Режим 2: Отладка и улучшения](#3-режим-2-отладка-и-улучшения)
4. [Переключение между режимами](#4-переключение-между-режимами)
5. [Детали реализации](#5-детали-реализации)
6. [Текущие задачи](#6-текущие-задачи)

---

## 1. Мета-протокол - общая схема

### 1.1 Архитектура системы

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           МЕТА-УРОВЕНЬ                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐               │
│   │  Логи      │────▶│  Script    │────▶│  AI        │────▶│  Исполнитель │
│   │  (архив)   │     │  Agent     │     │  Director  │     │  (Client)   │
│   └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘ │
│        │                  │                  │                  │          │
│        ▼                  ▼                  ▼                  ▼          │
│   /logs/archive    /tasks            /directions        /api/a2a         │
│                                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Компоненты мета-системы

| Компонент | Папка | Роль |
|-----------|-------|------|
| **Логи** | `/logs/archive` | Хранение логов всех систем |
| **Script Agent** | `/tasks` | Наполнение задачами (из логов, документов) |
| **AI Director** | `/directions` | Направление работы (выбор режима) |
| **Исполнитель** | `/api/a2a` | Выполнение задач через Client API |

### 1.3 Протокол работы

```
КАЖДЫЙ ЦИКЛ:
  1. Проверить /directions/active_direction
           │
           ▼
  2. Если directions нет → AI Director выбирает направление
           │
           ▼
  3. Выполнить задачи из active_direction
           │
           ▼
  4. Сохранить результаты в /logs/archive
           │
           ▼
  5. Перейти к шагу 1
```

---

## 2. Режим 1: Рабочий

> **Цель**: Выполнение задач без участия пользователя.

### 2.1 Принцип работы

```
ЕСЛИ нет активных задач:
  → Искать задачи в документах
  → Заполнять документы с задачами (/tasks/pending/)
  → Перейти к выполнению

ЕСЛИ есть задачи:
  → Выбрать задачу
  → Выполнить через API
  → Сохранить результат
  → Проверить выполнение
  → Очистить выполненные задачи
```

### 2.2 Типы сессий в Рабочем режиме

| Сессия | ID | Назначение | Выполнение |
|--------|-----|-----------|-----------|
| **Очистка** | `task-cleanup` | Проверить выполненные задачи | verify → mark done |
| **Добавление** | `task-add` | Добавить новые задачи | scan docs → add to queue |
| **Выполнение** | `task-execute` | Выполнить задачи из документа | execute → log → repeat |

### 2.3 Сессия "Очистка" (task-cleanup)

**Алгоритм:**
```
1. Получить список выполненных задач (/tasks/completed/)
2. Для каждой задачи:
   a. Проверить результат выполнения
   b. Если успешно → удалить из active
   c. Если ошибка → переместить в /tasks/failed/
3. Обновить документ задач
```

**API вызов:**
```bash
# Проверить задачу
curl http://localhost:5173/api/a2a/sessions/task-cleanup

# Отправить результат
curl -X POST http://localhost:5173/api/a2a/sessions/{id}/next \
  -H "Content-Type: application/json" \
  -d '{"result":{"script":{"output":"task verified"}}}'
```

### 2.4 Сессия "Добавление" (task-add)

**Алгоритм:**
```
1. Сканировать документы в /tasks/templates/
2. Найти новые задачи
3. Добавить в /tasks/pending/{timestamp}.json
4. Обновить указатель задач
```

**API вызов:**
```bash
# Создать задачу
curl -X POST http://localhost:5173/api/a2a/sessions/task-add \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "system",
    "task": "Найди все .md файлы и добавь задачи на проверку"
  }'
```

### 2.5 Сессия "Выполнение" (task-execute)

**Алгоритм:**
```
1. Прочитать задачу из /tasks/pending/current.json
2. Создать сессию с детальным описанием
3. Выполнить через agent flow
4. Сохранить результат в /logs/archive/{timestamp}/
5. Обновить статус задачи
```

**API вызов:**
```bash
# Начать выполнение
curl -X POST http://localhost:5173/api/a2a/sessions/task-execute \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "client-001",
    "task": "Прочитай файл README.md и создай оглавление"
  }'
```

### 2.6 Требование автономности

> **ПРАВИЛО**: Система должна работать без участия пользователя.

**Реализация:**
- Нет tasks в очереди → AI Director ищет задачи
- Нет указаний → AI Director выбирает направление
- Ошибка → логирование → продолжение

---

## 3. Режим 2: Отладка и улуч��ения

> **Цель**: Изучение логов, поиск и исправление проблем.

### 3.1 Принцип работы

```
НЕ работаем через Script Agent!
  → Читаем логи напрямую
  → Анализируем проблемы
  → Исправляем код
```

### 3.2 Источники данных

| Источник | Папка | Содержимое |
|----------|-------|-----------|
| Client API логи | `/logs/archive/client/` | request/response |
| Server логи | `/logs/archive/server/` | invoke результаты |
| Session логи | `/logs/archive/sessions/` | по сессиям |
| Console вывод | `/logs/archive/console/` | browser console |

### 3.3 Текущая задача: Диалог не работает

**Проблема**: AI говорит "всё работает", но диалог не работает.

**План диагностики:**

#### Шаг 1: Сохранить состояние страницы

Нужен тест-скрипт который:
1. Открывает страницу http://localhost:5173
2. Сохраняет данные в файл
3. AI может прочитать файл

**Реализация:**
```javascript
// test-dialog-save.js (выполняется в browser console)
(function savePageState() {
  const state = {
    url: window.location.href,
    timestamp: new Date().toISOString(),
    projectSelect: document.getElementById('projectSelect')?.value,
    taskFlowPanel: document.getElementById('task-flow-panel'),
    sessionWindows: document.querySelectorAll('.session-window'),
    consoleErrors: [],
    networkRequests: []
  };
  
  // Перехватить ошибки
  window.onerror = (msg) => state.consoleErrors.push(msg);
  
  // Перехватить network
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const result = await originalFetch(...args);
    state.networkRequests.push({
      url: args[0],
      method: args[1]?.method,
      status: result.status
    });
    return result;
  };
  
  // Сохранить в localStorage
  localStorage.setItem('a2a_debug_state', JSON.stringify(state, null, 2));
  console.log('[Debug] State saved to localStorage');
  
  return state;
})();
```

#### Шаг 2: Экспорт в файл

```bash
# Экспорт из localStorage
curl -X POST http://localhost:5173/api/a2a/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "system",
    "task": "Прочитай localStorage ключ a2a_debug_state и сохрани в logs/archive/debug/state-{timestamp}.json"
  }'
```

#### Шаг 3: Анализ

```bash
# Прочитать сохранённое состояние
curl http://localhost:5173/api/a2a/sessions/{id}
# Найти проблему в networkRequests / consoleErrors
```

### 3.4 Типичные проблемы и решения

| Проблема | Признак | Решение |
|----------|---------|---------|
| POST возвращает 404 | `/next` не существует | Проверить роуты |
| asyncPending = true | Нет polling | Проверить .../async |
| execute = null | Нет ответа от LLM | Проверить Ollama |
| Форма не рендерится | no form в execute | Проверить router |

---

## 4. Переключение между режимами

### 4.1 Определение режима

**При старте новой сессии** AI спрашивает:
```
Какой режим использовать?
1. Рабочий (выполнение задач)
2. Отладка (анализ логов)
[Текущий режим: N/A - укажите явно]
```

**Явное указание:**
```bash
# Рабочий режим
curl -X POST ... -d '{"mode": "work", ...}'

# Режим отладки  
curl -X POST ... -d '{"mode": "debug", ...}'
```

### 4.2 Переход в режим 2 (отладка)

**Когда:**
- Ошибки в логах
- Пользователь запросил
- Подготовка к режиму 1
- **Режим 1 не может продолжать работу**

**Действия:**
1. Остановить script agent
2. Начать читать логи
3. Выполнить диагностику

### 4.2.1 Требование: Режим 1 пишет задачи для Режима 2

> **ПРАВИЛО**: Если Режим 1 не может продолжать работу, он **обязан** написать детальные задачи для Режима 2.


**Формат задачи для Режима 2:**
```json
{
  "task": {
    "description": "Описание ситуации",
    "whatHappened": "Что произошло",
    "howItHappened": "Как произошло (последовательность)",
    "problem": "Конкретная проблема",
    "hypotheses": [
      "Гипотеза 1",
      "Гипотеза 2",
      "Гипотеза 3"
    ]
  }
}
```

**Обязательные поля:**
- `description` — краткое описание ситуации
- `whatHappened` — что произошло (факты)
- `howItHappened` — как произошло (последовательность событий)
- `problem` — конкретная проблема
- `hypotheses` — все возможные гипотезы (минимум 2)

**Пример:**
```json
{
  "task": {
    "description": "Диалог не отвечает после отправки сообщения",
    "whatHappened": "Пользователь отправил сообщение, получил 200 OK, но ответ не приходит уже 5 минут",
    "howItHappened": "1. Отправил POST /next\n2. Получил 200\n3. Ждал ответ\n4. Таймаут 5 мин\n5. Нет ответа",
    "problem": "asyncPending остается true, polling не возвращает результат",
    "hypotheses": [
      "LLM не отвечает (Ollama упал)",
      "Polling не доходит до сервера (network issue)",
      "Сервер не сохраняет результат (storage error)"
    ]
  }
}
```

### 4.3 Переход в режим 1 (рабочий)

**Когда:**
- Проблемы исправлены
- AI Director даёт команду
- Подтверждение завершения отладки

**Действия:**
1. Запустить script agent
2. Начать выполнять задачи

---

## 5. Детали реализации

### 5.1 Структура папок

```
a2a-script-agent/
├── logs/
│   └── archive/
│       ├── client/           # Client API логи
│       ├── server/           # A2A Server логи
│       ├── sessions/          # Session логи
│       └── debug/            # Отладочная информация
├── tasks/
│   ├── pending/             # Ожидают выполнения
│   ├── completed/          # Выполнены
│   ├── failed/            # Ошибки
│   └── templates/          # Шаблоны задач
├── directions/
│   └── active_direction    # Текущее направление
└── methodology/
    └── sessions/          # Сессии для режимов
```

### 5.2 Формат active_direction

```json
{
  "direction": "work|debug",
  "mode": "task-cleanup|task-add|task-execute|diagnose",
  "params": {},
  "timestamp": "2026-03-28T12:00:00Z",
  "status": "active|completed"
}
```

### 5.3 Формат лога

```json
{
  "timestamp": "2026-03-28T12:00:00Z",
  "source": "client|server|ai",
  "type": "request|response|error",
  "data": {},
  "traceId": "sess_xxx_1"
}
```

---


## 6. Текущие задачи

### 6.1 Подготовка к режиму 1 (рабочий)


**Задачи:**


| # | Задача | Статус | Примечание |
|-------|--------|-----------|
| 1 | Организовать тест диалога | В.progress | AI говорит работает, но не работает |
| 2 | Сохранять состояние страницы | Готово | Скрипт создан |
| 3 | Экспорт в файл | TODO | Для AI анализа |

### 6.2 Предложения по развитию системы

**Документы**: [proposals/](proposals/)

| Вариант | Описание | Сложность | Риск |
|---------|---------|----------|------|
| 1 | Модульные цепочки (split schemas) | Высокая | Высокий |
| 2 | Эволюционные улучшения | Низкая | Низкий |

**Рекомендация**: Вариант 2 (эволюция) для текущего состояния.

Подробнее: [proposals/00-comparison/README.md](proposals/00-comparison/README.md)

### 6.2 План действий (режим 2)

```
Шаг 1: Создать тест-скрипт (save-page-state.js)
          │
          ▼
Шаг 2: Выполнить на http://localhost:5173
          │
          ▼  
Шаг 3: Экспортировать в logs/archive/debug/
          │
          ▼
Шаг 4: AI анализирует → находит проблему
          │
          ▼
Шаг 5: Исправить
          │
          ▼
Шаг 6: Переход в режим 1
```

### 6.3 Следующие шаги

1. **Сейчас**: Режим 2 - диагностика диалога
2. **После исправления**: Переход в режим 1
3. **В режиме 1**: Автономное выполнение задач

---

## Быстрая справка

### API эндпоинты

```bash
# Режим работы (указать явно)
curl -X POST http://localhost:5173/api/a2a/sessions \
  -d '{"projectId":"system","mode":"work","task":"..."}'

# Отладка (читать логи)
curl http://localhost:5173/logs/archive/sessions/
curl http://localhost:5173/logs/archive/debug/

# Диагностика
curl http://localhost:5173/api/a2a/sessions/{id}
curl http://localhost:5173/api/a2a/sessions/{id}/async
```

### Проверка сервисов

```bash
curl http://localhost:3000/health     # A2A Server
curl http://localhost:11434/health # AI Integration
curl http://localhost:11435/api/tags  # Ollama
curl http://localhost:5173/api/a2a/projects  # Client
```

---

*Обновлено: 2026-03-28*
*Версия: 2.0*