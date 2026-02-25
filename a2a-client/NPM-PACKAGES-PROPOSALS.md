# План: NPM Packages Proposals для a2a-client

## Текущее состояние

### Существующие зависимости

#### Основные зависимости (dependencies):
```
json
{
  "@vitest/coverage-v8": "^4.0.18",
  "@vue-flow/background": "^1.3.2",
  "@vue-flow/controls": "^1.1.3",
  "@vue-flow/core": "^1.48.2",
  "@vue-flow/minimap": "^1.5.4",
  "zod": "^3.22.4"
}
```

#### Dev зависимости (devDependencies):
```
json
{
  "@playwright/test": "^1.40.0",
  "@types/node": "^20.10.0",
  "cross-env": "^7.0.3",
  "node-fetch": "^2.7.0",
  "supertest": "^6.3.4",
  "vite": "^5.4.0",
  "vitest": "^2.1.9"
}
```

### Существующие пакеты (workspaces)

- `packages/agent/` — агент
- `packages/api-client/` — API клиент
- `packages/embedding/` — эмбеддинги
- `packages/fs-utils/` — файловые утилиты
- `packages/json/` — JSON обработка
- `packages/rag/` — RAG функциональность
- `packages/script-runner/` — выполнение скриптов
- `packages/types/` — TypeScript типы

---

## Возможности для улучшения

### 1. UI/Визуализация

**Текущее:** VueFlow для graph visualization

**Предложения:**
- [ ] `@vue-flow/edge-types` — дополнительные типы рёбер
- [ ] `@vue-flow/plugin-*` — плагины (contextmenu, shortcuts)
- [ ] `d3` или `chart.js` — для диаграмм и графиков
- [ ] `framer-motion` — анимации UI
- [ ] `@tanstack/vue-table` — таблицы с данными

### 2. State Management

**Текущее:** Не используется централизованно

**Предложения:**
- [ ] `pinia` — state management для Vue 3
- [ ] `@tanstack/vue-query` — server state management
- [ ] `zustand` (vanilla) — если понадобится вне Vue
- [ ] `immer` — immutable state для Pinia

### 3. HTTP/Network

**Текущее:** node-fetch (можно заменить на нативный)

**Предложения:**
- [x] **Использовать нативный `fetch`** — Node.js 18+ встроенный fetch API
- [ ] `axios` — только если нужны сложные interceptors

### 4. Тестирование

**Текущее:** Vitest, Playwright

**Предложения:**
- [ ] `@testing-library/vue` — component testing
- [ ] `happy-dom` — быстрый DOM для тестов
- [ ] `msw` — mock Service Worker для API

### 5. Утилиты

**Текущее:** Zod для валидации

**Предложения:**
- [x] **Использовать нативный `crypto.randomUUID()`** — Node.js 14.17+ (замена uuid)
- [x] **Использовать нативный `Intl` API** — для дат (частичная замена date-fns)
- [x] **Использовать нативные `Object/Array` методы** — map, filter, reduce (замена lodash-es)
- [x] **Использовать template literals** — для CSS классов (замена clsx)
- [ ] `lodash-es` — только если нужны специфичные функции (debounce, throttle)

### 6. Скрипты и AST

**Текущее:** script-runner пакет

**Предложения:**
- [ ] `acorn` / `espree` — JavaScript AST
- [ ] `@babel/parser` — парсинг JS/TS
- [ ] `prettier` — форматирование кода

### 7. AI/ML

**Текущее:** embedding пакет

**Предложения:**
- [ ] `@xenova/transformers` — локальные модели
- [ ] `onnxruntime-web` — ONNX инференс в браузере
- [ ] `langchain` — LLM интеграции (если нужно)

### 8. Graph/Database

**Текущее:** Отсутствует

**Предложения:**
- [ ] `cytoscape` — graph visualization (альтернатива VueFlow)
- [ ] `d3-force` — симуляция сил для графов
- [ ] `rxdb` — offline-first база данных

---

## Нативные Node.js модули (замена пакетам)

Многие npm пакеты можно заменить на встроенные модули Node.js:

| Пакет | Нативная замена | Node.js версия |
|-------|-----------------|----------------|
| `uuid` | `crypto.randomUUID()` | 14.17+ |
| `node-fetch` | `fetch` (global) | 18+ |
| `axios` / `ky` / `ofetch` | `fetch` (global) | 18+ |
| `lodash` / `lodash-es` | `Object`, `Array` методы | все версии |
| `date-fns` / `dayjs` | `Intl`, `Date` | все версии |
| `clsx` / `classnames` | template literals | все версии |
| `crypto-js` | `crypto` | все версии |
| `fs-extra` | `fs`, `fs/promises` | все версии |
| `glob` | `path.glob` + RegExp | все версии |
| `chokidar` | `fs.watch`, `fs.watchFile` | все версии |
| `rimraf` | `fs.rm` с recursive | 14+ |
| `mkdirp` | `fs.mkdir` с recursive | 10+ |
| `nanoid` | `crypto.randomUUID()` | 14.17+ |
| `md5` / `sha256` | `crypto.createHash()` | все версии |
| `moment` | `Intl.DateTimeFormat` | все версии |

### Примеры замены

```
typescript
// Вместо uuid
import { randomUUID } from 'crypto';
const id = randomUUID(); // '550e8400-e29b-41d4-a716-446655440000'

// Вместо node-fetch / axios
const response = await fetch('https://api.example.com/data');
const data = await response.json();

// Вместо lodash
const filtered = array.filter(x => x.active);
const mapped = array.map(x => x.name);
const merged = { ...obj1, ...obj2 };

// Вместо date-fns
const date = new Date();
const formatted = new Intl.DateTimeFormat('ru-RU').format(date);

// Вместо clsx
const className = `btn ${primary ? 'btn-primary' : 'btn-secondary'} ${disabled ? 'disabled' : ''}`;
```

---

## Зависимости

### Текущие зависимости

```
json
{
  "dependencies": {
    "@vue-flow/core": "^1.48.2",
    "@vue-flow/background": "^1.3.2",
    "@vue-flow/controls": "^1.1.3",
    "@vue-flow/minimap": "^1.5.4",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.9"
  }
}
```

### Предлагаемые зависимости (минимальные)

```
json
{
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "@vue-flow/core": "^1.48.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.9"
  }
}
```

Примечание: Многие пакеты могут быть заменены нативными Node.js модулями.

---

## План развития

### Фаза 1: State Management (1 неделя)
1. Добавить Pinia
2. Создать stores для graph, session, settings
3. Интегрировать с существующими пакетами

### Фаза 2: Native Modules (1 неделя)
1. Заменить node-fetch на нативный fetch
2. Заменить uuid на crypto.randomUUID()
3. Убрать лишние утилиты

### Фаза 3: UI Components (2 недели)
1. Создать переиспользуемые компоненты
2. Добавить @tanstack/vue-table для таблиц
3. Добавить framer-motion для анимаций

### Фаза 4: Advanced Testing (1 неделя)
1. Добавить @testing-library/vue
2. Настроить msw для API mocking
3. Написать component tests

---

## Критерии успеха

1. **Совместимость**: Все новые пакеты работают с Vue 3
2. **Производительность**: bundle size < 500KB (без AI моделей)
3. **Тестирование**: >80% coverage для core пакетов
4. **Native First**: Предпочитать нативные модули Node.js там, где возможно

---

## Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Bundle size | Средняя | Среднее | Tree-shaking, lazy loading |
| Vue version | Низкая | Высокое | Использовать стабильные версии |
| Complex state | Средняя | Среднее | Документация, примеры |

---

**Дата:** 2025-01-17  
**Статус:** Черновик для обсуждения  
**Оценка размера:** ~4KB
