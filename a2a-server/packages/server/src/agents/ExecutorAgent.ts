/**
 * ExecutorAgent — general-purpose subtask executor.
 */

import { logger } from '@a2a/server-utils/logger';
import { BaseAgent } from './BaseAgent.js';
import { AgentRole } from './IAgent.js';
import type { AgentContext, SubTask, SubTaskResult } from './IAgent.js';

export class ExecutorAgent extends BaseAgent {
    readonly role = AgentRole.EXECUTOR;
    readonly capabilities = ['file-ops', 'command-execution', 'web-search', 'code-analysis'];

    canHandle(_task: SubTask): boolean {
        return true;
    }

    async execute(task: SubTask, ctx: AgentContext): Promise<SubTaskResult> {
        const start = Date.now();
        logger.info('[ExecutorAgent] Executing', {
            taskId: task.id,
            sessionId: ctx.sessionId,
            desc: task.description.slice(0, 100),
        });

        try {
            const result = await this._dispatch(task, ctx);
            return this.successResult(task, result, start);
        } catch (err: unknown) {
            return this.failResult(task, String(err), start);
        }
    }

    private async _dispatch(task: SubTask, ctx: AgentContext): Promise<unknown> {
        const desc = task.description.toLowerCase();

        if ((desc.includes('read') || desc.includes('analyse') || desc.includes('analyze'))
            && !desc.includes('run') && !desc.includes('execute')) {
            const filePath = this._extractFilePath(task.description);
            if (filePath) {
                const { promises: fs } = await import('node:fs');
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    return { file: filePath, content: content.slice(0, 10_000) };
                } catch {
                    // fall through to generic result
                }
            }
        }

        if (desc.includes('run') || desc.includes('execute') || desc.includes('test') || desc.includes('build')) {
            const cmd = this._extractCommand(task.description);
            if (cmd) {
                const { ProcessSandbox } = await import('../execution/ProcessSandbox.js');
                const sandbox = new ProcessSandbox();
                const r = await sandbox.run(cmd, {
                    cwd: (ctx.workingContext['projectRoot'] as string | undefined) ?? process.cwd(),
                    timeoutMs: task.timeoutMs ?? 120_000,
                    env: {},
                });
                if (r.status === 'timeout') throw new Error(`Command timed out: ${cmd}`);
                return { command: cmd, stdout: r.stdout, exitCode: r.exitCode };
            }
        }

        return {
            taskId: task.id,
            description: task.description,
            sessionId: ctx.sessionId,
            note: 'Executed as generic analysis subtask',
        };
    }

    private _extractCommand(desc: string): string | null {
        const btMatch = /`([^`]+)`/.exec(desc);
        if (btMatch?.[1]) return btMatch[1];
        const cmdMatch = /\b(npm|npx|tsc|vitest|node|tsx|pnpm)\s+\S+/.exec(desc);
        return cmdMatch?.[0] ?? null;
    }

    private _extractFilePath(desc: string): string | null {
        const m = /[\w/\\.-]+\.(ts|js|json|md|txt|yaml|yml)/.exec(desc);
        return m?.[0] ?? null;
    }
}
