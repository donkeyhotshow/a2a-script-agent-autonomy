# A2A Server — Entry Points & Root Context

## Обзор

**Root Context** — первое сообщение, которое клиент отправляет серверу при начале новой сессии. Этот контекст активирует первые нейроны и определяет архитектуру проекта.

---

## Точки входа

### 1. Начало сессии (Root Context)

```
Client → Server: Root Context (ADR + Directory Tree + Frameworks)
         ↓
Server: Активация нейронов
         ↓
Server: @INJECT знаний
         ↓
Server → Client: Context + Active Neurons
```

### 2. new_task

```
Client → Server: new_task: ["implement login"]
         ↓
Server: Создание Task объектов
         ↓
Server: Активация нейронов по триггерам
         ↓
Server → Client: Context + Tasks
```

### 3. request_files

```
Server → Client: request_files: ["app/Models/User.php"]
         ↓
Client → Server: FileBlock с содержимым
         ↓
Server: Re-активация нейронов с новым контентом
```

---

## Root Context Structure

```
typescript
interface RootContext {
  projectName: string;
  projectType: string;
  detectedAt: string;
  
  // ADR — Architecture Decision Records (обязательно!)
  adrs: ADR[];
  
  // Directory Tree — 1 уровень вложенности (обязательно!)
  directoryTree: DirectoryTreeNode[];
  
  frameworks: {
    frontend?: string[];  // ["vue@3.5.0", "inertia@2.2.18"]
    backend?: string[];   // ["laravel@11.0"]
    testing?: string[];   // ["vitest@4.0.18", "playwright@1.58.1"]
  };
  libraries: Record<string, string[]>;
  architecture: {
    type: string;         // "feature-first-modular"
    patterns: string[];   // ["mvc", "service-layer", "repository"]
    structure: Record<string, string>;
  };
  metrics?: {
    features?: number;
    controllers?: number;
    models?: number;
    vueComponents?: number;
    tests?: number;
    coverage?: string;
  };
  detectors?: Record<string, {
    found: boolean;
    files?: string[];
    count?: number;
    version?: string;
  }>;
}

// Architecture Decision Record
interface ADR {
  id: string;              // "adr-001"
  title: string;           // "Use Inertia.js for SPA"
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  date: string;            // "2024-01-15"
  context?: string;        // "Need SPA without separate API"
  decision?: string;       // "Use Inertia.js with Vue 3"
  consequences?: string;   // "Single codebase, no API versioning needed"
}

// Directory Tree Node (1 уровень вложенности!)
interface DirectoryTreeNode {
  name: string;            // "features"
  type: 'file' | 'directory';
  path: string;            // "features"
  children?: DirectoryTreeNode[];  // Только 1 уровень!
}
```

---

## Пример: WebsiteStore E-commerce

### Root Context

```
json
{
  "projectName": "WebsiteStore E-commerce Platform",
  "projectType": "real-world-development",
  "detectedAt": "2026-02-11T00:00:00Z",
  
  "adrs": [
    {
      "id": "adr-001",
      "title": "Use Inertia.js for SPA",
      "status": "accepted",
      "date": "2024-01-15",
      "context": "Need SPA without separate API",
      "decision": "Use Inertia.js with Vue 3",
      "consequences": "Single codebase, no API versioning needed"
    },
    {
      "id": "adr-002",
      "title": "Feature-first architecture",
      "status": "accepted",
      "date": "2024-02-01",
      "context": "Large codebase needs modularity",
      "decision": "Organize by features, not by layers"
    }
  ],
  
  "directoryTree": [
    {
      "name": "features",
      "type": "directory",
      "path": "features",
      "children": [
        { "name": "auth", "type": "directory", "path": "features/auth" },
        { "name": "cart", "type": "directory", "path": "features/cart" },
        { "name": "checkout", "type": "directory", "path": "features/checkout" },
        { "name": "orders", "type": "directory", "path": "features/orders" },
        { "name": "products", "type": "directory", "path": "features/products" },
        { "name": "shared", "type": "directory", "path": "features/shared" }
      ]
    },
    {
      "name": "tests",
      "type": "directory",
      "path": "tests",
      "children": [
        { "name": "Unit", "type": "directory", "path": "tests/Unit" },
        { "name": "Feature", "type": "directory", "path": "tests/Feature" },
        { "name": "e2e", "type": "directory", "path": "tests/e2e" }
      ]
    },
    { "name": "composer.json", "type": "file", "path": "composer.json" },
    { "name": "package.json", "type": "file", "path": "package.json" },
    { "name": "tsconfig.json", "type": "file", "path": "tsconfig.json" }
  ],
  
  "frameworks": {
    "frontend": ["vue@3.5.0", "inertia@2.2.18"],
    "backend": ["laravel@11.0"],
    "testing": ["vitest@4.0.18", "playwright@1.58.1", "phpunit@11.5.3"]
  },
  "libraries": {
    "state": ["pinia@3.0.4"],
    "styling": ["tailwindcss@4.1.18"],
    "ui": ["@heroicons/vue@2.2.0"],
    "i18n": ["vue-i18n@11.2.8"],
    "validation": ["zod@4.3.6"]
  },
  "architecture": {
    "type": "feature-first-modular",
    "patterns": ["mvc", "service-layer", "repository", "composition-api"],
    "structure": {
      "frontend": "features/*/resources/js",
      "backend": "features/*/app",
      "tests": "tests"
    }
  },
  "detectors": {
    "vue": { "found": true, "files": ["features/**/resources/js/**/*.vue"], "count": 150 },
    "laravel": { "found": true, "files": ["features/**/app/Http/Controllers/**/*.php"], "count": 45 },
    "pinia": { "found": true, "files": ["features/**/resources/js/stores/**/*.ts"], "count": 12 }
  }
}
```

### File Masks

```
json
{
  "projectName": "WebsiteStore E-commerce Platform",
  "updatedAt": "2026-02-11T00:00:00Z",
  "masks": {
    "vue-components": {
      "pattern": "features/**/resources/js/**/*.vue",
      "exclude": ["node_modules", "vendor"],
      "purpose": "Vue component detection",
      "count": 150
    },
    "laravel-controllers": {
      "pattern": "features/**/app/Http/Controllers/**/*.php",
      "exclude": [],
      "purpose": "Laravel controller detection",
      "count": 45
    }
  }
}
```

### Active Actions

```
json
{
  "projectName": "WebsiteStore E-commerce Platform",
  "updatedAt": "2026-02-11T00:00:00Z",
  "totalActions": 125,
  "actions": [
    {
      "actionId": "detect-n-plus-one",
      "categoryId": "laravel-query",
      "executorSystemId": "script",
      "enabled": true,
      "reason": "Laravel + Eloquent detected",
      "priority": "critical"
    },
    {
      "actionId": "validate-inertia-props",
      "categoryId": "inertia",
      "executorSystemId": "script",
      "enabled": true,
      "reason": "Inertia.js detected",
      "priority": "critical"
    }
  ]
}
```

---

## Активация нейронов

### Триггеры

Нейроны активируются на основе:

1. **Frameworks** — `laravel@11.0`, `vue@3.5.0`
2. **Patterns** — `mvc`, `service-layer`, `repository`
3. **File paths** — `app/Models/`, `resources/js/`
4. **Libraries** — `pinia`, `tailwindcss`

### Пример активации

```
Root Context:
  frameworks.backend: ["laravel@11.0"]
  architecture.patterns: ["service-layer", "repository"]
  
↓ Activates Neurons ↓

1. eloquent.neuron.ts
   - triggers: ["app/Models/", "eloquent", "Model.php"]
   - actions: [{ type: "inject", target: "eloquent-context" }]

2. routing.neuron.ts
   - triggers: ["routes/", "Controller.php", "Route::"]
   - actions: [{ type: "inject", target: "routing-context" }]

3. validation.neuron.ts
   - triggers: ["FormRequest", "Validator", "validate"]
   - actions: [{ type: "inject", target: "validation-context" }]
```

---

## Flow: Первое сообщение

```
mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant CH as Context Handler
    participant NA as Neuron Activator
    participant CI as Context Injector
    
    C->>S: HTTP Request (Start Session)
    S->>CH: createSessionContext(sessionId, projectId)
    CH-->>S: SessionContext
    
    C->>S: Root Context + File Masks + Active Actions
    S->>CH: handleRootContext(sessionId, rootContext, fileMasks, activeActions)
    CH->>NA: activateNeurons(activationContext)
    NA-->>CH: ActivatedNeuron[]
    CH->>CI: resolveInjections(activatedNeurons)
    CI-->>CH: InjectedContext[]
    CH-->>S: ContextHandlerResult
    S-->>C: ServerMessage { context, message: injectedContent }
```

---

## API Endpoints

### POST /sessions

Создание новой сессии

```
typescript
// Request
{
  "projectId": "project-123",
  "rootContext": { ... },
  "fileMasks": { ... },
  "activeActions": { ... }
}

// Response
{
  "sessionId": "session-456",
  "context": { ... },
  "activatedNeurons": ["eloquent", "routing", "validation"]  
}
```

Язык программирования TypeScript продолжает развиваться, предлагая разработчикам новые инструменты для создания надежных и масштабируемых приложений. Современные возможности языка позволяют эффективно работать с различными архитектурными паттернами и обеспечивать высокую производительность при минимальных затратах времени на разработку.

```
typescript
// Request (new_task)
{
  "context": {
    "version": "1.0",
    "session_id": "session-456",
    "new_task": ["implement login feature"]
  }
}

// Request (continue)
{
  "context": {
    "version": "1.0",
    "session_id": "session-456",
    "continue": true
  }
}

// Request (files)
{
  "context": { ... },
  "files": [
    { "path": "app/Models/User.php", "content": "<?php ..." }
  ]
}
```

---

## API Events

### Client → Server

| Event | Description |
|-------|-------------|
| `session:start` | Начало сессии с Root Context |
| `session:message` | Отправка ContextBlock |
| `files:provide` | Предоставление запрошенных файлов |

### Server → Client

| Event | Description |
|-------|-------------|
| `session:created` | Сессия создана |
| `neurons:activated` | Нейроны активированы |
| `files:requested` | Запрос файлов |
| `task:progress` | Прогресс задачи |
| `session:completed` | Сессия завершена |

---

**Дата создания:** 2026-02-20
