/**
 * Action Message Builder
 *
 * Специализированный билдер для построения action-сообщений
 * Интеграция с TaskResult, ProposedActions
 */

import {
    BaseMessageBuilder,
    MessageBuilderOptions,
    ValidationResult
} from './base-builder.js';
import {ServerMessage, ClientMessage, ContextBlock} from '../../types/index.js';

export interface ActionStep {
    id: string;
    title: string;
    code?: string;
}

export interface ProposedAction {
    id: string;
    title: string;
    matchScore?: number;
    description?: string;
    priority?: number;
    dsl?: Record<string, unknown>;
    dslScript?: string;
}

export interface ActionMessageOptions extends MessageBuilderOptions {
    actionId?: string;
    actionTitle?: string;
    currentStep?: ActionStep | null;
    nextSteps?: Array<{id: string; title: string}>;
    executingActionId?: string;
    executingActionTitle?: string;
    executingActionDescription?: string;
    proposedActions?: ProposedAction[];
}

/**
 * Билдер для создания action-сообщений сервера
 */
export class ActionMessageBuilder extends BaseMessageBuilder<ServerMessage> {
    private actionId?: string;
    private actionTitle?: string;
    private currentStep?: ActionStep | null;
    private nextSteps?: Array<{id: string; title: string}>;
    private executingActionId?: string;
    private executingActionTitle?: string;
    private executingActionDescription?: string;
    private proposedActions?: ProposedAction[];

    constructor(sessionId: string) {
        super(sessionId);
    }

    /**
     * Установить данные о выполняемом действии
     */
    withAction(
        id: string,
        title: string,
        matchScore?: number
    ): this {
        this.actionId = id;
        this.actionTitle = title;
        this.context.action = {
            id,
            title,
            ...(matchScore !== undefined && {matchScore}),
        };
        return this;
    }

    /**
     * Установить текущий шаг
     */
    withCurrentStep(step: ActionStep | null): this {
        this.currentStep = step;
        if (this.context.action) {
            this.context.action.currentStep = step ?? undefined;
        }
        return this;
    }

    /**
     * Добавить следующие шаги
     */
    withNextSteps(steps: Array<{id: string; title: string}>): this {
        this.nextSteps = steps;
        if (this.context.action) {
            this.context.action.nextSteps = steps;
        }
        return this;
    }

    /**
     * Установить выполняемое действие (action_executing response)
     */
    withExecutingAction(
        actionId: string,
        title: string,
        description?: string,
        priority?: number
    ): this {
        this.executingActionId = actionId;
        this.executingActionTitle = title;
        this.executingActionDescription = description;
        this.context.executingAction = {
            actionId,
            title,
            ...(description && {description}),
            ...(priority !== undefined && {priority}),
        };
        return this;
    }

    /**
     * Установить предлагаемые действия (для LLM выбора)
     */
    withProposedActions(actions: ProposedAction[]): this {
        this.proposedActions = actions;
        // Для обратной совместимости - действие с наивысшим приоритетом
        if (actions.length > 0) {
            const best = actions.reduce((prev, curr) => 
                (curr.priority || 0) > (prev.priority || 0) ? curr : prev
            );
            this.withAction(best.id, best.title, best.matchScore);
            
            if (best.description) {
                this.context.executingAction = {
                    actionId: best.id,
                    title: best.title,
                    description: best.description,
                    priority: best.priority,
                    dsl: best.dsl,
                    dslScript: best.dslScript,
                };
            }
        }
        return this;
    }

    /**
     * Построить server message с action данными (новый протокол - execute.script)
     */
    build(): ServerMessage {
        const result: ServerMessage = {
            context: this.context,
        };

        // Если есть скрипт - возвращаем execute.script (action-key shape)
        const scriptInput = (this as any)._scriptInput;
        const scriptOutput = (this as any)._scriptOutput;
        const scriptCode = (this as any)._scriptCode;
        
        if (scriptInput !== undefined || scriptCode) {
            result.execute = {
                script: {
                    input: scriptInput || {},
                    output: scriptOutput || '',
                    code: scriptCode || ''
                }
            };
        }

        if (this.files && this.files.length > 0) {
            result.files = this.files;
        }

        if (this.message) {
            result.message = this.message;
        }

        return result;
    }

    /**
     * Создать execute.script ответ для шага
     */
    withScriptStep(input: Record<string, unknown>, output: string, code: string): this {
        this.context.architectural_features = ['execute:script'];
        this.currentStep = { id: 'script', title: 'Execute Script', code };
        (this as any)._scriptInput = input;
        (this as any)._scriptOutput = output;
        (this as any)._scriptCode = code;
        return this;
    }

    /**
     * Установить finalResult для завершения action
     */
    withFinalResult(action: string, summary: Record<string, unknown>): this {
        (this as any)._finalResult = { action, summary };
        return this;
    }

    /**
     * Клонировать билдер с новым sessionId
     */
    clone(sessionId: string): ActionMessageBuilder {
        const builder = new ActionMessageBuilder(sessionId);
        builder.context = {...this.context, session_id: sessionId};
        builder.files = this.files ? [...this.files] : undefined;
        builder.message = this.message;
        builder.actionId = this.actionId;
        builder.actionTitle = this.actionTitle;
        builder.currentStep = this.currentStep;
        builder.nextSteps = this.nextSteps ? [...this.nextSteps] : undefined;
        builder.executingActionId = this.executingActionId;
        builder.executingActionTitle = this.executingActionTitle;
        builder.executingActionDescription = this.executingActionDescription;
        builder.proposedActions = this.proposedActions ? [...this.proposedActions] : undefined;
        return builder;
    }
}

/**
 * Билдер для создания client message с actions
 */
export class ActionClientMessageBuilder extends BaseMessageBuilder<ClientMessage> {
    private task?: string;

    constructor(sessionId: string) {
        super(sessionId);
    }

    /**
     * Установить задачу (task) для action processing
     */
    withTask(task: string): this {
        this.task = task;
        this.context.task = task;
        return this;
    }

    /**
     * Построить client message
     */
    build(): ClientMessage {
        const result: ClientMessage = {
            context: this.context,
        };

        if (this.files && this.files.length > 0) {
            result.files = this.files;
        }

        return result;
    }

    /**
     * Клонировать билдер с новым sessionId
     */
    clone(sessionId: string): ActionClientMessageBuilder {
        const builder = new ActionClientMessageBuilder(sessionId);
        builder.context = {...this.context, session_id: sessionId};
        builder.files = this.files ? [...this.files] : undefined;
        builder.task = this.task;
        return builder;
    }
}

// ============================================
// Factory Functions (совместимость с существующим API)
// ============================================

/**
 * Создать ActionMessageBuilder
 */
export function createActionMessageBuilder(sessionId: string): ActionMessageBuilder {
    return new ActionMessageBuilder(sessionId);
}

/**
 * Создать ActionClientMessageBuilder
 */
export function createActionClientMessageBuilder(sessionId: string): ActionClientMessageBuilder {
    return new ActionClientMessageBuilder(sessionId);
}
