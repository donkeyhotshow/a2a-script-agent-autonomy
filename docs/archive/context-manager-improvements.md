# План: Context Manager (10KB)

## Текущее состояние

### Что делает сервис

**ContextManager** (`a2a-server/src/services/context-manager.service.ts`) — сервис управления контекстом запроса на сервере. Интегрируется с [`PhaseMachine`](a2a-server/src/services/phase-machine.service.ts) для управления сложными сценариями обработки задач.

#### Основные функции:

1. **Управление типами контекста** — 10 типов данных:
   - `task` — описание задачи (permanent)
   - `graph` — граф знаний (session)
   - `frameworks` — определённые фреймворки (session)
   - `entities` — распознанные сущности (current-task)
   - `questions` — вопросы к клиенту (until-fixed)
   - `request_files` — запрошенные файлы (until-fixed)
   - `activated_neurons` — активированные нейроны (current-task)
   - `style` — стиль кода проекта (session)
   - `errors` — ошибки обработки (until-fixed)
   - `history` — история изменений (session)

2. **Политики удержания (Retention Policy)**:
   - `permanent` — никогда не удаляется
   - `session` — в рамках сессии
   - `current-task` — в рамках текущей задачи
   - `until-fixed` — пока не исправлено

3. **Управление памятью**:
   - Лимит по умолчанию ~100KB
   - LRU eviction при превышении лимита
   - Приоритизация по важности (priority 1-4)

4. **Интеграция с PhaseMachine**:
   - [`getForPhase()`](a2a-server/src/services/context-manager.service.ts:174) — возвращает контекст для конкретной фазы
   - Фазы: idle → discovery → recognition → analysis → action → validation → completed

#### Текущее использование:

В [`request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts:226-322):
- Инициализация при старте обработки запроса
- Хранение task, graph, entities
- Передача контекста между фазами

---

## Возможности для улучшения

### 1. Расширение типов контекста

**Текущее:** Статический набор из 10 типов

**Предложения:**
- [x] Динамические типы контекста (пользовательские)
- [x] Поддержка вложенных структур (nested context)
- [x] Typed context для каждого типа (сейчас `unknown`)

### 2. Улучшение управления памятью

**Текущее:** Простой LRU eviction по приоритету

**Предложения:**
- [x] Компрессия данных (gzip для больших graph)
- [x] Инкрементальное хранение (delta updates)
- [ ] Memory-mapped файлы для больших данных
- [x] TTL для каждого типа контекста

### 3. Сериализация и персистентность

**Текущее:** JSON serialize/deserialize

**Предложения:**
- [x] Бинарная сериализация (MessagePack/ProtoBuf)
- [x] Сохранение в Redis для распределённости
- [x] Snapshot состояния между фазами

### 4. Валидация и типизация

**Текущее:** Generic `T = unknown`

**Предложения:**
- [x] Zod схемы для каждого типа контекста
- [x] Runtime валидация при set()
- [x] Type-safe API

### 5. Событийная модель

**Текущее:** Отсутствует

**Предложения:**
- [x] Event emitter для изменений контекста
- [x] Middleware для intercept

### 6. Дифф и синхронизация

**Текущее:** Полная перезапись

**Предложения:**
- [x] Context diff (что изменилось)
- [x] Incremental sync с клиентом
- [x] Conflict resolution

### 7. Кэширование

**Текущее:** Отсутствует

**Предложения:**
- [x] L2 кэш для часто используемых данных
- [x] Предвычисление getForPhase()
- [x] Кэш результатов expensive операций

### 8. Мониторинг и метрики

**Текущее:** Basic logging

**Предложения:**
- [x] Prometheus метрики
- [x] Alert при превышении лимитов
- [x] Performance profiling

---

## API методы

### Существующие методы

```
typescript
class ContextManager {
  // Основные операции
  set(type: ContextType, data: unknown): ContextResult;
  get<T = unknown>(type: ContextType): T | null;
  has(type: ContextType): boolean;
  delete(type: ContextType): boolean;
  getAll(): Record<string, unknown>;
  
  // Фазовая интеграция
  getForPhase(phase: string): Record<string, unknown>;
  
  // Управление памятью
  clearByRetention(retention: RetentionPolicy): void;
  getStats(): ContextStats;
  
  // Сериализация
  serialize(): string;
  static deserialize(json: string): ContextManager;
  
  // Утилиты
  reset(): void;
}
```

### Предлагаемые новые методы

```
typescript
class ContextManager {
  // Валидация
  validate(type: ContextType, data: unknown): ValidationResult;
  
  // События
  on(event: ContextEvent, handler: EventHandler): void;
  off(event: ContextEvent, handler: EventHandler): void;
  
  // Дифф
  diff(other: ContextManager): ContextDiff;
  applyPatch(patch: ContextPatch): void;
  
  // Синхронизация
  getChanges(): ContextChange[];
  merge(other: ContextManager, strategy: MergeStrategy): void;
  
  // Сжатие
  compress(): void;
  decompress(): void;
  
  // Метрики
  getMetrics(): ContextMetrics;
}
```

---

## Зависимости

### Текущие зависимости

```
json
{
  "dependencies": {
    "zod": "^3.x" // Валидация конфигов
  },
  "internal": {
    "./logger.js": "logger",
    "./phase-machine.service.js": "PhaseMachine"
  }
}
```

### Предлагаемые зависимости

```
json
{
  "dependencies": {
    "zod": "^3.x",
    "msgpackr": "^1.x", // Бинарная сериализация
    "p-map": "^5.x", // Параллельные операции
    "events": "^3.x" // Event emitter (Node.js built-in)
  },
  "optional": {
    "ioredis": "^5.x", // Redis для персистентности
    "pino": "^7.x" // Логирование с метриками
  }
}
```

---

## План развития

### Фаза 1: Базовая стабилизация ✅

- [x] Текущая реализация
- [x] Интеграция с PhaseMachine
- [x] LRU eviction
- [x] Сериализация

### Фаза 2: Типизация и валидация (1 неделя)

**Задачи:**
1. Добавить Zod схемы для каждого типа контекста
2. Валидация при set()
3. Type-safe геттеры с дженериками

**Файлы:**
- `a2a-server/src/services/context-manager.types.ts` — схемы
- `a2a-server/src/services/context-manager.validator.ts` — валидатор

### Фаза 3: Событийная модель (1 неделя)

**Задачи:**
1. Event emitter для изменений
2. Hooks: onChange, onEvict, onClear

**Файлы:**
- `a2a-server/src/services/context-manager.events.ts` — события

### Фаза 4: Оптимизация памяти (1 неделя)

**Задачи:**
1. Компрессия больших данных (graph > 50KB)
2. Delta updates для graph
3. L2 кэширование

**Файлы:**
- `a2a-server/src/services/context-manager.compressor.ts`
- `a2a-server/src/services/context-manager.cache.ts`

### Фаза 5: Персистентность (2 недели)

**Задачи:**
1. Redis storage adapter
2. Session persistence
3. Crash recovery

**Файлы:**
- `a2a-server/src/services/context-manager.storage.ts`

### Фаза 6: Мониторинг (1 неделя)

**Задачи:**
1. Prometheus метрики
2. Health check endpoint
3. Alerting

**Файлы:**
- `a2a-server/src/services/context-manager.metrics.ts`

---

## Примеры использования

### Базовое использование

```
typescript
import { ContextManager, type ContextType } from './services/context-manager.service.js';

const ctx = new ContextManager(50000); // 50KB limit

// Установка
ctx.set('task', 'Проанализировать код');
ctx.set('graph', { nodes: [], edges: [] });

// Получение
const task = ctx.get<string>('task');
const graph = ctx.get<Graph>('graph');

// Для фазы
const phaseContext = ctx.getForPhase('analysis');
```

### С валидацией (после Фазы 2)

```
typescript
import { contextSchemas } from './services/context-manager.types.js';

const ctx = new ContextManager();

// Валидация автоматическая
try {
  ctx.set('graph', { nodes: [], edges: [] }); // Провалидируется по схеме
} catch (e) {
  console.error('Invalid graph:', e);
}
```

### С событиями (после Фазы 3)

```
typescript
const ctx = new ContextManager();

ctx.on('evict', (data) => {
  console.log('Evicted:', data.type, 'Freed:', data.size);
});

ctx.on('change', (data) => {
  // Handle context change
  console.log('Context changed:', data.type);
});
```

---

## Критерии успеха

1. **Производительность**: Время set/get < 1ms для контекста < 10KB
2. **Надёжность**: 0 потерь данных при crash (через Redis)
3. **Типизация**: 100% type-safe API
4. **Мониторинг**: Метрики доступны в /metrics

---

## Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Переусложнение API | Средняя | Средняя | Фазированная реализация |
| Совместимость | Низкая | Высокая | Тесты на каждую фазу |
| Производительность Redis | Средняя | Средняя | Fallback на in-memory |

---

**Дата:** 2026-02-24  
**Статус:** Черновик для обсуждения  
**Оценка размера:** ~10KB (включая все предложения)
