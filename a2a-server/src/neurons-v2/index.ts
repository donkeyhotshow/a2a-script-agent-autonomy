import {NeuronOrchestrator} from './neuron-orchestrator.js';
import {NeuronRegistry} from './neuron-registry.js';
import {SemanticIntentNeuron} from './neurons/semantic-intent.neuron.js';
import {FrameworkContextNeuron} from './neurons/framework-context.neuron.js';
import {CodePatternNeuron} from './neurons/code-pattern.neuron.js';

export function registerBuiltInNeurons(registry: NeuronRegistry): void {
    registry.registerLazy('semantic-intent', '1.0.0', async () => new SemanticIntentNeuron());
    registry.registerLazy('framework-context', '1.0.0', async () => new FrameworkContextNeuron());
    registry.registerLazy('code-pattern', '1.0.0', async () => new CodePatternNeuron());
}

export {
    NeuronRegistry,
    NeuronOrchestrator,
    SemanticIntentNeuron,
    FrameworkContextNeuron,
    CodePatternNeuron,
};
