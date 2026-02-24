# Диаграмма потока данных после обновления

## Общая архитектура

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              A2A SYSTEM                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐               │
│  │    CLIENT    │      │    SERVER    │      │   DATABASE   │               │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘               │
│         │                     │                     │                        │
│         │   new_task +        │                     │                        │
│         │   context +        │                     │                        │
│         │   codeBlocks       │                     │                        │
│         ├──────────────────► │                     │                        │
│         │                     │                     │                        │
│         │                     ▼                     │                        │
│         │              ┌──────────────┐           │                        │
│         │              │   REQUEST     │           │                        │
│         │              │   PROCESSOR  │           │                        │
│         │              └──────┬───────┘           │                        │
│         │                     │                   │                        │
│         │    ┌────────────────┼────────────────┘ │                        │
│         │    │                │                    │                        │
│         │    ▼                ▼                    ▼                        │
│         │         ┌─────────────────────┐                          │
│         │         │    PHASE MACHINE    │                          │
│         │         ├─────────────────────┤                          │
│         │         │  idle → discovery   │                          │
│         │         │  → recognition      │                          │
│         │         │  → analysis         │                          │
│         │         │  → action           │                          │
│         │         │  → validation       │                          │
│         │         │  → completed        │                          │
│         │         └──────────┬──────────┘                          │
│         │                    │                                       │
│         │    ┌───────────────┼────────────────┐                     │
│         │    │               │                │                     │
│         │    ▼               ▼                ▼                     │
│         │ ┌─────────┐  ┌───────────┐  ┌─────────────┐              │
│         │ │ Task    │  │ Framework │  │   Graph     │              │
│         │ │ Analyzer│  │ Extractor │  │   Store     │              │
│         │ └────┬────┘  └─────┬─────┘  └──────┬──────┘              │
│         │      │             │               │                      │
│         │      └─────────────┴───────────────┘                      │
│         │                    │                                       │
│         │                    ▼                                       │
│         │              ┌──────────────┐                              │
│         │              │   NEURON     │                              │
│         │              │  ACTIVATOR   │                              │
│         │              └──────┬───────┘                              │
│         │                     │                                       │
│         │    ┌────────────────┼────────────────┐                    │
│         │    │                │                │                    │
│         │    ▼                ▼                ▼                    │
│         │ ┌─────────┐  ┌───────────┐  ┌─────────────┐              │
│         │ │ Task    │  │   PSR4    │  │  Entity     │              │
│         │ │Classifier│  │ Analyzer  │  │ Recognizer  │              │
│         │ └─────────┘  └───────────┘  └─────────────┘              │
│         │                                                           │
│         │                    │                                       │
│         │                    ▼                                       │
│         │              ┌──────────────┐                              │
│         │              │ INSTRUCTION  │                              │
│         │              │  GENERATOR   │                              │
│         │              └──────┬───────┘                              │
│         │                     │                                       │
│         └─────────────────────┼──────────────────────────────────────┤
│                               │                                        │
│                               │  response:                            │
│                               │  - outcome                            │
│                               │  - context                            │
│                               │  - questions[]                        │
│                               │  - fixes[]                            │
│                               │  - iterations{}                       │
│                               │  - graph                              │
│                               ▼                                        │
│                         ┌──────────┐                                   │
│                         │   JSON   │                                   │
│                         │   API    │                                   │
│                         └──────────┘                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

## Детальный поток итераций

### Итерация 1: Начальный запрос

```
CLIENT                                          SERVER
  │                                                 │
  │ {                                              │
  │   "context": {                                 │
  │     "new_task": ["исправить импорты"],        │
  │     "session_id": "session-123"               │
  │   },                                           │
  │   "codeBlocks": [                              │
  │     {"path": "composer.json", ...},           │
  │     {"path": "package.json", ...}             │
  │   ]                                            │
  │ }                                              │
  ├──────────────────────────────────────────────► │
  │                                                 │
  │                                    PhaseMachine: idle → discovery
  │                                    TaskAnalyzer: short task
  │                                    TaskClassifier: MECHANICAL
  │                                    FrameworkExtractor: Laravel + Vue
  │                                                 │
  │                                    Response:    │
  │                                    {            │
  │                                      "outcome": "need_files",
  │                                      "iterations": { "current": 1, "max": 5 },
  │                                      "questions": ["Какие файлы были перемещены?"],
  │                                      "request_files": ["app/**/*.php"]
  │                                    }
  │ ◄───────────────────────────────────────────────┤
```

### Итерация 2: Предоставление файлов

```
CLIENT                                          SERVER
  │                                                 │
  │ {                                              │
  │   "context": {                                 │
  │     "session_id": "session-123",              │
  │     "new_task": ["исправить импорты"],        │
  │     "iterations": { "current": 1, "max": 5 }  │
  │   },                                           │
  │   "codeBlocks": [                              │
  │     {"path": "app/Models/User.php", ...},     │
  │     {"path": "app/Http/Controllers/...", ...}  │
  │   ]                                            │
  │ }                                              │
  ├──────────────────────────────────────────────► │
  │                                                 │
  │                                    PhaseMachine: discovery → recognition
  │                                    EntityRecognizer: entities + relations
  │                                    PSR4Analyzer: App\ → app/
  │                                                 │
  │                                    Response:    │
  │                                    {            │
  │                                      "outcome": "need_clarification",
  │                                      "iterations": { "current": 2, "max": 5 },
  │                                      "questions": ["В какой директории теперь находятся модели?"]
  │                                    }
  │ ◄───────────────────────────────────────────────┤
```

### Итерация 3: Уточнение

```
CLIENT                                          SERVER
  │                                                 │
  │ {                                              │
  │   "context": {                                 │
  │     "session_id": "session-123",              │
  │     "new_task": ["исправить импорты"],        │
  │     "iterations": { "current": 2, "max": 5 }, │
  │     "answers": ["модели теперь в src/Domain/Models"]
  │   }                                            │
  │ }                                              │
  ├──────────────────────────────────────────────► │
  │                                                 │
  │                                    PhaseMachine: recognition → analysis
  │                                    GraphStore: merge entities
  │                                    isGraphComplete: true
  │                                    TaskClassifier: MECHANICAL (confirmed)
  │                                                 │
  │                                    Response:    │
  │                                    {            │
  │                                      "outcome": "ready_to_fix",
  │                                      "iterations": { "current": 3, "max": 5 },
  │                                      "fixes": [                   │
  │                                        { "type": "update_import", "from": "...", "to": "..." }
  │                                      ]
  │                                    }
  │ ◄───────────────────────────────────────────────┤
```

### Итерация 4: Применение исправлений

```
CLIENT                                          SERVER
  │                                                 │
  │ {                                              │
  │   "context": {                                 │
  │     "session_id": "session-123",              │
  │     "iterations": { "current": 3, "max": 5 },│
  │     "applied_fixes": [                         │
  │       { "file": "app/Http/Controllers/UserController.php", "status": "applied" }
  │     ]                                          │
  │   }                                            │
  │ }                                              │
  ├──────────────────────────────────────────────► │
  │                                                 │
  │                                    PhaseMachine: action → validation
  │                                    Validation: fixes applied successfully
  │                                    GraphStore: update graph with changes
  │                                                 │
  │                                    Response:    │
  │                                    {            │
  │                                      "outcome": "completed",
  │                                      "iterations": { "current": 4, "max": 5 },
  │                                      "message": "Импорты исправлены",
  │                                      "graph": { ... updated graph ... }
  │                                    }
  │ ◄───────────────────────────────────────────────┤
```

## Компоненты и их взаимодействие

### PhaseMachine States

```
┌────────┐     start      ┌───────────┐     proceed      ┌────────────┐
│  IDLE  │ ─────────────► │ DISCOVERY │ ────────────────► │RECOGNITION │
└────────┘                └───────────┘                  └─────┬──────┘
       ▲                                                    │
       │                                                    ▼
       │                ┌───────────┐                  ┌──────────┐
       │                │ COMPLETED │ ◄─────────────── │ANALYSIS  │
       │                └───────────┘                  └─────┬────┘
       │                                                    │
       │                     ┌────────────┐                  │
       │                     │ VALIDATION │ ◄────────────────┘
       │                     └──────┬─────┘
       │                            │
       │                     ┌──────▼──────┐
       └─────────────────────│   ACTION    │
                             └─────────────┘
```

### Task Classification Flow

```
┌─────────────────────────────────────────────────┐
│                  TASK INPUT                      │
└─────────────────────┬───────────────────────────┘
                      ▼
              ┌───────────────┐
              │   TaskDetail  │
              │   Analyzer    │
              └───────┬───────┘
                      ▼
              ┌───────────────┐
              │   TaskDetail  │
              │   Level:      │
              │   short/      │
              │   medium/    │
              │   detailed/  │
              │   complex    │
              └───────┬───────┘
                      ▼
              ┌───────────────┐
              │    Task       │
              │  Classifier   │
              └───────┬───────┘
                      ▼
         ┌──────────────────────────┐
         │     CLASSIFICATION       │
         ├──────────────────────────┤
         │  MECHANICAL              │
         │  - fix imports           │
         │  - add field             │
         │  - rename method         │
         ├──────────────────────────┤
         │  SEMANTIC                │
         │  - implement login       │
         │  - add feature           │
         │  - refactor              │
         ├──────────────────────────┤
         │  HYBRID                  │
         │  - combine both          │
         └──────────────────────────┘
```

### Instruction Generation Flow

```
┌─────────────────────────────────────────────────┐
│              ANALYSIS RESULTS                    │
│  - recognized entities                          │
│  - PSR-4 mappings                              │
│  - task classification                          │
│  - missing information                          │
└─────────────────────┬───────────────────────────┘
                      ▼
              ┌───────────────┐
              │   Instruction│
              │   Generator  │
              └───────┬───────┘
                      ▼
         ┌──────────────────────────┐
         │    FIX INSTRUCTIONS      │
         ├──────────────────────────┤
         │  {                       │
         │    "type": "update_file",│
         │    "target": "path",     │
         │    "action": "replace",  │
         │    "from": "...",        │
         │    "to": "..."          │
         │  }                       │
         ├──────────────────────────┤
         │  {                       │
         │    "type": "add_import", │
         │    "target": "file",     │
         │    "import": "..."       │
         │  }                       │
         └──────────────────────────┘
