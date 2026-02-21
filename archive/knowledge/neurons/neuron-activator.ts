/**
 * Neuron Activator — activates neurons by triggers from content.
 * Content-based: triggers match against file contents, not paths.
 * Paths do not participate (neurons-and-paths-law).
 */

import { getAllNeurons } from './neuron-store.js';
import type { ActivationContext, ActivatedNeuron, Neuron } from './neuron.types.js';

function buildContentPool(ctx: ActivationContext): string {
  const parts: string[] = [];
  if (ctx.fileContents) {
    for (const content of Object.values(ctx.fileContents)) {
      if (typeof content === 'string') parts.push(content);
    }
  }
  if (ctx.projectStructure?.length) {
    parts.push(ctx.projectStructure.join(' '));
  }
  if (ctx.taskText) {
    parts.push(ctx.taskText);
  }
  return parts.join('\n');
}

export function activateNeurons(ctx: ActivationContext): ActivatedNeuron[] {
  const activated: ActivatedNeuron[] = [];
  const contentPool = buildContentPool(ctx);
  const activatedIds = new Set<string>();

  const matchTrigger = (n: Neuron, trigger: string, pool: string): boolean => {
    if (n.triggersRegex) {
      try {
        return new RegExp(trigger).test(pool);
      } catch {
        return false;
      }
    }
    return pool.includes(trigger);
  };

  const tryActivate = (neuron: Neuron): boolean => {
    const matched = neuron.triggers.filter((t) =>
      matchTrigger(neuron, t, contentPool)
    );
    const mode = neuron.triggersMode ?? 'any';
    const ok =
      mode === 'any' ? matched.length > 0 : matched.length === neuron.triggers.length;
    if (!ok) return false;
    if (neuron.dependsOn?.length) {
      const depsMet = neuron.dependsOn.every((id) => activatedIds.has(id));
      if (!depsMet) return false;
    }
    if (neuron.conflictsWith?.length) {
      const hasConflict = neuron.conflictsWith.some((id) => activatedIds.has(id));
      if (hasConflict) return false;
    }
    activated.push({ neuron, matchedTriggers: matched });
    activatedIds.add(neuron.id);
    return true;
  };

  // Multiple passes for dependsOn (simple topological order)
  const neurons = getAllNeurons();
  let changed = true;
  while (changed) {
    changed = false;
    for (const neuron of neurons) {
      if (activatedIds.has(neuron.id)) continue;
      if (tryActivate(neuron)) changed = true;
    }
  }

  // Bootstrap: when no neurons matched, activate neurons with activatesWhenEmpty
  if (activated.length === 0) {
    for (const neuron of neurons) {
      if (neuron.activatesWhenEmpty) {
        activated.push({ neuron, matchedTriggers: ['(empty pool)'] });
      }
    }
  }

  return activated;
}
