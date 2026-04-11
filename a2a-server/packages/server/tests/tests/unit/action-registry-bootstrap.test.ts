import {describe, it, expect, afterEach} from 'vitest';
import {ActionRegistry} from '../../src/actions/action-registry';

describe('ActionRegistry bootstrap policy', () => {
    const ORIGINAL_ENV = process.env.A2A_ACTION_REGISTRY_BOOTSTRAP_MODE;

    function restoreEnv() {
        if (ORIGINAL_ENV === undefined) {
            delete process.env.A2A_ACTION_REGISTRY_BOOTSTRAP_MODE;
        } else {
            process.env.A2A_ACTION_REGISTRY_BOOTSTRAP_MODE = ORIGINAL_ENV;
        }
    }

    afterEach(() => {
        restoreEnv();
    });

    it('defaults to lenient mode and does not throw on load error', async () => {
        delete process.env.A2A_ACTION_REGISTRY_BOOTSTRAP_MODE;
        const registry = new ActionRegistry('non-existent-actions-dir-for-lenient-mode');

        await expect(registry.loadFromDirectory()).resolves.toBeUndefined();
        expect(registry.count).toBe(0);
    });

    it('throws on load error when A2A_ACTION_REGISTRY_BOOTSTRAP_MODE=fail-fast', async () => {
        process.env.A2A_ACTION_REGISTRY_BOOTSTRAP_MODE = 'fail-fast';
        const registry = new ActionRegistry('non-existent-actions-dir-for-fail-fast');

        await expect(registry.loadFromDirectory()).rejects.toBeDefined();
    });
});

