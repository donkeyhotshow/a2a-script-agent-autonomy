import type {DetectedIntent, DialogContext, EnrichedContext, EnrichmentData, NeuronResult, SuggestedAction} from '../types.js';

export function buildEnrichedContext(base: DialogContext): EnrichedContext {
    return {
        ...base,
        detectedIntents: [],
        enrichments: [],
        suggestedActions: [],
        llmNeeds: [],
        neuronMetadata: {
            executedPlugins: [],
            executionTime: 0,
            errors: [],
        },
    };
}

export function mergeNeuronResult(context: EnrichedContext, result: NeuronResult): void {
    if (!result) {
        return;
    }

    mergeDetectedIntents(context, result.intents);
    mergeEnrichments(context, result.enrichments);
    mergeSuggestedActions(context, result.suggestedActions);
}

function mergeDetectedIntents(context: EnrichedContext, intents?: DetectedIntent[]): void {
    if (!intents) {
        return;
    }

    for (const intent of intents) {
        const exists = context.detectedIntents.some(entry => entry.type === intent.type && Math.abs(entry.confidence - intent.confidence) < 0.001);
        if (!exists) {
            context.detectedIntents.push(intent);
        }
    }
}

function mergeEnrichments(context: EnrichedContext, enrichments?: EnrichmentData[]): void {
    if (!enrichments) {
        return;
    }

    for (const enrichment of enrichments) {
        const exists = context.enrichments.some(entry => entry.key === enrichment.key && entry.value === enrichment.value);
        if (!exists) {
            context.enrichments.push(enrichment);
        }
    }
}

function mergeSuggestedActions(context: EnrichedContext, actions?: SuggestedAction[]): void {
    if (!actions) {
        return;
    }

    for (const action of actions) {
        const exists = context.suggestedActions.some(entry => entry.title === action.title);
        if (!exists) {
            context.suggestedActions.push(action);
        }
    }
}

export function isEnrichedContext(context: DialogContext): context is EnrichedContext {
    return typeof (context as EnrichedContext).neuronMetadata === 'object' && Array.isArray((context as EnrichedContext).detectedIntents ?? null);
}

export function ensureEnrichedContext(context: DialogContext): EnrichedContext {
    if (isEnrichedContext(context)) {
        return context;
    }

    return buildEnrichedContext(context);
}
