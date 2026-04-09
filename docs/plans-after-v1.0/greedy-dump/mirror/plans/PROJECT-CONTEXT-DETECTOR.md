# Project Context Detector

## Система автоматической активации функций

### Архитектура

```
project/
├── .a2a/
│   ├── context.json          # Обнаруженный контекст
│   ├── active-actions.json   # Активные действия
│   ├── file-masks.json       # Маски для поиска
│   └── architecture.json     # Архитектура проекта
```

## context.json - Обнаруженный контекст

```json
{
  "detectedAt": "2024-01-01T00:00:00Z",
  "frameworks": {
    "frontend": ["vue@3.4.0", "react@18.2.0"],
    "backend": ["laravel@11.0.0"],
    "testing": ["vitest@1.0.0", "playwright@1.40.0"]
  },
  "libraries": {
    "state": ["pinia@2.1.0"],
    "styling": ["tailwindcss@4.0.0"],
    "forms": ["vee-validate@4.12.0"]
  },
  "architecture": {
    "type": "monorepo",
    "patterns": ["mvc", "repository", "service-layer"],
    "structure": {
      "frontend": "resources/js",
      "backend": "app",
      "tests": "tests"
    }
  },
  "detectors": {
    "vue": {
      "found": true,
      "files": ["resources/js/**/*.vue"],
      "count": 45
    },
    "pinia": {
      "found": true,
      "files": ["resources/js/stores/**/*.ts"],
      "count": 8
    },
    "laravel": {
      "found": true,
      "files": ["app/Http/Controllers/**/*.php"],
      "count": 23
    }
  }
}
```

## active-actions.json - Активные действия

```json
{
  "updatedAt": "2024-01-01T00:00:00Z",
  "actions": [
    {
      "actionId": "detect-n-plus-one",
      "categoryId": "laravel-query",
      "enabled": true,
      "reason": "Laravel detected",
      "priority": "high"
    },
    {
      "actionId": "suggest-pinia",
      "categoryId": "state",
      "enabled": true,
      "reason": "Vue detected, Pinia installed",
      "priority": "medium"
    },
    {
      "actionId": "detect-composables",
      "categoryId": "composables",
      "enabled": true,
      "reason": "Vue 3 Composition API detected",
      "priority": "medium"
    }
  ],
  "disabled": [
    {
      "actionId": "suggest-redux",
      "reason": "React not detected"
    }
  ]
}
```

## file-masks.json - Маски для поиска

```json
{
  "updatedAt": "2024-01-01T00:00:00Z",
  "masks": {
    "vue-components": {
      "pattern": "resources/js/**/*.vue",
      "exclude": ["node_modules", "vendor"],
      "purpose": "Vue component detection"
    },
    "laravel-controllers": {
      "pattern": "app/Http/Controllers/**/*.php",
      "exclude": [],
      "purpose": "Laravel controller detection"
    },
    "pinia-stores": {
      "pattern": "resources/js/stores/**/*.{ts,js}",
      "exclude": [],
      "purpose": "Pinia store detection"
    },
    "tests": {
      "pattern": "tests/**/*.{php,ts,js}",
      "exclude": [],
      "purpose": "Test file detection"
    }
  },
  "custom": [
    {
      "name": "api-routes",
      "pattern": "routes/api.php",
      "purpose": "API route detection"
    }
  ]
}
```

## architecture.json - Архитектура проекта

```json
{
  "detectedAt": "2024-01-01T00:00:00Z",
  "type": "monorepo",
  "layers": {
    "presentation": {
      "path": "resources/js",
      "framework": "vue",
      "patterns": ["composition-api", "composables"]
    },
    "application": {
      "path": "app/Http",
      "framework": "laravel",
      "patterns": ["controllers", "middleware", "requests"]
    },
    "domain": {
      "path": "app/Services",
      "patterns": ["service-layer", "repository"]
    },
    "infrastructure": {
      "path": "app/Repositories",
      "patterns": ["repository", "eloquent"]
    }
  },
  "changes": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "change": "Added Pinia store",
      "impact": ["Enable pinia-related actions"]
    }
  ]
}
```

## Детекторы

### package.json детектор
```javascript
{
  "detector": "package-json",
  "checks": [
    { "key": "dependencies.vue", "activates": ["vue-actions"] },
    { "key": "dependencies.pinia", "activates": ["pinia-actions"] },
    { "key": "dependencies.react", "activates": ["react-actions"] }
  ]
}
```

### File pattern детектор
```javascript
{
  "detector": "file-pattern",
  "checks": [
    { "pattern": "**/*.vue", "activates": ["vue-actions"] },
    { "pattern": "stores/**/*.ts", "activates": ["pinia-actions"] },
    { "pattern": "app/Http/Controllers/**/*.php", "activates": ["laravel-actions"] }
  ]
}
```

### Content детектор
```javascript
{
  "detector": "file-content",
  "checks": [
    { "pattern": "import.*from.*'pinia'", "activates": ["pinia-actions"] },
    { "pattern": "use.*Pinia", "activates": ["pinia-actions"] },
    { "pattern": "defineStore", "activates": ["pinia-actions"] }
  ]
}
```

## Workflow активации

```markdown
1. Сканирование проекта
   - package.json
   - composer.json
   - Структура файлов
   - Содержимое ключевых файлов

2. Обнаружение контекста
   - Фреймворки
   - Библиотеки
   - Архитектурные паттерны

3. Генерация масок
   - На основе обнаруженной структуры
   - Сохранение в file-masks.json

4. Активация действий
   - Сопоставление с таблицами действий
   - Сохранение в active-actions.json

5. Мониторинг изменений
   - Отслеживание новых зависимостей
   - Обновление контекста
   - Переактивация действий
```

## Примеры активации

### Установка Pinia
```bash
npm install pinia
```

**Результат:**
- Обнаружено: `package.json:pinia`
- Активировано: `suggest-pinia`, `migrate-to-pinia`, `detect-composables`
- Созданы маски: `stores/**/*.ts`

### Создание Service Layer
```bash
mkdir app/Services
touch app/Services/UserService.php
```

**Результат:**
- Обнаружено: `app/Services/**/*.php`
- Активировано: `extract-service-layer`, `suggest-service-layer`
- Обновлена архитектура: добавлен `domain` layer

### Добавление тестов
```bash
npm install -D vitest
```

**Результат:**
- Обнаружено: `package.json:vitest`
- Активировано: `generate-unit-tests`, `analyze-test-coverage`
- Созданы маски: `tests/**/*.test.ts`

## API для работы с контекстом

```javascript
// Сканирование проекта
await contextDetector.scan('./project');

// Получение активных действий
const actions = contextDetector.getActiveActions();

// Проверка активации конкретного действия
const isActive = contextDetector.isActionActive('suggest-pinia');

// Добавление кастомной маски
contextDetector.addMask('custom-pattern', '**/*.custom.ts');

// Обновление архитектуры
contextDetector.updateArchitecture({ type: 'microservices' });
```
