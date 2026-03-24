# Дизайн-документ: Альтернативные Actions для исправления Vue импортов

## Overview

Сравнение всех вариантов `fix-vue-imports-*`:

| Action | Подход | LLM | Интерактивность | Риск | Скорость |
|--------|--------|-----|-----------------|------|----------|
| `fix-vue-imports` | RAG-based detection + write-file | ❌ | ❌ | Средний | Средняя |
| `fix-vue-imports-batched` | Script detection + RAG search loop + progress | ❌ | ❌ | Средний | Средняя |
| `fix-vue-imports-fast` | Pure script, regex-based, parallel | ❌ | ❌ | Высокий | Очень высокая |
| `fix-vue-imports-safe` | Dry-run + validation + patch generation | ❌ | Частично | Низкий | Низкая |
| `fix-vue-imports-rag` | Hybrid: scripts + RAG/LLM для сложных случаев | ✅ | ❌ | Низкий-средний | Средняя |
| `fix-vue-imports-interactive` | Script + user confirmation per file/group | ❌ | ✅ | Минимальный | Низкая |

---

## 1. fix-vue-imports-fast

**ID:** `fix-vue-imports-fast`

### Варианты использования

- Большие кодовые базы (1000+ файлов)
- Когда нужно быстро исправить много импортов без глубокого анализа
- CI/CD pipelines где важна скорость

### Плюсы/Минусы

| Плюсы | Минусы |
|-------|--------|
| Максимальная скорость | Высокий риск ложных срабатываний |
| Минимальное потребление памяти | Не проверяет семантику |
| Простая параллелизация | Не обрабатывает сложные случаи |
| Нет зависимостей от RAG/LLM | Может пропустить неочевидные ошибки |

### Внутренние шаги

| stepId | Назначение | Вход | Выход | Команда |
|--------|------------|------|-------|---------|
| `vue-import-detect-fast` | Быстрое обнаружение через regex | `rootDir` | `broken_imports[]` | `script` |
| `vue-import-resolve-fast` | Параллельное разрешение путей | `broken_imports[]` | `patches[]` | `script` |
| `vue-import-apply-fast` | Пакетное применение | `patches[]` | `fixed_files[]` | `script` |
| `vue-import-cleanup-fast` | Очистка | - | `cleanup_count` | `script` |

### Детали скриптов

#### vue-import-detect-fast

```typescript
interface BrokenImport {
  file: string;
  line: number;
  specifier: string;
}

interface FastDetectInput {
  rootDir: string;
  maxDepth?: number;      // ограничение глубины поиска
  parallel?: number;       // кол-во параллельных процессов
}

interface FastDetectOutput {
  broken_imports: BrokenImport[];
  scan_time_ms: number;
}

// Алгоритм:
// 1. Параллельно сканируем директории (thread pool)
// 2. Regex-based поиск import statements
// 3. Быстрая проверка существования файла (existsSync)
// 4. Возвращаем результат + время сканирования
```

#### vue-import-resolve-fast

```typescript
interface FastResolveInput {
  broken_imports: BrokenImport[];
  aliases?: Record<string, string>;
  parallel?: number;
}

interface FastResolveOutput {
  patches: ResolvedPatch[];
  resolved_count: number;
  failed_count: number;
}

// Алгоритм:
// 1. Параллельно обрабатываем каждый broken_import
// 2. Простая логика: try-ext suffix (.ts, .vue, index.ts)
// 3. Map aliases если есть
// 4. Возвращаем успешные патчи
```

### Роутер / Приоритеты

- **Высокий приоритет** — скрипты, детерминистические
- Рекомендуется показывать как первую опцию для больших проектов
- В форме выбора: `id: "fix-vue-imports-fast", label: "Быстрое исправление (скрипты, высокая скорость)"`

### Структура симуляции

```
simulations/fix-vue-imports-fast/
├── description.md
├── analysis.md
├── 1/ request.json (task)
├── 1/ response.json (form с choices)
├── 2/ request.json (choice: fix-vue-imports-fast)
├── 2/ response.json (script: vue-import-detect-fast)
├── 3/ request.json (result: broken_imports)
├── 3/ response.json (script: vue-import-resolve-fast)
├── 4/ request.json (result: patches)
├── 4/ response.json (script: vue-import-apply-fast)
├── 5/ request.json (result: fixed_files)
└── 5/ response.json (script: vue-import-cleanup-fast → form completion)
```

**LLM не задействован** — чистый script-based flow.

---

## 2. fix-vue-imports-safe

**ID:** `fix-vue-imports-safe`

### Варианты использования

- Критические проекты где важна безопасность
- Первый запуск на новой кодовой базе
- Когда нужно review изменений перед применением
- Регуляторные проекты с требованиями к аудиту

### Плюсы/Минусы

| Плюсы | Минусы |
|-------|--------|
| Безопасные изменения | Медленнее оригинала |
| Dry-run режим | Требует больше итераций |
| Валидация каждого патча | Генерирует патчи, не.apply |
| Подходит для CI review | Пользователь должен.apply сам |

### Внутренние шаги

| stepId | Назначение | Вход | Выход | Команда |
|--------|------------|------|-------|---------|
| `vue-import-detect-safe` | Обнаружение с валидацией | `rootDir` | `broken_imports[]` | `script` |
| `vue-import-validate` | Проверка каждого импорта | `broken_imports[]` | `validated[]` | `script` |
| `vue-import-dry-run` | Симуляция исправлений | `validated[]` | `dry_run_patches[]` | `script` |
| `vue-import-generate-patch` | Генерация patch файлов | `dry_run_patches[]` | `patch_files[]` | `write-file` |

### Детали скриптов

#### vue-import-validate

```typescript
interface ValidateInput {
  broken_imports: BrokenImport[];
  checkExports?: boolean;  // проверять ли что экспорт существует
}

interface ValidatedImport extends BrokenImport {
  is_valid: boolean;
  validation_errors: string[];
}

interface ValidateOutput {
  validated: ValidatedImport[];
  total_valid: number;
  total_invalid: number;
}

// Алгоритм:
// 1. Для каждого импорта:
//    - Проверяем синтаксис
//    - Если checkExports=true: проверяем что целевой экспорт существует
//    - Проверяем что relative path валиден
// 2. Возвращаем с признаками валидности
```

#### vue-import-dry-run

```typescript
interface DryRunInput {
  validated: ValidatedImport[];
  aliases?: Record<string, string>;
}

interface DryRunResult {
  file: string;
  line: number;
  from: string;
  to: string;
  would_change: boolean;
}

interface DryRunOutput {
  dry_run_results: DryRunResult[];
  summary: {
    total: number;
    would_fix: number;
    would_skip: number;
  };
}

// Алгоритм:
// 1. Для каждого валидного импорта вычисляем новый путь
// 2. НО НЕ применяем изменения
// 3. Возвращато было бы"ем "ч + summary
// 4. Также генерирует patch file в формате unified diff
```

### Роутер / Приоритеты

- **Высокий приоритет** — безопасные скрипты
- Показывать для проектов с высоким риском
- В форме выбора: `id: "fix-vue-imports-safe", label: "Безопасное исправление (dry-run + валидация)"`

### Структура симуляции

```
simulations/fix-vue-imports-safe/
├── description.md
├── analysis.md
├── 1/ request.json
├── 1/ response.json (form)
├── 2/ request.json (choice)
├── 2/ response.json (script: vue-import-detect-safe)
├── 3/ request.json
├── 3/ response.json (script: vue-import-validate)
├── 4/ request.json
├── 4/ response.json (script: vue-import-dry-run)
├── 5/ request.json
└── 5/ response.json (write-file: generate patches → form completion)
```

**LLM не задействован** — безопасный script-only flow.

---

## 3. fix-vue-imports-rag

**ID:** `fix-vue-imports-rag`

### Варианты использования

- Сложные случаи которые нельзя решить скриптами
- Нестандартные структуры проектов
- Когда RAG/LLM может найти контекст который скрипты пропускают
- Проекты с множественными точками экспорта

### Плюсы/Минусы

| Плюсы | Минусы |
|-------|--------|
| Интеллектуальный анализ | Зависит от LLM |
| Обрабатывает сложные случаи | Медленнее скриптов |
| Использует контекст кодовой базы | Требует RAG/LLM сервис |
|Fallback для edge cases | Выше latency |

### Внутренние шаги

| stepId | Назначение | Вход | Выход | Команда |
|--------|------------|------|-------|---------|
| `vue-import-detect` | Обнаружение скриптом | `rootDir` | `broken_imports[]` | `script` |
| `vue-import-classify` | AI категоризация | `broken_imports[]` | `categorized[]` | `rag-search` |
| `vue-import-resolve-simple` | Скрипт для простых случаев | `categorized[simple]` | `patches_simple[]` | `script` |
| `vue-import-resolve-complex` | RAG/LLM для сложных | `categorized[complex]` | `patches_complex[]` | `rag-search` |
| `vue-import-merge` | Объединение результатов | `patches_*` | `all_patches[]` | `script` |
| `vue-import-apply` | Применение | `all_patches[]` | `fixed_files[]` | `script` |

### Детали скриптов / RAG

#### vue-import-classify

```typescript
interface ClassifyInput {
  broken_imports: BrokenImport[];
  complexityThreshold?: number;
}

interface CategorizedImport extends BrokenImport {
  category: 'simple' | 'complex';
  reason: string;
  suggested_approach: 'script' | 'rag' | 'llm';
}

interface ClassifyOutput {
  categorized: CategorizedImport[];
  simple_count: number;
  complex_count: number;
}

// Использует RAG для категоризации:
// - RAG query: "how to resolve import X from file Y"
// - На основе результатов определяем сложность
```

#### vue-import-resolve-complex (RAG)

```typescript
// RAG-search query:
// "Resolve import '{specifier}' in file '{file}'.
// Current broken path: {broken_path}
// Available exports in project: search for similar named exports"

// RAG search results → парсим → генерируем patch
```

### Роутер / Приоритеты

- **Fallback / Экспериментальный** — требует LLM
- Показывать как опцию "умного" исправления
- В форме выбора: `id: "fix-vue-imports-rag", label: "Интеллектуальное исправление (RAG + LLM)"`

### Структура симуляции

```
simulations/fix-vue-imports-rag/
├── description.md
├── analysis.md
├── 1/ request.json
├── 1/ response.json (form)
├── 2/ request.json
├── 2/ response.json (script: vue-import-detect)
├── 3/ request.json
├── 3/ response.json (rag-search: vue-import-classify - AI-LLM step)
├── 4/ request.json
├── 4/ response.json (script: vue-import-resolve-simple)
├── 5/ request.json
├── 5/ response.json (rag-search: vue-import-resolve-complex - AI-LLM step)
├── 6/ request.json
├── 6/ response.json (script: vue-import-merge)
├── 7/ request.json
├── 7/ response.json (script: vue-import-apply)
└── 8/ request.json
└── 8/ response.json (script: cleanup → form completion)
```

**LLM задействован** в шагах классификации и разрешения сложных случаев.

---

## 4. fix-vue-imports-interactive

**ID:** `fix-vue-imports-interactive`

### Варианты использования

- Пользователь хочет контролировать каждое изменение
- Первый раз на проекте требуется review
- Нужно исключить определённые файлы
- Командная работа где изменения требуют approval

### Плюсы/Минусы

| Плюсы | Минусы |
|-------|--------|
| Полный контроль пользователя | Медленный процесс |
| Возможность пропускать файлы | Много итераций |
| Review перед каждым изменением | Не подходит для авто-исправления |
| Безопасность | Требует внимания пользователя |

### Внутренние шаги

| stepId | Назначение | Вход | Выход | Команда |
|--------|------------|------|-------|---------|
| `vue-import-detect` | Обнаружение | `rootDir` | `broken_imports[]` | `script` |
| `vue-import-group` | Группировка по файлам | `broken_imports[]` | `file_groups[]` | `script` |
| `vue-import-confirm-group` | Подтверждение группы | `file_groups[]` | `confirmed_groups[]` | `form` |
| `vue-import-apply-group` | Применение к группе | `confirmed_groups[]` | `fixed_in_group[]` | `script` |
| `vue-import-review` | Review результатов | `fixed_in_group[]` | `reviewed[]` | `form` |

### Детали интерактивности

#### vue-import-confirm-group

```typescript
// Форма для пользователя:
// title: "Подтвердите исправления"
// description: "Найдено X сломанных импортов в Y файлах"
// choices: [
//   { id: "confirm_all", label: "Исправить все" },
//   { id: "confirm_group", label: "По группам" },
//   { id: "skip", label: "Пропустить" }
// ]
// input: {
//   groups: [{ file: "...", imports: [...], action: "confirm|skip" }]
// }
```

#### vue-import-review

```typescript
// Форма для пользователя после применения:
// title: "Результаты исправлений"
// description: "Исправлено X файлов, Y импортов"
// choices: [
//   { id: "accept", label: "Принять изменения" },
//   { id: "revert", label: "Откатить" }
// ]
// input: {
//   changes: [{ file: "...", status: "fixed|failed|skipped" }]
// }
```

### Роутер / Приоритеты

- **Средний приоритет** — требует user input
- Показывать для проектов где нужен контроль
- В форме выбора: `id: "fix-vue-imports-interactive", label: "Интерактивное исправление (пошаговое с подтверждением)"`

### Структура симуляции

```
simulations/fix-vue-imports-interactive/
├── description.md
├── analysis.md
├── 1/ request.json
├── 1/ response.json (form)
├── 2/ request.json
├── 2/ response.json (script: vue-import-detect)
├── 3/ request.json
├── 3/ response.json (script: vue-import-group)
├── 4/ request.json
├── 4/ response.json (form: vue-import-confirm-group)
├── 5/ request.json (user confirms)
├── 5/ response.json (script: vue-import-apply-group)
├── 6/ request.json
├── 6/ response.json (form: vue-import-review)
├── 7/ request.json (user accepts)
├── 7/ response.json (script: cleanup → form completion)
```

**LLM не задействован** — интерактивный script + form flow.

---

## 5. fix-vue-imports-batch2

**ID:** `fix-vue-imports-batch2`

### Варианты использования

- Очень большие проекты (10000+ файлов)
- Детальный прогресс критичен
- Требуется resumability при сбоях
- Комбинирует подходы batched + enhanced progress

### Плюсы/Минусы

| Плюсы | Минусы |
|-------|--------|
| Enhanced progress tracking | Сложнее оригинала |
| Resumability | Больше метаданных |
| Chunked processing | Больше итераций |
| Better memory management | Требует state management |

### Внутренние шаги

| stepId | Назначение | Вход | Выход | Команда |
|--------|------------|------|-------|---------|
| `vue-import-scan` | Сканирование с чанками | `rootDir` | `scan_state{}` | `script` |
| `vue-import-process-chunk` | Обработка чанка | `scan_state{}, chunkId` | `chunk_results{}` | `script` |
| `vue-import-merge-chunk` | Объединение чанка | `chunk_results{}` | `merged_results{}` | `script` |
| `vue-import-apply-all` | Применение всех | `merged_results{}` | `fixed_files[]` | `script` |
| `vue-import-finalize` | Финализация | `fixed_files[]` | `final_report{}` | `script` |

### Детали скриптов

#### Enhanced chunk processing

```typescript
interface Batch2Config {
  chunkSize: number;        // файлов на чанк (default: 10)
  checkpointInterval: number; // чекпоинт каждые N чанков
  resumeOnFailure: boolean;  // продолжать после ошибки
}

interface ChunkResult {
  chunk_id: number;
  files_processed: number;
  patches: ResolvedPatch[];
  errors: Error[];
  status: 'complete' | 'partial' | 'failed';
}

interface ScanState {
  total_files: number;
  processed_files: number;
  chunks: ChunkResult[];
  failed_files: string[];
}
```

### Роутер / Приоритеты

- **Высокий приоритет** — для больших проектов
- Показывать для проектов > 1000 файлов
- В форме выбора: `id: "fix-vue-imports-batch2", label: "Пакетное исправление (enhanced progress, large projects)"`

### Структура симуляции

```
simulations/fix-vue-imports-batch2/
├── description.md
├── analysis.md
├── 1/ request.json
├── 1/ response.json (form)
├── 2/ request.json
├── 2/ response.json (script: vue-import-scan → return scan_state)
├── 3/ request.json
├── 3/ response.json (script: vue-import-process-chunk 1 → return chunk_result_1)
├── 4/ request.json
├── 4/ response.json (script: vue-import-process-chunk 2 → return chunk_result_2)
├── ... (repeat for each chunk)
├── N/ request.json
├── N/ response.json (script: vue-import-merge-all)
├── N+1/ request.json
├── N+1/ response.json (script: vue-import-apply-all)
└── N+2/ request.json
└── N+2/ response.json (script: vue-import-finalize → form completion)
```

**LLM не задействован** — enhanced batch processing.

---

## Роутинг и приоритеты

### Top-level form.choices порядок

Рекомендуемый порядок в начальной форме выбора:

1. **fix-vue-imports** (оригинал) — сначала для знакомых пользователей
2. **fix-vue-imports-fast** — для больших проектов, скорость важна
3. **fix-vue-imports-safe** — для безопасности, dry-run
4. **fix-vue-imports-batch2** — для очень больших проектов
5. **fix-vue-imports-interactive** — для контроля
6. **fix-vue-imports-rag** — экспериментальный, требует LLM

### Приоритеты

| Приоритет | Action | Тип |
|-----------|--------|-----|
| Высокий | fix-vue-imports-fast | Script-only |
| Высокий | fix-vue-imports-batch2 | Script-only |
| Высокий | fix-vue-imports | Script+RAG |
| Средний | fix-vue-imports-safe | Script-only |
| Средний | fix-vue-imports-interactive | Script+Form |
| Fallback | fix-vue-imports-rag | Script+RAG+LLM |

---

## Сравнение с оригиналом и batched

| Характеристика | fix-vue-imports | fix-vue-imports-batched | fast | safe | rag | interactive | batch2 |
|----------------|-----------------|------------------------|------|------|-----|-------------|--------|
| Detection | rag-search | script | script | script | script | script | script |
| Resolution | rag-search | rag-search | script | script | rag+llm | script | script |
| Application | write-file | write-file | script | patch | script | script+form | script |
| Progress | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Dry-run | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| User confirm | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| LLM | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Large projects | Сред | Хорош | Отлично | Сред | Сред | Плохо | Отлично |

---

## Status

📋 Готов к реализации — дизайн документ передан для имплементации.
