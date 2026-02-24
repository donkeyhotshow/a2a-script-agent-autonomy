/**
 * Context Manager Service
 * 
 * Управляет контекстом запроса на сервере.
 * Интегрируется с PhaseMachine для управления сложными сценариями.
 * 
 * Типы контекста:
 * - task — описание задачи (permanent)
 * - graph — граф знаний (session)
 * - frameworks — определённые фреймворки (session)
 * - entities — распознанные сущности (current-task)
 * - questions — вопросы к клиенту (until-fixed)
 * - request_files — запрошенные файлы (until-fixed)
 * - activated_neurons — активированные нейроны (current-task)
 * - style — стиль кода проекта (session)
 * - errors — ошибки обработки (until-fixed)
 * - history — история изменений (session)
 */

import { logger } from '../utils/logger.js';

// Типы контекста
export type ContextType = 
  | 'task' 
  | 'graph' 
  | 'frameworks' 
  | 'entities' 
  | 'questions' 
  | 'request_files' 
  | 'activated_neurons' 
  | 'style' 
  | 'errors' 
  | 'history';

// Политики удержания
export type RetentionPolicy = 'permanent' | 'session' | 'current-task' | 'until-fixed';

// Конфигурация типа контекста
interface ContextTypeConfig {
  priority: number; // 1-4, выше = важнее
  retention: RetentionPolicy;
  description: string;
  maxSize?: number; // в байтах
}

const CONTEXT_CONFIGS: Record<ContextType, ContextTypeConfig> = {
  task: { priority: 4, retention: 'permanent', description: 'Описание задачи' },
  graph: { priority: 4, retention: 'session', description: 'Граф знаний', maxSize: 50000 },
  frameworks: { priority: 3, retention: 'session', description: 'Определённые фреймворки' },
  entities: { priority: 3, retention: 'current-task', description: 'Распознанные сущности' },
  questions: { priority: 2, retention: 'until-fixed', description: 'Вопросы к клиенту' },
  request_files: { priority: 2, retention: 'until-fixed', description: 'Запрошенные файлы' },
  activated_neurons: { priority: 3, retention: 'current-task', description: 'Активированные нейроны' },
  style: { priority: 1, retention: 'session', description: 'Стиль кода проекта' },
  errors: { priority: 3, retention: 'until-fixed', description: 'Ошибки обработки' },
  history: { priority: 1, retention: 'session', description: 'История изменений', maxSize: 10000 },
};

// Запись контекста
interface ContextEntry {
  type: ContextType;
  data: unknown;
  timestamp: Date;
  size: number;
  priority: number;
  retention: RetentionPolicy;
  lastAccessed: Date;
}

// Статистика
interface ContextStats {
  totalSize: number;
  maxSize: number;
  utilization: string;
  types: ContextType[];
  byType: Record<ContextType, { size: number; priority: number; age: number }>;
}

/**
 * Context Manager для управления контекстом запроса
 */
export class ContextManager {
  private context: Map<ContextType, ContextEntry> = new Map();
  private maxSize: number;
  private currentSize: number = 0;

  constructor(maxSize: number = 100000) { // ~100KB default
    this.maxSize = maxSize;
  }

  /**
   * Установить контекст
   */
  set(type: ContextType, data: unknown): { type: ContextType; size: number; totalSize: number } {
    const config = CONTEXT_CONFIGS[type];
    const size = this.estimateSize(data);

    // Если превышен лимит, evict
    while (this.currentSize + size > this.maxSize) {
      const evicted = this.evict();
      if (!evicted) break; // Нечего evict
    }

    // Удаляем старый если есть
    if (this.context.has(type)) {
      const old = this.context.get(type)!;
      this.currentSize -= old.size;
    }

    const entry: ContextEntry = {
      type,
      data,
      timestamp: new Date(),
      size,
      priority: config.priority,
      retention: config.retention,
      lastAccessed: new Date(),
    };

    this.context.set(type, entry);
    this.currentSize += size;

    logger.debug('[ContextManager] Set context', { type, size, totalSize: this.currentSize });

    return { type, size, totalSize: this.currentSize };
  }

  /**
   * Получить контекст
   */
  get<T = unknown>(type: ContextType): T | null {
    const entry = this.context.get(type);
    if (entry) {
      entry.lastAccessed = new Date();
      return entry.data as T;
    }
    return null;
  }

  /**
   * Проверить наличие контекста
   */
  has(type: ContextType): boolean {
    return this.context.has(type);
  }

  /**
   * Удалить контекст
   */
  delete(type: ContextType): boolean {
    const entry = this.context.get(type);
    if (entry) {
      this.context.delete(type);
      this.currentSize -= entry.size;
      return true;
    }
    return false;
  }

  /**
   * Получить весь контекст для отправки
   */
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [type, entry] of this.context) {
      result[type] = entry.data;
    }
    return result;
  }

  /**
   * Получить контекст для конкретной фазы
   */
  getForPhase(phase: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Всегда включаем task
    const task = this.get('task');
    if (task) result['new_task'] = task;

    // В зависимости от фазы
    switch (phase) {
      case 'discovery':
        result['frameworks'] = this.get('frameworks');
        break;
      case 'recognition':
        result['graph'] = this.get('graph');
        result['entities'] = this.get('entities');
        break;
      case 'analysis':
        result['graph'] = this.get('graph');
        result['frameworks'] = this.get('frameworks');
        break;
      case 'action':
        result['graph'] = this.get('graph');
        result['activated_neurons'] = this.get('activated_neurons');
        break;
      case 'validation':
        result['graph'] = this.get('graph');
        result['questions'] = this.get('questions');
        result['request_files'] = this.get('request_files');
        result['errors'] = this.get('errors');
        break;
      case 'completed':
        result['graph'] = this.get('graph');
        break;
    }

    // Удаляем null значения
    for (const key of Object.keys(result)) {
      if (result[key] === null) {
        delete result[key];
      }
    }

    return result;
  }

  /**
   * Получить отсортированные по приоритету (для eviction)
   */
  private getSortedByPriority(): ContextEntry[] {
    return Array.from(this.context.values())
      .sort((a, b) => {
        // Сначала по приоритету (ниже = evict first)
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        // Потом по lastAccessed (старее = evict first)
        return a.lastAccessed.getTime() - b.lastAccessed.getTime();
      });
  }

  /**
   * Evict наименее важный контекст
   */
  private evict(): ContextType | null {
    const sorted = this.getSortedByPriority();

    // Не evict permanent retention
    const toEvict = sorted.find(e => e.retention !== 'permanent');

    if (toEvict) {
      this.context.delete(toEvict.type);
      this.currentSize -= toEvict.size;
      logger.debug('[ContextManager] Evicted', { type: toEvict.type, size: toEvict.size });
      return toEvict.type;
    }

    return null;
  }

  /**
   * Очистить по retention policy
   */
  clearByRetention(retention: RetentionPolicy): void {
    for (const [type, entry] of this.context) {
      if (CONTEXT_CONFIGS[type].retention === retention) {
        this.context.delete(type);
        this.currentSize -= entry.size;
      }
    }
  }

  /**
   * Оценить размер данных
   */
  private estimateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 1000; // Default size if cannot serialize
    }
  }

  /**
   * Статистика
   */
  getStats(): ContextStats {
    const byType: Record<ContextType, { size: number; priority: number; age: number }> = {} as Record<ContextType, { size: number; priority: number; age: number }>;

    for (const [type, entry] of this.context) {
      byType[type] = {
        size: entry.size,
        priority: entry.priority,
        age: Date.now() - entry.timestamp.getTime(),
      };
    }

    return {
      totalSize: this.currentSize,
      maxSize: this.maxSize,
      utilization: ((this.currentSize / this.maxSize) * 100).toFixed(1) + '%',
      types: Array.from(this.context.keys()),
      byType,
    };
  }

  /**
   * Сброс
   */
  reset(): void {
    this.context.clear();
    this.currentSize = 0;
    logger.info('[ContextManager] Reset');
  }

  /**
   * Сериализация
   */
  serialize(): string {
    const data = {
      entries: Array.from(this.context.entries()).map(([type, entry]) => ({
        type,
        data: entry.data,
        timestamp: entry.timestamp.toISOString(),
        lastAccessed: entry.lastAccessed.toISOString(),
      })),
      maxSize: this.maxSize,
      currentSize: this.currentSize,
    };
    return JSON.stringify(data);
  }

  /**
   * Десериализация
   */
  static deserialize(json: string): ContextManager {
    const data = JSON.parse(json);
    const manager = new ContextManager(data.maxSize);
    
    for (const entry of data.entries) {
      const config = CONTEXT_CONFIGS[entry.type as ContextType];
      manager.context.set(entry.type as ContextType, {
        type: entry.type as ContextType,
        data: entry.data,
        timestamp: new Date(entry.timestamp),
        lastAccessed: new Date(entry.lastAccessed),
        size: manager.estimateSize(entry.data),
        priority: config.priority,
        retention: config.retention,
      });
    }
    
    manager.currentSize = data.currentSize;
    return manager;
  }
}

// Removed singleton exports to prevent race conditions.
// Always instantiate ContextManager per request.
