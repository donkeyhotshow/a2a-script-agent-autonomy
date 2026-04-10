import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
    loadAdrComplianceState,
    saveAdrComplianceState,
    sessionContextAlignsWithAdrState,
    getAdrComplianceStatePath,
} from '../../packages/vite-plugin/storage/adrComplianceState.js';

let proj;

beforeAll(() => {
    proj = path.join(os.tmpdir(), `a2a-adr-state-${Date.now()}`);
    fs.mkdirSync(proj, { recursive: true });
});

afterAll(() => {
    try {
        fs.rmSync(proj, { recursive: true, force: true });
    } catch (_) {}
});

describe('adrComplianceState', () => {
    it('getAdrComplianceStatePath is under .a2a', () => {
        const p = getAdrComplianceStatePath(proj);
        expect(p).toContain('.a2a');
        expect(p.endsWith('adr-compliance-state.json')).toBe(true);
    });

    it('load returns null when missing', () => {
        expect(loadAdrComplianceState(proj)).toBeNull();
    });

    it('throws when file exists but JSON is invalid', () => {
        const file = getAdrComplianceStatePath(proj);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, '{ not json', 'utf8');
        expect(() => loadAdrComplianceState(proj)).toThrow();
    });

    it('save and load roundtrip', () => {
        const state = {
            projectRoot: proj,
            queue: ['docs/adr/x.md'],
            currentIndex: 0,
            completedAdrs: [],
        };
        saveAdrComplianceState(proj, state);
        const again = loadAdrComplianceState(proj);
        expect(again.queue).toEqual(['docs/adr/x.md']);
        expect(again.projectRoot).toBeTruthy();
    });

    it('sessionContextAlignsWithAdrState matches normalized roots', () => {
        const state = { projectRoot: proj };
        expect(sessionContextAlignsWithAdrState({ projectRoot: proj }, state)).toBe(true);
        expect(sessionContextAlignsWithAdrState({}, state)).toBe(false);
        expect(sessionContextAlignsWithAdrState({ projectRoot: proj }, {})).toBe(false);
    });
});
