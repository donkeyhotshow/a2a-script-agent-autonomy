import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const simulationRoot = path.resolve(process.cwd(), '..', 'simulations', 'sync');

function readJson(relativePath) {
    const fullPath = path.join(simulationRoot, relativePath);
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
}

describe('simulation workbench contract', () => {
    const responseFixtures = [
        'agent-auto-ai/3/response.json',
        'agent-auto-ai/4/response.json',
        'agent-auto-ai/5/response.json',
        'agent-auto-ai/6/response.json',
    ];

    it.each(responseFixtures)('keeps workbench.sections object in %s', (fixturePath) => {
        const payload = readJson(fixturePath);
        expect(payload?.context?.workbench).toBeTruthy();
        expect(payload.context.workbench.sections).toBeTruthy();
        expect(typeof payload.context.workbench.sections).toBe('object');
        expect(Array.isArray(payload.context.workbench.sections)).toBe(false);
    });

    it('keeps interrupt trace in gray-room substeps', () => {
        const payload = readJson('agent-auto-ai/6-sub-1/response.json');
        const trace = payload?.context?.workbench?.slots?.interruptTrace;
        expect(Array.isArray(trace)).toBe(true);
        expect(trace.length).toBeGreaterThan(0);
    });
});
