/**
 * Neuron Activator Service
 * Activates neurons based on content pool (taskText, codeBlocks, architectural_features)
 */

import type {Neuron, NeuronAction} from '../../types/knowledge.types.js';
import {neurons} from '../../neurons/index.js';

export interface ActivationContext {
    taskText: string;
    codeBlocks: Array<{ path: string; content: string }>;
    architecturalFeatures: string[];
    frameworkTriggers?: string[]; // Triggers extracted from package.json/composer.json
}

export interface ActivatedNeuron {
    neuron: Neuron;
    matchedTriggers: string[];
}

export interface ActivationResult {
    activatedNeurons: ActivatedNeuron[];
    requestFiles: string[];
    injectedContent: string;
}

function buildContentPool(ctx: ActivationContext): string {
    const parts: string[] = [];
    parts.push(ctx.taskText);
    for (const block of ctx.codeBlocks) {
        parts.push(block.path, block.content);
    }
    parts.push(...ctx.architecturalFeatures);
    // Add framework triggers to content pool
    if (ctx.frameworkTriggers) {
        parts.push(...ctx.frameworkTriggers);
    }
    return parts.join('\n').toLowerCase();
}

function neuronMatches(neuron: Neuron, pool: string): { match: boolean; matched: string[] } {
    if (neuron.triggers.length === 0) {
        return {match: false, matched: []};
    }
    const matched: string[] = [];
    for (const t of neuron.triggers) {
        if (pool.includes(t.toLowerCase())) {
            matched.push(t);
        }
    }
    const mode = neuron.triggersMode ?? 'any';
    const match = mode === 'any' ? matched.length > 0 : matched.length === neuron.triggers.length;
    return {match, matched};
}

function collectRequestFiles(activated: ActivatedNeuron[]): string[] {
    const seen = new Set<string>();
    for (const {neuron} of activated) {
        for (const action of neuron.actions ?? []) {
            if (action.type === 'request_files') {
                for (const item of action.items) {
                    seen.add(item);
                }
            }
        }
    }
    return Array.from(seen);
}

function buildInjectedContent(activated: ActivatedNeuron[]): string {
    const lines: string[] = [];
    for (const {neuron} of activated) {
        for (const action of neuron.actions ?? []) {
            if (action.type === 'inject') {
                lines.push(`## ${neuron.name} (${neuron.id})`);
                lines.push(`Context target: ${action.target}`);
                lines.push('');
            }
        }
    }
    return lines.join('\n').trim();
}

export function activateNeurons(ctx: ActivationContext): ActivationResult {
    const pool = buildContentPool(ctx);
    const activated: ActivatedNeuron[] = [];

    const sorted = [...neurons].sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));

    for (const neuron of sorted) {
        if (neuron.triggers.length === 0) {
            if (pool.trim().length === 0) {
                activated.push({neuron, matchedTriggers: ['bootstrap: empty pool']});
            }
            continue;
        }
        const {match, matched} = neuronMatches(neuron, pool);
        if (match) {
            activated.push({neuron, matchedTriggers: matched});
        }
    }

    return {
        activatedNeurons: activated,
        requestFiles: collectRequestFiles(activated),
        injectedContent: buildInjectedContent(activated),
    };
}
