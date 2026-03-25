import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { buildInitialInvokeRequestBody, ROUTER_NEW_TASK_EXECUTION } from './first-invoke-payload.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../../../..');

describe('first-invoke-payload (T003)', () => {
    it('matches simulations/agent/1 execution pattern', () => {
        const golden = JSON.parse(
            readFileSync(join(repoRoot, 'simulations/agent/1/request.json'), 'utf-8')
        ) as { context: { execution: { action: string; step: string } } };

        expect(ROUTER_NEW_TASK_EXECUTION).toEqual(golden.context.execution);
    });

    it('buildInitialInvokeRequestBody sets execution and result.message', () => {
        const body = buildInitialInvokeRequestBody({
            sessionId: 'sess_x',
            task: 'hello',
            extraContext: { task: 'hello' },
        });
        expect(body.context.execution).toEqual({ action: 'task', step: 'new' });
        expect(body.result).toEqual({ message: 'hello' });
        expect(body.context.session_id).toBe('sess_x');
        expect(body.context.version).toBe('2.0');
    });
});
