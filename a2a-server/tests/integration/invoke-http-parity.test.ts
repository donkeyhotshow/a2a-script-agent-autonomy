/**
 * HTTP parity: proba-servera payloads via POST /api/v1/invoke, then poll GET …/requests/:id/result.
 * Exercises the async client path (promiseId → poll), not sync terminal JSON from /invoke.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import request from 'supertest';
import {beforeAll, describe, expect, it} from 'vitest';
import app from '../../src/app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const PROBA = path.join(REPO_ROOT, 'tests', 'proba-servera');

const POLL_INTERVAL_MS = 40;
/** Under full Vitest parallel load, GET …/result can briefly return 404 before the record is visible. */
const MAX_NOT_FOUND_POLLS = 200;

function loadProbaCase(name: string): Record<string, unknown> {
    const p = path.join(PROBA, name, 'input.json');
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
}

/** Invoke body (async-only server — no `sync` field). */
function toAsyncHttpBody(input: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {
        context: input.context,
    };
    if (typeof input.task === 'string') out.task = input.task;
    if (typeof input.message === 'string') out.message = input.message;
    if (input.result && typeof input.result === 'object') out.result = input.result;
    if (typeof input.action === 'string') out.action = input.action;
    if (input.selectedAction && typeof input.selectedAction === 'object') {
        out.selectedAction = input.selectedAction;
    }
    if (typeof input.stepId === 'string') out.stepId = input.stepId;
    if (input.stepResult !== undefined) out.stepResult = input.stepResult;
    if (input.code_blocks !== undefined) out.code_blocks = input.code_blocks;
    return out;
}

function expectNoSessionIdInClientContext(ctx: unknown): void {
    expect(ctx && typeof ctx === 'object', 'context must be object').toBe(true);
    const sid = (ctx as Record<string, unknown>)['session_id'];
    expect(sid, 'context.session_id must be hidden from API clients').toBeUndefined();
}

/** A2A: one top-level key under `execute` when present (form, script, message, …). */
function expectSingleExecuteActionKey(execute: unknown): void {
    if (execute === undefined || execute === null) return;
    expect(typeof execute).toBe('object');
    const keys = Object.keys(execute as Record<string, unknown>);
    expect(keys.length, `execute must have exactly one action key, got: ${keys.join(',')}`).toBe(1);
}

async function pollResultUntilTerminal(promiseId: string): Promise<{
    terminal: 'completed' | 'failed' | 'cancelled';
    data: Record<string, unknown>;
}> {
    let notFoundPolls = 0;
    for (;;) {
        const res = await request(app).get(`/api/v1/requests/${encodeURIComponent(promiseId)}/result`);
        if (res.status === 404) {
            notFoundPolls++;
            expect(
                notFoundPolls <= MAX_NOT_FOUND_POLLS,
                `GET …/result 404 — request ${promiseId} not found after ${MAX_NOT_FOUND_POLLS} polls`
            ).toBe(true);
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            continue;
        }
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const data = res.body.data as Record<string, unknown>;
        const st = data.status;
        if (st === 'completed' || st === 'failed' || st === 'cancelled') {
            return {terminal: st, data};
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
}

describe('Invoke HTTP parity (async poll)', () => {
    beforeAll(() => {
        process.env.SKIP_AUTH = '1';
    });

    it(
        'router-new-task: invoke returns promiseId, poll yields execute.form.choices',
        async () => {
            const body = toAsyncHttpBody(loadProbaCase('router-new-task'));
            const inv = await request(app).post('/api/v1/invoke').send(body);

            expect(inv.status, JSON.stringify(inv.body)).toBe(200);
            expect(inv.body.success).toBe(true);
            const ack = inv.body.data as Record<string, unknown>;
            expect(typeof ack.promiseId).toBe('string');
            expect(ack.promiseId).toMatch(/^prom_/);
            expect(ack.execute, 'async invoke ack must not inline execute').toBeUndefined();

            const {terminal, data} = await pollResultUntilTerminal(ack.promiseId as string);
            expect(terminal).toBe('completed');

            const choices = data?.execute?.form?.choices;
            expect(Array.isArray(choices), 'execute.form.choices must be an array').toBe(true);
            expect((choices as unknown[]).length).toBeGreaterThan(0);
            const first = (choices as Array<Record<string, unknown>>)[0];
            expect(typeof first?.id).toBe('string');
            expect(typeof first?.label).toBe('string');
            expect(data?.context?.execution?.step).toBeDefined();
            expectNoSessionIdInClientContext(data?.context);
            expectSingleExecuteActionKey(data?.execute);
        },
        180_000
    );

    it(
        'script-select: invoke returns promiseId, poll yields execute.form (no LLM hub)',
        async () => {
            const body = toAsyncHttpBody(loadProbaCase('script-select'));
            const inv = await request(app).post('/api/v1/invoke').send(body);

            expect(inv.status, JSON.stringify(inv.body)).toBe(200);
            expect(inv.body.success).toBe(true);
            const ack = inv.body.data as Record<string, unknown>;
            expect(typeof ack.promiseId).toBe('string');

            const {terminal, data} = await pollResultUntilTerminal(ack.promiseId as string);
            expect(terminal).toBe('completed');

            const form = data?.execute?.form;
            expect(form?.title ?? form?.description ?? form?.input, 'execute.form must be present').toBeTruthy();
            expect(Array.isArray(form?.input)).toBe(true);
            expectNoSessionIdInClientContext(data?.context);
            expectSingleExecuteActionKey(data?.execute);
        },
        180_000
    );
});
