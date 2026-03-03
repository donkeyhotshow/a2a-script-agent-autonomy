/**
 * Simulation Message Builder
 *
 * Специализированный билдер для построения simulation-ответов
 * Поддержка replay formatting и формата A2A protocol
 */

import {
    BaseMessageBuilder,
    ValidationResult
} from './base-builder.js';
import {ServerMessage, ClientMessage, ContextBlock} from '../../types/index.js';

export interface SimulationStep {
    step: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    result?: string;
    output?: string;
    error?: string;
}

export interface SimulationOptions {
    sessionId: string;
    simulationId?: string;
    simulationName?: string;
    steps?: SimulationStep[];
    currentStep?: number;
    progress?: number;
    status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    result?: string;
    output?: string;
    replay?: boolean;
    replayData?: {
        steps: SimulationStep[];
        currentStep: number;
    };
}

/**
 * Билдер для создания simulation-сообщений
 */
export class SimulationMessageBuilder extends BaseMessageBuilder<ServerMessage> {
    private simulationId?: string;
    private simulationName?: string;
    private steps: SimulationStep[] = [];
    private currentStep?: number;
    private progress?: number;
    private status?: string;
    private result?: string;
    private output?: string;
    private replay?: boolean;
    private replayData?: {steps: SimulationStep[]; currentStep: number};

    constructor(sessionId: string) {
        super(sessionId);
    }

    /**
     * Установить ID симуляции
     */
    withSimulationId(id: string): this {
        this.simulationId = id;
        return this;
    }

    /**
     * Установить название симуляции
     */
    withSimulationName(name: string): this {
        this.simulationName = name;
        return this;
    }

    /**
     * Установить шаги симуляции
     */
    withSteps(steps: SimulationStep[]): this {
        this.steps = steps;
        return this;
    }

    /**
     * Добавить шаг к симуляции
     */
    addStep(step: SimulationStep): this {
        this.steps.push(step);
        return this;
    }

    /**
     * Установить текущий шаг
     */
    withCurrentStep(step: number): this {
        this.currentStep = step;
        return this;
    }

    /**
     * Установить прогресс (0-100)
     */
    withProgress(progress: number): this {
        this.progress = Math.max(0, Math.min(100, progress));
        return this;
    }

    /**
     * Установить статус симуляции
     */
    withStatus(status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'): this {
        this.status = status;
        return this;
    }

    /**
     * Установить результат симуляции
     */
    withResult(result: string): this {
        this.result = result;
        return this;
    }

    /**
     * Установить вывод симуляции
     */
    withOutput(output: string): this {
        this.output = output;
        return this;
    }

    /**
     * Включить режим replay
     */
    enableReplay(enable: boolean = true): this {
        this.replay = enable;
        return this;
    }

    /**
     * Установить данные для replay
     */
    withReplayData(steps: SimulationStep[], currentStep: number): this {
        this.replayData = {steps, currentStep};
        return this;
    }

    /**
     * Построить server message для симуляции
     */
    build(): ServerMessage {
        // Формируем tasks для контекста
        if (this.simulationId) {
            this.context.tasks = [
                {
                    id: this.simulationId,
                    type: 'analyze',
                    status: this.mapStatus(this.status),
                    progress: this.progress,
                },
            ];
        }

        const result: ServerMessage = {
            context: this.context,
        };

        if (this.files && this.files.length > 0) {
            result.files = this.files;
        }

        // Формируем сообщение с информацией о симуляции
        if (this.result || this.output || this.steps.length > 0) {
            let content = '';
            
            if (this.result) {
                content += `Result: ${this.result}\n`;
            }
            
            if (this.output) {
                content += `Output: ${this.output}\n`;
            }

            // Форматируем шаги для отображения
            if (this.steps.length > 0) {
                content += '\n--- Simulation Steps ---\n';
                this.steps.forEach((step, index) => {
                    const prefix = this.currentStep === index ? '→ ' : '  ';
                    const statusIcon = this.getStatusIcon(step.status);
                    content += `${prefix}${index + 1}. ${step.step} [${statusIcon}]\n`;
                    if (step.output) {
                        content += `   Output: ${step.output}\n`;
                    }
                    if (step.error) {
                        content += `   Error: ${step.error}\n`;
                    }
                });
            }

            // Replay формат
            if (this.replay && this.replayData) {
                content += '\n--- Replay Data ---\n';
                content += `Current Step: ${this.replayData.currentStep + 1}/${this.replayData.steps.length}\n`;
                content += `Progress: ${Math.round((this.replayData.currentStep / this.replayData.steps.length) * 100)}%\n`;
            }

            result.message = content;
        }

        // Добавляем action для следующих шагов
        if (this.steps.length > 0 && this.currentStep !== undefined) {
            const nextSteps = this.steps
                .slice(this.currentStep + 1)
                .map((step, i) => ({
                    id: `step-${this.currentStep! + i + 1}`,
                    title: step.step,
                }));

            if (nextSteps.length > 0) {
                result.action = {
                    id: this.simulationId || 'simulation',
                    title: this.simulationName || 'Simulation',
                    currentStep: {
                        id: `step-${this.currentStep}`,
                        title: this.steps[this.currentStep]?.step || '',
                    },
                    nextSteps,
                };
            }
        }

        return result;
    }

    /**
     * Клонировать билдер с новым sessionId
     */
    clone(sessionId: string): SimulationMessageBuilder {
        const builder = new SimulationMessageBuilder(sessionId);
        builder.context = {...this.context, session_id: sessionId};
        builder.files = this.files ? [...this.files] : undefined;
        builder.message = this.message;
        builder.simulationId = this.simulationId;
        builder.simulationName = this.simulationName;
        builder.steps = [...this.steps];
        builder.currentStep = this.currentStep;
        builder.progress = this.progress;
        builder.status = this.status;
        builder.result = this.result;
        builder.output = this.output;
        builder.replay = this.replay;
        if (this.replayData) {
            builder.replayData = {...this.replayData, steps: [...this.replayData.steps]};
        }
        return builder;
    }

    /**
     * Маппинг статуса симуляции на TaskStatus
     */
    private mapStatus(status?: string): 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' {
        switch (status) {
            case 'completed':
                return 'completed';
            case 'failed':
                return 'failed';
            case 'cancelled':
                return 'cancelled';
            case 'running':
                return 'in_progress';
            default:
                return 'pending';
        }
    }

    /**
     * Получить иконку статуса
     */
    private getStatusIcon(status: string): string {
        switch (status) {
            case 'completed':
                return '✓';
            case 'failed':
                return '✗';
            case 'in_progress':
                return '⋯';
            default:
                return '○';
        }
    }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Создать SimulationMessageBuilder
 */
export function createSimulationMessageBuilder(sessionId: string): SimulationMessageBuilder {
    return new SimulationMessageBuilder(sessionId);
}
