import type {DialogContext, DialogFile, EnrichmentData, NeuronPlugin, NeuronResult, NeuronType} from '../types.js';

const CACHE_TTL_MS = 3600 * 1000;

const frameworkCache = new Map<string, {timestamp: number; enrichments: EnrichmentData[]}>();

export class FrameworkContextNeuron implements NeuronPlugin {
    readonly name = 'framework-context';
    readonly version = '1.0.0';
    readonly type: NeuronType = 'context_enricher';

    shouldActivate(context: DialogContext): boolean {
        const hasKnownFramework = Boolean(context.framework || context.metadata?.framework);
        return !hasKnownFramework && Boolean(context.files?.length);
    }

    async process(context: DialogContext): Promise<NeuronResult> {
        const key = context.projectPath ?? 'default';
        const cached = frameworkCache.get(key);

        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return {
                enrichments: cached.enrichments,
                metadata: {priority: 10, cached: true},
            };
        }

        const detected = this.detectFrameworks(context.files ?? []);
        const enrichments = detected.map(framework => ({
            key: 'framework',
            value: framework,
            source: 'framework-context',
            confidence: framework.confidence,
        }));

        frameworkCache.set(key, {timestamp: Date.now(), enrichments});

        return {
            enrichments,
            metadata: {priority: 10, cached: false},
        };
    }

    private detectFrameworks(files: DialogFile[]): Array<{name: string; confidence: number; reason: string}> {
        const results: Array<{name: string; confidence: number; reason: string}> = [];
        const packageJsonFile = this.findFile(files, 'package.json');
        const composerJsonFile = this.findFile(files, 'composer.json');
        const tsConfigFile = this.findFile(files, 'tsconfig.json');
        const artisanFile = this.findFile(files, 'artisan');

        const seen = new Set<string>();

        if (packageJsonFile) {
            const pkg = this.safeParseJson(packageJsonFile.content);
            const dependencies = {
                ...((pkg.dependencies as Record<string, unknown>) ?? {}),
                ...((pkg.devDependencies as Record<string, unknown>) ?? {}),
            };

            if (this.hasDependency(dependencies, 'vue') || this.hasDependency(dependencies, 'nuxt')) {
                seen.add('Vue');
                results.push({name: 'Vue', confidence: 0.9, reason: 'package.json declares vue/nuxt'});
            }

            if (this.hasDependency(dependencies, 'react')) {
                seen.add('React');
                results.push({name: 'React', confidence: 0.8, reason: 'package.json declares react'});
            }
        }

        if (composerJsonFile) {
            const composer = this.safeParseJson(composerJsonFile.content);
            const requires = {...((composer.require as Record<string, unknown>) ?? {})};
            if (this.hasDependency(requires, 'laravel/framework') || artisanFile) {
                seen.add('Laravel');
                results.push({name: 'Laravel', confidence: 0.95, reason: 'composer/ artisan entry detected'});
            }
        }

        if (tsConfigFile || files.some(file => file.path.endsWith('.ts'))) {
            if (!seen.has('TypeScript')) {
                seen.add('TypeScript');
                results.push({name: 'TypeScript', confidence: 0.7, reason: 'tsconfig or .ts file present'});
            }
        }

        return results;
    }

    private findFile(files: DialogFile[], suffix: string): DialogFile | undefined {
        return files.find(file => file.path.toLowerCase().endsWith(suffix));
    }

    private safeParseJson(content: string): Record<string, any> {
        try {
            return JSON.parse(content);
        } catch {
            return {};
        }
    }

    private hasDependency(dependencies: Record<string, unknown>, name: string): boolean {
        return Object.keys(dependencies).some(key => key.toLowerCase().includes(name));
    }
}
