import type {DialogContext, NeuronPlugin, NeuronType} from './types.js';

type LazyPluginLoader = () => Promise<NeuronPlugin>;

interface RegisteredNeuron {
    version: string;
    loader: LazyPluginLoader;
    instance?: NeuronPlugin;
}

export class NeuronRegistry {
    private plugins = new Map<string, RegisteredNeuron>();
    private activationState = new Map<string, boolean>();

    register(plugin: NeuronPlugin): void {
        this.registerByLoader(plugin.name, plugin.version, () => Promise.resolve(plugin));
    }

    registerLazy(name: string, version: string, loader: LazyPluginLoader): void {
        this.registerByLoader(name, version, loader);
    }

    unregister(name: string): void {
        const entry = this.plugins.get(name);
        if (entry) {
            entry.instance?.onDeactivate?.();
            this.plugins.delete(name);
            this.activationState.delete(name);
        }
    }

    async getActivePlugins(context: DialogContext): Promise<NeuronPlugin[]> {
        const plugins = await this.getAll();
        const active: NeuronPlugin[] = [];

        for (const plugin of plugins) {
            const should = plugin.shouldActivate(context);
            const wasActive = this.activationState.get(plugin.name) ?? false;

            if (should && !wasActive) {
                plugin.onActivate?.();
            }

            if (!should && wasActive) {
                plugin.onDeactivate?.();
            }

            if (should) {
                this.activationState.set(plugin.name, true);
                active.push(plugin);
            } else if (wasActive) {
                this.activationState.set(plugin.name, false);
            }
        }

        return active;
    }

    async getAll(): Promise<NeuronPlugin[]> {
        const loaded: NeuronPlugin[] = [];

        for (const [name, entry] of this.plugins.entries()) {
            loaded.push(await this.ensureLoaded(name, entry));
        }

        return loaded;
    }

    async getByType(type: NeuronType): Promise<NeuronPlugin[]> {
        const all = await this.getAll();
        return all.filter(plugin => plugin.type === type);
    }

    async getByName(name: string): Promise<NeuronPlugin | null> {
        const entry = this.plugins.get(name);
        if (!entry) {
            return null;
        }

        return this.ensureLoaded(name, entry);
    }

    async getPluginsByNames(names: string[]): Promise<NeuronPlugin[]> {
        const plugins: NeuronPlugin[] = [];

        for (const name of names) {
            const plugin = await this.getByName(name);
            if (plugin) {
                plugins.push(plugin);
            }
        }

        return plugins;
    }

    private registerByLoader(name: string, version: string, loader: LazyPluginLoader): void {
        const existing = this.plugins.get(name);
        if (existing) {
            const comparison = this.compareVersions(version, existing.version);
            if (comparison < 0) {
                throw new Error(`Cannot register older version (${version}) of neuron ${name}`);
            }

            if (comparison === 0) {
                throw new Error(`Neuron ${name}@${version} is already registered`);
            }
        }

        this.plugins.set(name, {version, loader});
    }

    private async ensureLoaded(name: string, entry: RegisteredNeuron): Promise<NeuronPlugin> {
        if (entry.instance) {
            return entry.instance;
        }

        const plugin = await entry.loader();
        entry.instance = plugin;
        return plugin;
    }

    private compareVersions(a: string, b: string): number {
        const segmentsA = a.split('.').map(Number);
        const segmentsB = b.split('.').map(Number);
        const len = Math.max(segmentsA.length, segmentsB.length);

        for (let i = 0; i < len; i += 1) {
            const valueA = segmentsA[i] ?? 0;
            const valueB = segmentsB[i] ?? 0;

            if (valueA > valueB) {
                return 1;
            }

            if (valueA < valueB) {
                return -1;
            }
        }

        return 0;
    }
}
