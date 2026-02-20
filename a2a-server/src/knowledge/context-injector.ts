/**
 * Context Injector — resolves @INJECT actions from activated neurons
 * Production-ready: guards, malformed action handling, deterministic order
 */

import { getContextBlock } from './context-store.js';
import type { ActivatedNeuron, NeuronAction } from './neurons/neuron.types.js';

export interface InjectedContext {
  target: string;
  content: string;
}

const CONTEXT_SEPARATOR = '\n\n';

function isInjectAction(action: unknown): action is NeuronAction {
  return (
    action !== null &&
    typeof action === 'object' &&
    'type' in action &&
    (action as NeuronAction).type === 'inject' &&
    'target' in action &&
    typeof (action as NeuronAction).target === 'string' &&
    (action as NeuronAction).target.length > 0
  );
}

/**
 * Resolve inject actions from activated neurons.
 * - Skips malformed actions (missing type, empty target)
 * - Deduplicates by target (first occurrence wins)
 * - Preserves order: first neuron's first inject, then second neuron's, etc.
 */
export function resolveInjections(
  activated: ActivatedNeuron[] | null | undefined
): InjectedContext[] {
  const seen = new Set<string>();
  const result: InjectedContext[] = [];

  const list = Array.isArray(activated) ? activated : [];

  for (const { neuron } of list) {
    const actions = neuron?.actions;
    if (!Array.isArray(actions)) continue;

    for (const action of actions) {
      if (!isInjectAction(action)) continue;
      if (seen.has(action.target)) continue;

      const content = getContextBlock(action.target);
      if (content !== undefined) {
        seen.add(action.target);
        result.push({ target: action.target, content });
      }
    }
  }

  return result;
}

/**
 * Merge injected contexts into a single string for the client.
 * - Empty array returns ''
 * - Single block returns as-is (no trailing separator)
 * - Multiple blocks joined with double newline
 */
export function mergeInjectedContext(
  injected: InjectedContext[] | null | undefined
): string {
  const list = Array.isArray(injected) ? injected : [];
  const contents = list.map((i) =>
    i?.content != null ? String(i.content) : ''
  );
  return contents.join(CONTEXT_SEPARATOR);
}
