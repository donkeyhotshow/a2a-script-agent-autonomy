import { BaseRequestProcessor, type RequestType } from './base-processor.js';
import type { RequestContext, ProcessResult } from './request-processor.interfaces.js';
import { logger } from '../../../utils/logger.js';

interface SubTask {
  id: string;
  role: 'research' | 'code' | 'review' | 'test';
  task: string;
  promiseId?: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  result?: unknown;
}

export class SupervisorProcessor extends BaseRequestProcessor {
  constructor() { 
    super('SupervisorProcessor', {}); 
  }

  canProcess(request: RequestContext): boolean {
    const ctx = request.context;
    return ctx?.execution?.action === 'supervisor'
      || ctx?.execution?.step === 'decompose';
  }

  getRequestType(): RequestType { 
    return 'supervisor' as any; 
  }

  protected async doProcess(request: RequestContext): Promise<ProcessResult> {
    const { context } = request;
    const taskText = context?.task as string ?? '';

    logger.info('[SupervisorProcessor] Decomposing task', { taskText: taskText.substring(0, 50) });

    // Шаг 1: декомпозиция задачи
    const subtasks = await this.decompose(taskText);

    // Шаг 2: запустить суб-задачи параллельно (каждая → отдельный invoke)
    const launched = await Promise.all(
      subtasks.map(sub => this.launchSubTask(sub, context))
    );

    return {
      outcome: 'completed',
      context: {
        ...context,
        execution: { action: 'supervisor', step: 'monitoring' },
        supervisor: { subtasks: launched },
      },
      execute: {
        form: {
          title: `Запущено ${launched.length} суб-агентів`,
          description: launched.map(s => `[${s.role}] ${s.task.slice(0, 60)}`).join('\n'),
          choices: [
            { id: 'wait',   label: 'Очікувати результатів' },
            { id: 'cancel', label: 'Скасувати все' },
          ],
        },
      },
    };
  }

  private async decompose(taskText: string): Promise<SubTask[]> {
    // Простая эвристика (можно заменить LLM-вызовом):
    return [
      { id: 'r1', role: 'research', task: `Вивчи контекст: ${taskText}`, status: 'pending' },
      { id: 'c1', role: 'code',     task: `Реалізуй: ${taskText}`,       status: 'pending' },
      { id: 'v1', role: 'review',   task: `Перевір код: ${taskText}`,    status: 'pending' },
    ];
  }

  private async launchSubTask(sub: SubTask, _parentCtx: unknown): Promise<SubTask> {
    // Каждая суб-задача = отдельный POST /api/v1/invoke
    // (заглушка — реализовать через внутренний HTTP вызов к своему серверу)
    logger.info('[SupervisorProcessor] Launching subtask', { role: sub.role, id: sub.id });
    return { ...sub, status: 'running', promiseId: `sub_${sub.id}_${Date.now()}` };
  }
}
