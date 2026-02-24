/**
 * Phase Machine Service
 * 
 * Управляет фазами обработки запроса на сервере.
 * Интегрируется с request-processor для сложных сценариев.
 * 
 * Фазы:
 * - idle → начальное состояние
 * - discovery → определение фреймворков, анализ структуры
 * - recognition → распознавание сущностей
 * - analysis → анализ графа, проверка completeness
 * - action → активация нейронов, генерация рекомендаций
 * - validation → проверка результатов
 * - completed → завершение
 */

import { logger } from '../utils/logger.js';

// Типы фаз
export type Phase = 'idle' | 'discovery' | 'recognition' | 'analysis' | 'action' | 'validation' | 'completed';

// Конфигурация фаз
interface PhaseConfig {
  name: Phase;
  description: string;
  nextPhases: Phase[];
  maxIterations: number;
  timeout?: number; // ms
}

const PHASE_CONFIGS: Record<Phase, PhaseConfig> = {
  idle: {
    name: 'idle',
    description: 'Начальное состояние, ожидание запроса',
    nextPhases: ['discovery'],
    maxIterations: 1,
  },
  discovery: {
    name: 'discovery',
    description: 'Определение фреймворков, анализ структуры проекта',
    nextPhases: ['recognition', 'analysis'],
    maxIterations: 3,
    timeout: 30000,
  },
  recognition: {
    name: 'recognition',
    description: 'Распознавание сущностей из codeBlocks',
    nextPhases: ['analysis', 'discovery'],
    maxIterations: 5,
    timeout: 60000,
  },
  analysis: {
    name: 'analysis',
    description: 'Анализ графа, проверка completeness',
    nextPhases: ['action', 'discovery', 'validation'],
    maxIterations: 3,
    timeout: 30000,
  },
  action: {
    name: 'action',
    description: 'Активация нейронов, генерация рекомендаций',
    nextPhases: ['validation', 'action'],
    maxIterations: 10,
    timeout: 60000,
  },
  validation: {
    name: 'validation',
    description: 'Проверка результатов, генерация questions',
    nextPhases: ['completed', 'action', 'discovery'],
    maxIterations: 5,
    timeout: 30000,
  },
  completed: {
    name: 'completed',
    description: 'Задача завершена',
    nextPhases: ['idle'],
    maxIterations: 1,
  },
};

// Состояние фазовой машины
interface PhaseState {
  currentPhase: Phase;
  previousPhase: Phase | null;
  iterations: Record<Phase, number>;
  totalIterations: number;
  startedAt: Date;
  phaseStartedAt: Date;
  history: Array<{
    from: Phase;
    to: Phase;
    timestamp: Date;
    reason?: string;
  }>;
  context: Record<string, unknown>;
}

// Результат перехода
interface TransitionResult {
  success: boolean;
  previousPhase: Phase;
  currentPhase: Phase;
  iterations: number;
  canContinue: boolean;
  error?: string;
}

/**
 * Phase Machine для управления сложными сценариями
 */
export class PhaseMachine {
  private state: PhaseState;

  constructor(initialContext: Record<string, unknown> = {}) {
    this.state = {
      currentPhase: 'idle',
      previousPhase: null,
      iterations: {
        idle: 0,
        discovery: 0,
        recognition: 0,
        analysis: 0,
        action: 0,
        validation: 0,
        completed: 0,
      },
      totalIterations: 0,
      startedAt: new Date(),
      phaseStartedAt: new Date(),
      history: [],
      context: initialContext,
    };
  }

  /**
   * Получить текущую фазу
   */
  getCurrentPhase(): Phase {
    return this.state.currentPhase;
  }

  /**
   * Получить конфигурацию текущей фазы
   */
  getCurrentConfig(): PhaseConfig {
    return PHASE_CONFIGS[this.state.currentPhase];
  }

  /**
   * Получить состояние
   */
  getState(): Readonly<PhaseState> {
    return { ...this.state };
  }

  /**
   * Проверить, можно ли перейти в указанную фазу
   */
  canTransitionTo(phase: Phase): boolean {
    const currentConfig = this.getCurrentConfig();
    return currentConfig.nextPhases.includes(phase);
  }

  /**
   * Перейти в следующую фазу
   */
  transition(nextPhase: Phase, reason?: string): TransitionResult {
    const currentPhase = this.state.currentPhase;
    
    // Проверяем допустимость перехода
    if (!this.canTransitionTo(nextPhase)) {
      logger.warn('[PhaseMachine] Invalid transition', { 
        from: currentPhase, 
        to: nextPhase,
        allowed: this.getCurrentConfig().nextPhases,
      });
      
      return {
        success: false,
        previousPhase: currentPhase,
        currentPhase,
        iterations: this.state.iterations[nextPhase],
        canContinue: true,
        error: `Cannot transition from ${currentPhase} to ${nextPhase}`,
      };
    }

    // Проверяем лимит итераций для следующей фазы
    const nextConfig = PHASE_CONFIGS[nextPhase];
    if (this.state.iterations[nextPhase] >= nextConfig.maxIterations) {
      logger.warn('[PhaseMachine] Max iterations reached', { 
        phase: nextPhase,
        iterations: this.state.iterations[nextPhase],
        max: nextConfig.maxIterations,
      });
      
      return {
        success: false,
        previousPhase: currentPhase,
        currentPhase,
        iterations: this.state.iterations[nextPhase],
        canContinue: false,
        error: `Max iterations (${nextConfig.maxIterations}) reached for phase ${nextPhase}`,
      };
    }

    // Выполняем переход
    this.state.previousPhase = currentPhase;
    this.state.currentPhase = nextPhase;
    this.state.iterations[nextPhase]++;
    this.state.totalIterations++;
    this.state.phaseStartedAt = new Date();
    
    // Записываем в историю
    this.state.history.push({
      from: currentPhase,
      to: nextPhase,
      timestamp: new Date(),
      reason,
    });

    logger.info('[PhaseMachine] Transition', { 
      from: currentPhase, 
      to: nextPhase,
      reason,
      totalIterations: this.state.totalIterations,
    });

    return {
      success: true,
      previousPhase: currentPhase,
      currentPhase: nextPhase,
      iterations: this.state.iterations[nextPhase],
      canContinue: true,
    };
  }

  /**
   * Автоматический переход на основе результата
   */
  autoTransition(result: {
    hasEntities: boolean;
    isComplete: boolean;
    hasQuestions: boolean;
    needsMoreFiles: boolean;
  }): TransitionResult {
    const currentPhase = this.state.currentPhase;
    
    // Логика переходов на основе результата
    switch (currentPhase) {
      case 'idle':
        return this.transition('discovery', 'start processing');
        
      case 'discovery':
        if (result.hasEntities) {
          return this.transition('recognition', 'entities found');
        }
        return this.transition('analysis', 'no entities, analyze structure');
        
      case 'recognition':
        return this.transition('analysis', 'entities recognized');
        
      case 'analysis':
        if (result.isComplete) {
          return this.transition('action', 'graph complete');
        }
        if (result.needsMoreFiles) {
          return this.transition('discovery', 'need more files');
        }
        return this.transition('validation', 'check results');
        
      case 'action':
        return this.transition('validation', 'actions executed');
        
      case 'validation':
        if (result.isComplete && !result.hasQuestions) {
          return this.transition('completed', 'validation passed');
        }
        if (result.hasQuestions) {
          return this.transition('discovery', 'need clarification');
        }
        return this.transition('action', 'need more actions');
        
      case 'completed':
        return this.transition('idle', 'reset');
        
      default:
        return {
          success: false,
          previousPhase: currentPhase,
          currentPhase,
          iterations: 0,
          canContinue: false,
          error: 'Unknown phase',
        };
    }
  }

  /**
   * Обновить контекст
   */
  updateContext(data: Record<string, unknown>): void {
    this.state.context = { ...this.state.context, ...data };
  }

  /**
   * Получить контекст
   */
  getContext(): Record<string, unknown> {
    return { ...this.state.context };
  }

  /**
   * Проверить таймаут текущей фазы
   */
  isTimedOut(): boolean {
    const config = this.getCurrentConfig();
    if (!config.timeout) return false;
    
    const elapsed = Date.now() - this.state.phaseStartedAt.getTime();
    return elapsed > config.timeout;
  }

  /**
   * Получить время в текущей фазе (ms)
   */
  getPhaseDuration(): number {
    return Date.now() - this.state.phaseStartedAt.getTime();
  }

  /**
   * Получить общее время работы (ms)
   */
  getTotalDuration(): number {
    return Date.now() - this.state.startedAt.getTime();
  }

  /**
   * Проверить, достигнут ли лимит итераций
   */
  isExhausted(): boolean {
    // Общий лимит 50 итераций
    if (this.state.totalIterations >= 50) {
      return true;
    }
    
    // Проверяем таймаут
    if (this.isTimedOut()) {
      return true;
    }
    
    return false;
  }

  /**
   * Сбросить машину в начальное состояние
   */
  reset(newContext: Record<string, unknown> = {}): void {
    this.state = {
      currentPhase: 'idle',
      previousPhase: null,
      iterations: {
        idle: 0,
        discovery: 0,
        recognition: 0,
        analysis: 0,
        action: 0,
        validation: 0,
        completed: 0,
      },
      totalIterations: 0,
      startedAt: new Date(),
      phaseStartedAt: new Date(),
      history: [],
      context: newContext,
    };
    
    logger.info('[PhaseMachine] Reset');
  }

  /**
   * Получить статистику
   */
  getStats(): {
    currentPhase: Phase;
    totalIterations: number;
    phaseIterations: Record<Phase, number>;
    totalDuration: number;
    phaseDuration: number;
    historyLength: number;
    isExhausted: boolean;
    isTimedOut: boolean;
  } {
    return {
      currentPhase: this.state.currentPhase,
      totalIterations: this.state.totalIterations,
      phaseIterations: { ...this.state.iterations },
      totalDuration: this.getTotalDuration(),
      phaseDuration: this.getPhaseDuration(),
      historyLength: this.state.history.length,
      isExhausted: this.isExhausted(),
      isTimedOut: this.isTimedOut(),
    };
  }

  /**
   * Сериализовать состояние для сохранения
   */
  serialize(): string {
    return JSON.stringify({
      currentPhase: this.state.currentPhase,
      previousPhase: this.state.previousPhase,
      iterations: this.state.iterations,
      totalIterations: this.state.totalIterations,
      startedAt: this.state.startedAt.toISOString(),
      phaseStartedAt: this.state.phaseStartedAt.toISOString(),
      history: this.state.history.map(h => ({
        ...h,
        timestamp: h.timestamp.toISOString(),
      })),
      context: this.state.context,
    });
  }

  /**
   * Десериализовать состояние
   */
  static deserialize(data: string): PhaseMachine {
    const parsed = JSON.parse(data);
    const machine = new PhaseMachine(parsed.context);
    
    machine.state.currentPhase = parsed.currentPhase;
    machine.state.previousPhase = parsed.previousPhase;
    machine.state.iterations = parsed.iterations;
    machine.state.totalIterations = parsed.totalIterations;
    machine.state.startedAt = new Date(parsed.startedAt);
    machine.state.phaseStartedAt = new Date(parsed.phaseStartedAt);
    machine.state.history = parsed.history.map((h: { from: Phase; to: Phase; timestamp: string; reason?: string }) => ({
      ...h,
      timestamp: new Date(h.timestamp),
    }));
    
    return machine;
  }
}

// Removed singleton exports to prevent race conditions.
// Always instantiate PhaseMachine per request.
