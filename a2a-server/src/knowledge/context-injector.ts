/**
 * Context Injector — resolves @INJECT actions from activated neurons
 * Production-ready: guards, malformed action handling, deterministic order
 */

import { getContextBlock } from './context-store.js';
import type {
  ActivatedNeuron,
  NeuronAction,
  NeuronActionRequestFiles,
} from './neurons/neuron.types.js';

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

function isRequestFilesAction(action: unknown): action is NeuronActionRequestFiles {
  return (
    action !== null &&
    typeof action === 'object' &&
    'type' in action &&
    (action as NeuronActionRequestFiles).type === 'request_files' &&
    'items' in action &&
    Array.isArray((action as NeuronActionRequestFiles).items)
  );
}

/** Sort by priority (higher first). Default priority 5. */
export function sortByPriority(
  activated: ActivatedNeuron[] | null | undefined
): ActivatedNeuron[] {
  const list = Array.isArray(activated) ? [...activated] : [];
  return list.sort((a, b) => (b.neuron.priority ?? 5) - (a.neuron.priority ?? 5));
}

/**
 * Resolve inject actions from activated neurons.
 * - Skips malformed actions (missing type, empty target)
 * - Deduplicates by target (first occurrence wins)
 * - Order by neuron priority (higher first)
 */
export function resolveInjections(
  activated: ActivatedNeuron[] | null | undefined
): InjectedContext[] {
  const seen = new Set<string>();
  const result: InjectedContext[] = [];

  const list = sortByPriority(activated);

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
 * Resolve request_files actions from activated neurons.
 * Returns deduplicated items. Order by neuron priority.
 */
export function resolveRequestFiles(
  activated: ActivatedNeuron[] | null | undefined
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const list = sortByPriority(activated);

  for (const { neuron } of list) {
    const actions = neuron?.actions;
    if (!Array.isArray(actions)) continue;
    for (const action of actions) {
      if (!isRequestFilesAction(action)) continue;
      for (const item of action.items) {
        if (typeof item === 'string' && item.length > 0 && !seen.has(item)) {
          seen.add(item);
          result.push(item);
        }
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
