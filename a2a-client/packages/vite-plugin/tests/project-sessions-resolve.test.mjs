import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
    resolveSessionProjectPath,
    findSessionProjectPath,
    saveSession,
    loadSession,
    resolveProjectPathForApi,
} from '../../packages/vite-plugin/storage/projectSessions.js';

let storageDir;
let repoA;
let repoB;

beforeAll(() => {
    storageDir = path.join(os.tmpdir(), `a2a-proj-resolve-${Date.now()}`);
    repoA = path.join(storageDir, 'repo-a');
    repoB = path.join(storageDir, 'repo-b');
    fs.mkdirSync(repoA, { recursive: true });
    fs.mkdirSync(repoB, { recursive: true });
    process.env.A2A_CLIENT_STORAGE_DIR = storageDir;
    fs.writeFileSync(
        path.join(storageDir, 'projects.json'),
        JSON.stringify({
            projects: [
                { id: 'alpha', name: 'A', path: repoA },
                { id: 'beta', name: 'B', path: repoB },
            ],
        }),
        'utf8'
    );
});

afterAll(() => {
    try {
        fs.rmSync(storageDir, { recursive: true, force: true });
    } catch (_) {}
    delete process.env.A2A_CLIENT_STORAGE_DIR;
});

describe('projectSessions resolveSessionProjectPath', () => {
    const cwd = storageDir;

    it('defaults to first project with path', () => {
        const p = resolveSessionProjectPath(cwd, {});
        expect(path.normalize(p)).toBe(path.normalize(repoA));
    });

    it('resolves by projectId', () => {
        const p = resolveSessionProjectPath(cwd, { projectId: 'beta' });
        expect(path.normalize(p)).toBe(path.normalize(repoB));
    });

    it('resolves by projectRoot matching registered path', () => {
        const p = resolveSessionProjectPath(cwd, { projectRoot: repoB });
        expect(path.normalize(p)).toBe(path.normalize(repoB));
    });

    it('throws when projectRoot is unknown', () => {
        expect(() =>
            resolveSessionProjectPath(cwd, { projectRoot: path.join(storageDir, 'nope') })
        ).toThrow(/does not match/);
    });

    it('throws on unknown projectId', () => {
        expect(() => resolveSessionProjectPath(cwd, { projectId: 'missing' })).toThrow(/Unknown projectId/);
    });
});

describe('resolveProjectPathForApi', () => {
    const cwd = storageDir;

    it('resolves from projectRoot in sources', () => {
        const p = resolveProjectPathForApi(cwd, 'any', { projectRoot: repoB });
        expect(path.normalize(p)).toBe(path.normalize(repoB));
    });

    it('resolves from projectId in sources', () => {
        const p = resolveProjectPathForApi(cwd, 'any', { projectId: 'alpha' });
        expect(path.normalize(p)).toBe(path.normalize(repoA));
    });

    it('returns null for bad projectRoot', () => {
        expect(resolveProjectPathForApi(cwd, 'any', { projectRoot: '/nope/not-registered' })).toBeNull();
    });

    it('falls back to findSessionProjectPath', () => {
        const sid = 'sess_api_fallback';
        saveSession(repoA, { id: sid, title: 'x', createdAt: new Date().toISOString() });
        const p = resolveProjectPathForApi(cwd, sid, {});
        expect(path.normalize(p)).toBe(path.normalize(repoA));
    });
});

describe('projectSessions findSessionProjectPath', () => {
    const cwd = storageDir;

    it('finds session file across registered projects', () => {
        const sid = 'sess_find_me';
        saveSession(repoB, { id: sid, title: 'x', createdAt: new Date().toISOString() });
        const found = findSessionProjectPath(cwd, sid);
        expect(path.normalize(found)).toBe(path.normalize(repoB));
        expect(loadSession(found, sid).id).toBe(sid);
    });
});
