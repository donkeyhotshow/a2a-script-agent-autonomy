import {afterEach, describe, expect, it, vi} from 'vitest';
import {
    DEFAULT_AI_HUB_URL,
    normalizeHttpBaseUrl,
    resolveAiHubBaseUrl,
    resolveAiHubBaseUrlWithModuleEnv,
    resolveEnvOrDefaultBaseUrl,
} from '../../src/utils/ai-hub-url';

describe('normalizeHttpBaseUrl', () => {
    it('trims and strips one trailing slash', () => {
        expect(normalizeHttpBaseUrl('  http://x/  ')).toBe('http://x');
        expect(normalizeHttpBaseUrl('http://x')).toBe('http://x');
    });

    it('coerces non-string via String()', () => {
        expect(normalizeHttpBaseUrl(null as unknown as string)).toBe('null');
    });
});

describe('resolveEnvOrDefaultBaseUrl', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('uses non-empty override over env and fallback', () => {
        vi.stubEnv('MY_BASE', 'http://from-env');
        expect(
            resolveEnvOrDefaultBaseUrl('http://override/', 'MY_BASE', 'http://fallback')
        ).toBe('http://override');
    });

    it('ignores whitespace-only override and uses env', () => {
        vi.stubEnv('MY_BASE', 'http://env-value/');
        expect(
            resolveEnvOrDefaultBaseUrl('   ', 'MY_BASE', 'http://fallback')
        ).toBe('http://env-value');
    });

    it('uses fallback when override empty and env var absent', () => {
        const key = 'A2A_TEST_RESOLVE_BASE_URL_ABSENT';
        expect(process.env[key]).toBeUndefined();
        expect(
            resolveEnvOrDefaultBaseUrl(undefined, key, 'http://fallback/')
        ).toBe('http://fallback');
    });

    it('null override reads env', () => {
        vi.stubEnv('MY_BASE', 'http://only-env');
        expect(resolveEnvOrDefaultBaseUrl(null, 'MY_BASE', 'x')).toBe('http://only-env');
    });
});

describe('resolveAiHubBaseUrl', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('uses DEFAULT_AI_HUB_URL when AI_HUB_URL is missing from process.env', () => {
        const prev = process.env.AI_HUB_URL;
        delete process.env.AI_HUB_URL;
        try {
            expect(resolveAiHubBaseUrl()).toBe(DEFAULT_AI_HUB_URL);
            expect(resolveAiHubBaseUrl(undefined)).toBe(DEFAULT_AI_HUB_URL);
        } finally {
            if (prev !== undefined) process.env.AI_HUB_URL = prev;
        }
    });

    it('empty-string AI_HUB_URL is kept (?? does not fall back)', () => {
        vi.stubEnv('AI_HUB_URL', '');
        expect(resolveAiHubBaseUrl()).toBe('');
    });

    it('respects AI_HUB_URL when override omitted', () => {
        vi.stubEnv('AI_HUB_URL', 'http://custom:11434/');
        expect(resolveAiHubBaseUrl()).toBe('http://custom:11434');
    });

    it('override beats AI_HUB_URL', () => {
        vi.stubEnv('AI_HUB_URL', 'http://ignored');
        expect(resolveAiHubBaseUrl('http://winner/')).toBe('http://winner');
    });
});

describe('resolveAiHubBaseUrlWithModuleEnv', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('uses override when non-empty', () => {
        vi.stubEnv('AI_HUB_URL', 'http://hub');
        vi.stubEnv('BLACK_ROOM', 'http://black');
        expect(
            resolveAiHubBaseUrlWithModuleEnv('http://direct/', 'BLACK_ROOM')
        ).toBe('http://direct');
    });

    it('uses module key when override empty', () => {
        vi.stubEnv('AI_HUB_URL', 'http://hub');
        vi.stubEnv('BLACK_ROOM', 'http://black-room/');
        expect(resolveAiHubBaseUrlWithModuleEnv('', 'BLACK_ROOM')).toBe(
            'http://black-room'
        );
    });

    it('falls back to global hub resolution when module env empty', () => {
        vi.stubEnv('AI_HUB_URL', 'http://global/');
        vi.stubEnv('BLACK_ROOM', '');
        expect(resolveAiHubBaseUrlWithModuleEnv(undefined, 'BLACK_ROOM')).toBe(
            'http://global'
        );
    });

    it('whitespace override is ignored for module branch', () => {
        vi.stubEnv('AI_HUB_URL', 'http://hub');
        vi.stubEnv('MOD', 'http://mod');
        expect(resolveAiHubBaseUrlWithModuleEnv('  \t  ', 'MOD')).toBe('http://mod');
    });

    it('whitespace-only module env falls back to global hub', () => {
        vi.stubEnv('AI_HUB_URL', 'http://global/');
        vi.stubEnv('MOD', '  \t  ');
        expect(resolveAiHubBaseUrlWithModuleEnv(undefined, 'MOD')).toBe(
            'http://global'
        );
    });
});
