import {describe, expect, it, vi} from 'vitest';
import {NeuronRegistry} from '@/neurons-v2/neuron-registry.js';
import type {DialogContext, NeuronPlugin} from '@/neurons-v2/types.js';

const baseContext: DialogContext = {
    userMessage: 'Inspect project',
};

function createDummyPlugin(options: Partial<NeuronPlugin> = {}): NeuronPlugin {
    const plugin: NeuronPlugin = {
        name: options.name ?? 'dummy',
        version: options.version ?? '1.0.0',
        type: options.type ?? 'intent_detector',
        shouldActivate: options.shouldActivate ?? (() => true),
        process: options.process ?? (async () => ({})),
        onActivate: options.onActivate,
        onDeactivate: options.onDeactivate,
    };

    return plugin;
}

describe('NeuronRegistry', () => {
    it('registers and filters by type', async () => {
        const registry = new NeuronRegistry();
        const plugin = createDummyPlugin({name: 'intent', version: '1.0.0'});
        registry.register(plugin);

        const all = await registry.getAll();
        expect(all).toHaveLength(1);
        expect(all[0].name).toBe('intent');

        const byType = await registry.getByType('intent_detector');
        expect(byType).toHaveLength(1);
        expect(byType[0].name).toBe('intent');
    });

    it('loads lazy plugin once and exposes active plugins', async () => {
        const registry = new NeuronRegistry();
        const loader = vi.fn(async () => createDummyPlugin({name: 'lazy', version: '1.2.0'}));
        registry.registerLazy('lazy', '1.2.0', loader);

        await registry.getAll();
        await registry.getAll();
        expect(loader).toHaveBeenCalledTimes(1);

        const active = await registry.getActivePlugins(baseContext);
        expect(active).toHaveLength(1);
        expect(active[0].name).toBe('lazy');
    });

    it('calls onActivate and onDeactivate during lifecycle', async () => {
        const registry = new NeuronRegistry();
        const activate = vi.fn();
        const deactivate = vi.fn();

        registry.register(createDummyPlugin({
            name: 'lifecycle',
            onActivate: activate,
            onDeactivate: deactivate,
            shouldActivate: () => true,
        }));

        await registry.getActivePlugins(baseContext);
        expect(activate).toHaveBeenCalled();

        registry.unregister('lifecycle');
        expect(deactivate).toHaveBeenCalled();
        const all = await registry.getAll();
        expect(all).toHaveLength(0);
    });

    it('rejects registering an older version', () => {
        const registry = new NeuronRegistry();
        registry.register(createDummyPlugin({name: 'versioned', version: '1.0.0'}));

        expect(() => registry.register(createDummyPlugin({name: 'versioned', version: '0.5.0'})))
            .toThrow(/Cannot register older version/);
    });
});
