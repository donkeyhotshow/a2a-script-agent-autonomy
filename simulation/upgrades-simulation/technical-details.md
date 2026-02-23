# Технические детали реализации

## Обзор компонентов

После реализации планов система будет состоять из следующих основных компонентов:

```
a2a-server/src/
├── services/
│   ├── request-processor.service.ts    # Главный процессор
│   ├── phase-machine.service.ts        # State machine для фаз
│   ├── task-detail-analyzer.service.ts # Анализ детализации задачи
│   ├── task-classifier.service.ts     # Классификация MECHANICAL/SEMANTIC
│   ├── psr4-analyzer.service.ts      # Анализ PSR-4 правил
│   ├── instruction-generator.service.ts # Генерация fixes[]
│   ├── entity-recognizer.service.ts   # Распознавание сущностей
│   ├── graph-store.service.ts         # Управление графом
│   ├── context-manager.service.ts     # Управление контекстом
│   └── session-context.service.ts    # Контекст сессии
├── repositories/
│   └── graph.repository.ts           # Персистентность графа
├── protocol/
│   ├── message-builder.ts            # Построение сообщений
│   └── context-parser.ts             # Парсинг контекста
└── types/
    └── index.ts                      # TypeScript типы
```

## 1. TaskDetailAnalyzer (1.1)

### Интерфейс

```
typescript
// a2a-server/src/services/task-detail-analyzer.service.ts

export type TaskDetailLevel = 'short' | 'medium' | 'detailed' | 'complex';

export interface TaskAnalysisResult {
  level: TaskDetailLevel;
  wordCount: number;
  hasTechnicalTerms: boolean;
  hasFilePaths: boolean;
  hasFramework: boolean;
  complexity: number;
  needsContext: boolean;
  needsFiles: boolean;
  readyForAi: boolean;
  suggestedNeurons: string[];
}

/**
 * Расширенный анализ детализации задачи
 * 
 * Алгоритм:
 * 1. Подсчет слов и анализ структуры
 * 2. Определение технических терминов
 * 3. Проверка наличия путей к файлам
 * 4. Определение уровня детализации
 * 5. Классификация потребностей (контекст, файлы, AI)
 */
export class TaskDetailAnalyzer {
  analyze(taskText: string): TaskAnalysisResult;
  
  private calculateComplexity(text: string): number;
  private detectTechnicalTerms(text: string): boolean;
  private detectFilePaths(text: string): boolean;
  private determineNeeds(taskText: string, complexity: number): {
    needsContext: boolean;
    needsFiles: boolean;
    readyForAi: boolean;
  };
}
```

### Интеграция с RAG

```
typescript
// Поиск похожих завершенных задач
async function findSimilarTasks(taskText: string): Promise<CompletedTask[]> {
  const embeddings = await getEmbedding(taskText);
  const results = await ragSearch(embeddings, { limit: 5 });
  return results.map(r => r.task);
}

// Семантический поиск по задачам
const similarTasks = await findSimilarTasks(taskText);
if (similarTasks.length > 0) {
  // Использовать опыт из похожих задач
  context.set('similarTasks', similarTasks);
}
```

## 2. TaskClassifier (3.1)

### Типы классификации

```
typescript
// a2a-server/src/services/task-classifier.service.ts

export type TaskType = 'MECHANICAL' | 'SEMANTIC' | 'HYBRID';

export interface ClassificationResult {
  type: TaskType;
  confidence: number;
  reasons: string[];
  keywords: string[];
  subtasks?: string[];
}

// Правила классификации
const MECHANICAL_PATTERNS = [
  'fix imports',
  'add field',
  'rename method',
  'update config',
  'add test',
  'remove comment',
  'format code',
  'fix typo',
  'change variable',
  'update comments',
];

const SEMANTIC_PATTERNS = [
  'implement login',
  'add feature',
  'refactor architecture',
  'create new module',
  'design system',
  'optimize performance',
  'implement caching',
  'add authentication',
];

export class TaskClassifier {
  classify(taskText: string): ClassificationResult;
  
  private heuristicClassification(taskText: string): ClassificationResult;
  private aiClassification(taskText: string): Promise<ClassificationResult>;
  private combineResults(heuristic: ClassificationResult, ai: ClassificationResult): ClassificationResult;
}
```

### Алгоритм классификации

```
1. Получить текст задачи
2. Применить heuristic классификацию:
   - Проверить наличие ключевых слов MECHANICAL
   - Проверить наличие ключевых слов SEMANTIC
   - Подсчитать совпадения
3. Если confidence < 0.7, применить AI классификацию
4. Объединить результаты
5. Вернуть тип с confidence
```

## 3. PSR4Analyzer (3.2)

### Интерфейс

```
typescript
// a2a-server/src/services/psr4-analyzer.service.ts

export interface PSR4Mapping {
  namespace: string;
  path: string;
  files: string[];
}

export interface PSR4AnalysisResult {
  mappings: PSR4Mapping[];
  violations: PSR4Violation[];
  suggestions: string[];
}

export interface PSR4Violation {
  file: string;
  expectedNamespace: string;
  actualNamespace: string;
  severity: 'error' | 'warning';
}

export class PSR4Analyzer {
  /**
   * Анализ PSR-4 правил из composer.json
   */
  analyzeComposer(composerJson: string): PSR4Mapping[];
  
  /**
   * Проверка соответствия namespace файлов PSR-4
   */
  validateFiles(files: CodeBlock[]): PSR4AnalysisResult;
  
  /**
   * Предложение исправлений для нарушений
   */
  suggestFixes(violations: PSR4Violation[]): FixInstruction[];
}
```

### Пример использования

```
typescript
// Анализ composer.json
const composerBlock = codeBlocks.find(b => b.path === 'composer.json');
const mappings = psr4Analyzer.analyzeComposer(composerBlock.content);

// Результат
// [
//   { namespace: 'App\\', path: 'app/', files: ['app/Http/Controllers/UserController.php'] },
//   { namespace: 'Domain\\', path: 'src/Domain/', files: ['src/Domain/Models/User.php'] }
// ]

// Проверка файлов
const violations = psr4Analyzer.validateFiles(files);
// Найдено нарушение: src/Services/UserService.php ожидает App\ но имеет Domain\
```

## 4. InstructionGenerator (3.3)

### Типы инструкций

```
typescript
// a2a-server/src/services/instruction-generator.service.ts

export type FixInstructionType = 
  | 'update_file'
  | 'add_file'
  | 'delete_file'
  | 'add_import'
  | 'remove_import'
  | 'update_import'
  | 'add_relation'
  | 'remove_relation'
  | 'update_entity'
  | 'update_config';

export interface FixInstruction {
  id: string;
  type: FixInstructionType;
  target: string;           // путь к файлу или идентификатор
  action: 'add' | 'remove' | 'update' | 'replace';
  content?: string;         // новое содержимое
  original?: string;        // оригинальное содержимое
  line?: number;           // номер строки
  metadata?: {
    entity?: string;
    relation?: string;
    import?: string;
    namespace?: string;
  };
}

export class InstructionGenerator {
  /**
   * Генерация инструкций для механической задачи
   */
  generateForMechanical(
    taskText: string,
    entities: RecognizedEntity[],
    psr4Mappings: PSR4Mapping[]
  ): FixInstruction[];
  
  /**
   * Генерация инструкций для семантической задачи
   */
  generateForSemantic(
    taskText: string,
    context: RequestContext
  ): FixInstruction[];
  
  /**
   * Генерация инструкций для гибридной задачи
   */
  generateForHybrid(
    taskText: string,
    context: RequestContext
  ): FixInstruction[];
}
```

### Пример сгенерированных инструкций

```
json
{
  "fixes": [
    {
      "id": "fix-001",
      "type": "update_import",
      "target": "app/Http/Controllers/UserController.php",
      "action": "replace",
      "original": "use App\\Models\\User;",
      "content": "use Domain\\Models\\User;",
      "line": 8
    },
    {
      "id": "fix-002",
      "type": "update_import",
      "target": "app/Http/Controllers/OrderController.php",
      "action": "replace",
      "original": "use App\\Models\\Order;",
      "content": "use Domain\\Models\\Order;",
      "line": 10
    }
  ]
}
```

## 5. EntityRecognizer Improvements (3.4)

### Расширенное распознавание

```
typescript
// a2a-server/src/services/entity-recognizer.service.ts

export interface EntityRecognizerOptions {
  recognizeVue: boolean;
  recognizeReact: boolean;
  recognizeTypeScript: boolean;
  recognizePHP: boolean;
}

export class EntityRecognizer {
  /**
   * Распознавание Vue 3 Composition API
   */
  recognizeVue3(file: FileBlock): VueComponent {
    // <script setup>
    // ref(), reactive(), computed()
    // composables (useXxx)
  }
  
  /**
   * Распознавание React компонентов
   */
  recognizeReact(file: FileBlock): ReactComponent {
    // functional components
    // hooks (useState, useEffect)
    // JSX
  }
  
  /**
   * TypeScript inference
   */
  recognizeTypeScript(file: FileBlock): TypeScriptInfo {
    // interface/type
    // generics
    // return types
  }
  
  /**
   * Улучшенный relation detection
   */
  detectRelations(entities: Entity[]): Relation[] {
    // Dependency injection
    // Event emitters
    // Laravel relationships
  }
}
```

## 6. Graph Store Persistence (1.4)

### Интерфейс репозитория

```
typescript
// a2a-server/src/repositories/graph.repository.ts

export interface GraphVersion {
  id: string;
  projectId: string;
  version: number;
  entities: GraphEntity[];
  relations: GraphRelation[];
  createdAt: Date;
}

export interface GraphRepository {
  /**
   * Сохранить версию графа
   */
  saveGraph(projectId: string, graph: Graph): Promise<GraphVersion>;
  
  /**
   * Загрузить последнюю версию графа
   */
  loadGraph(projectId: string): Promise<Graph | null>;
  
  /**
   * Загрузить конкретную версию
   */
  loadGraphVersion(projectId: string, version: number): Promise<GraphVersion | null>;
  
  /**
   * Получить историю версий
   */
  getVersionHistory(projectId: string): Promise<GraphVersion[]>;
  
  /**
   * Удалить старые версии
   */
  pruneOldVersions(projectId: string, keepCount: number): Promise<void>;
}
```

### GraphStoreService с персистентностью

```
typescript
// a2a-server/src/services/graph-store.service.ts

export interface GraphStoreOptions {
  persistToDb: boolean;
  projectId?: string;
  maxVersions?: number;
}

export class GraphStoreService {
  private options: GraphStoreOptions;
  
  /**
   * Сохранить граф в БД (если включено)
   */
  async saveToDatabase(): Promise<void> {
    if (!this.options.persistToDb || !this.options.projectId) {
      return;
    }
    
    const version = await graphRepository.saveGraph(
      this.options.projectId,
      this.graph
    );
    
    this.context.set('graphVersion', version.version);
  }
  
  /**
   * Загрузить граф из БД (если включено)
   */
  async loadFromDatabase(projectId: string): Promise<Graph | null> {
    if (!this.options.persistToDb) {
      return null;
    }
    
    return graphRepository.loadGraph(projectId);
  }
}
```

## 7. JSON API Extension (2.1)

### Расширенные типы

```
typescript
// a2a-server/src/types/index.ts

// Новое поле: iterations
export interface IterationInfo {
  current: number;
  max: number;
  history?: IterationRecord[];
  startedAt: string;
}

export interface IterationRecord {
  iteration: number;
  outcome: string;
  durationMs: number;
  activatedNeurons: string[];
  questionsCount: number;
}

// Новое поле: questions с типами
export interface Question {
  id: string;
  type: 'choice' | 'text' | 'confirm';
  text: string;
  options?: string[];
  required: boolean;
}

// Расширенный RequestApiResult
export interface RequestApiResult {
  outcome: ProcessOutcome;
  message?: string;
  context?: RequestContextBlock;
  
  // Новые поля
  questions?: Question[];           // Вопросы для клиента
  fixes?: FixInstruction[];        // Инструкции по исправлению
  iterations?: IterationInfo;      // Информация об итерациях
  scan_results?: ScanResult[];     // Результаты сканирования
  
  // Существующие поля
  graph_stats?: GraphStats;
  activated_neuron_ids?: string[];
  injected_content?: string[];
  error?: ErrorInfo;
}
```

## 8. Session Context Management (3.5)

### Принцип работы

```
КЛИЕНТ                                    СЕРВЕР
   │                                         │
   │ new_task + context (включая graph)     │
   ├───────────────────────────────────────► │
   │                                         │
   │                                    Сервер:
   │                                    1. Парсит context
   │                                    2. Обновляет graph
   │                                    3. Генерирует response
   │                                    4. Возвращает НОВЫЙ context
   │                                         │
   │ context + code (измененный)             │
   ├───────────────────────────────────────► │
   │                                    (повторяется)
```

### Context структура

```
typescript
// Контекст всегда передается туда и обратно

interface SessionContext {
  session_id: string;
  version: string;
  
  // Изменяемые данные
  graph: Graph;                    // Обновляется на сервере
  task_history: TaskRecord[];     // История задач
  current_task: TaskDetail;       // Текущая задача
  
  // Неизменяемые данные
  project_id?: string;             // ID проекта для персистентности
  frameworks: Record<string, any>;
}

// Контекст никогда не хранится на сервере между запросами!
// Все данные передаются от клиента и возвращаются клиенту
```

## 9. File Scanner (4.2)

### Интерфейс

```
typescript
// a2a-client/packages/fs-utils/scanner.ts

export interface ScannedFile {
  path: string;
  relativePath: string;
  extension: string;
  namespace?: string;
  className?: string;
  imports: string[];
  lastModified: Date;
  hash: string;
}

export interface ScanResult {
  files: ScannedFile[];
  totalFiles: number;
  scanTime: number;
  ignored: string[];
  errors: ScanError[];
}

export class FileScanner {
  /**
   * Сканирование директории
   */
  async scan(
    rootPath: string,
    options: ScanOptions = {}
  ): Promise<ScanResult>;
  
  /**
   * Сканирование с кэшированием
   */
  async scanWithCache(
    rootPath: string,
    cacheDir: string
  ): Promise<ScanResult>;
  
  /**
   * Инвалидация кэша
   */
  invalidateCache(filePath: string): void;
}

interface ScanOptions {
  extensions?: string[];        // ['.php', '.ts', '.vue']
  ignore?: string[];             // ['node_modules', 'vendor', '.git']
  maxDepth?: number;
  includeContent?: boolean;
}
```

## 10. Iterative Processing (1.3)

### State Machine для итераций

```
typescript
// a2a-server/src/services/iteration-state.service.ts

export type IterationState = 
  | 'START'
  | 'IN_PROGRESS'
  | 'WAITING_FILES'
  | 'WAITING_CLARIFICATION'
  | 'READY_TO_FIX'
  | 'COMPLETED'
  | 'FAILED';

export interface IterationTransition {
  from: IterationState;
  to: IterationState;
  condition: (context: RequestContext) => boolean;
}

export class IterationStateMachine {
  private state: IterationState;
  private iteration: number;
  private maxIterations: number;
  private history: IterationRecord[];
  
  /**
   * Переход между состояниями
   */
  transition(newState: IterationState, reason: string): boolean;
  
  /**
   * Проверка возможности завершения
   */
  canComplete(): boolean;
  
  /**
   * Проверка лимита итераций
   */
  canContinue(): boolean;
  
  /**
   * Получить текущее состояние
   */
  getState(): IterationState;
}
```

### Интеграция с RequestProcessor

```
typescript
// В request-processor.service.ts

async function processRequest(request: Request): Promise<ProcessResult> {
  // 1. Инициализация итерации
  const iterationState = new IterationStateMachine(
    request.context.iteration || 1,
    MAX_ITERATIONS
  );
  
  // 2. Определение workflow на основе классификации
  const classification = taskClassifier.classify(taskText);
  
  if (classification.type === 'MECHANICAL') {
    // Mechanical workflow
    while (iterationState.canContinue()) {
      const result = await processMechanicalTask(request, iterationState);
      
      if (result.needsFiles) {
        iterationState.transition('WAITING_FILES', 'need more files');
        return responseWithQuestions(result.questions);
      }
      
      if (result.needsClarification) {
        iterationState.transition('WAITING_CLARIFICATION', 'need clarification');
        return responseWithQuestions(result.questions);
      }
      
      if (result.readyToFix) {
        iterationState.transition('READY_TO_FIX', 'ready');
        return responseWithFixes(result.fixes);
      }
      
      if (result.completed) {
        iterationState.transition('COMPLETED', 'task done');
        return responseComplete(result);
      }
    }
  } else {
    // Semantic workflow (с external AI)
    // ...
  }
  
  // 3. Логирование итерации
  iterationState.record({
    outcome: result.outcome,
    duration: Date.now() - startTime,
    activatedNeurons: result.activatedNeurons,
  });
  
  return responseWithIterations(iterationState.getInfo());
}
```

## Интеграция всех компонентов

### Полный flow обработки

```
typescript
async function processOneRequest(request: Request): Promise<ProcessResult> {
  const startTime = Date.now();
  
  // =========================================
  // PHASE 0: Initialization
  // =========================================
  
  // 1. Анализ задачи
  const taskAnalysis = taskDetailAnalyzer.analyze(taskText);
  
  // 2. Классификация задачи
  const classification = taskClassifier.classify(taskText);
  
  // 3. Инициализация state machines
  const phaseMachine = new PhaseMachine();
  const iterationState = new IterationStateMachine(
    request.context.iterations?.current || 1,
    MAX_ITERATIONS
  );
  
  // =========================================
  // PHASE 1: Discovery
  // =========================================
  
  phaseMachine.transition('discovery');
  
  // Извлечение frameworks
  const frameworks = frameworkExtractor.extract(codeBlocks);
  
  // =========================================
  // PHASE 2: Recognition  
  // =========================================
  
  phaseMachine.transition('recognition');
  
  // PSR-4 анализ
  const psr4Mappings = psr4Analyzer.analyzeComposer(
    codeBlocks.find(b => b.path === 'composer.json')?.content
  );
  
  // Распознавание сущностей
  const { entities, relations } = entityRecognizer.recognizeBatch(codeBlocks);
  
  // =========================================
  // PHASE 3: Analysis
  // =========================================
  
  phaseMachine.transition('analysis');
  
  // Анализ графа
  const graphComplete = graphStore.isComplete(entities, relations, taskText);
  
  // Генерация вопросов при неполном графе
  if (!graphComplete) {
    const questions = questionGenerator.generate(entities, relations, taskText);
    return resultWithQuestions(questions, iterationState.getInfo());
  }
  
  // =========================================
  // PHASE 4: Action
  // =========================================
  
  phaseMachine.transition('action');
  
  if (classification.type === 'MECHANICAL') {
    // Генерация инструкций для mechanical задачи
    const fixes = instructionGenerator.generateForMechanical(
      taskText,
      entities,
      psr4Mappings
    );
    
    return resultWithFixes(fixes, iterationState.getInfo());
  } else {
    // Активация нейронов для semantic задачи
    const activationResult = neuronActivator.activate({
      taskText,
      entities,
      classification,
    });
    
    // External AI вызов для сложных задач
    if (iterationState.getCurrentIteration() >= MAX_ITERATIONS - 1) {
      const aiResult = await externalAI.process(taskText, context);
      return resultWithAIResult(aiResult, iterationState.getInfo());
    }
    
    return resultWithNeurons(activationResult, iterationState.getInfo());
  }
  
  // =========================================
  // PHASE 5: Validation & Completion
  // =========================================
  
  phaseMachine.transition('completed');
  
  // Сохранение графа (если включено)
  if (options.persistToDb) {
    await graphStore.saveToDatabase();
  }
  
  return resultComplete({
    graph: graphStore.getGraph(),
    iterations: iterationState.getInfo(),
    duration: Date.now() - startTime,
  });
}
