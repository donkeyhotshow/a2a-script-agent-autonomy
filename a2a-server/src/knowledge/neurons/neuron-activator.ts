/**
 * Neuron Activator — activates neurons by triggers from context
 */

import { getAllNeurons } from './neuron-store.js';
import type { ActivationContext, ActivatedNeuron } from './neuron.types.js';

export function activateNeurons(ctx: ActivationContext): ActivatedNeuron[] {
  const activated: ActivatedNeuron[] = [];
  const paths = new Set([
    ...(ctx.filePaths ?? []),
    ...(ctx.projectStructure ?? []),
  ]);

  for (const neuron of getAllNeurons()) {
    const matched = neuron.triggers.filter((t) =>
      Array.from(paths).some((p) => p.includes(t))
    );
    if (matched.length > 0) {
      activated.push({ neuron, matchedTriggers: matched });
    }
  }

  return activated;
}
