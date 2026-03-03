import type {PipelineStage} from '../types.js';

export function resolveStageDependencies(stages: PipelineStage[]): PipelineStage[] {
    const stageByName = new Map<string, PipelineStage>();

    stages.forEach(stage => {
        if (stageByName.has(stage.name)) {
            throw new Error(`Duplicate stage name detected: ${stage.name}`);
        }
        stageByName.set(stage.name, stage);
    });

    const visited = new Map<string, 'visiting' | 'visited'>();
    const ordered: PipelineStage[] = [];

    for (const stage of stages) {
        visit(stage.name);
    }

    return ordered;

    function visit(stageName: string): void {
        const state = visited.get(stageName);
        if (state === 'visited') {
            return;
        }

        if (state === 'visiting') {
            throw new Error(`Cycle detected while resolving stage dependencies at ${stageName}`);
        }

        const stage = stageByName.get(stageName);
        if (!stage) {
            throw new Error(`Undefined stage dependency referenced: ${stageName}`);
        }

        visited.set(stageName, 'visiting');

        const dependencies = resolveDepends(stage.dependsOn);
        for (const dependency of dependencies) {
            visit(dependency);
        }

        visited.set(stageName, 'visited');
        ordered.push(stage);
    }
}

function resolveDepends(depends?: string | string[]): string[] {
    if (!depends) {
        return [];
    }

    if (Array.isArray(depends)) {
        return depends;
    }

    return [depends];
}
