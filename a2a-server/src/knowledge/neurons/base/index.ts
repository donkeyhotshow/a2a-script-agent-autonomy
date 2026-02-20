import { registerNeuron } from '../neuron-store.js';
import { bootstrapNeuron } from './bootstrap.neuron.js';
import { validationNeuron } from './validation.neuron.js';
import { authNeuron } from './auth.neuron.js';
import { eloquentNeuron } from './eloquent.neuron.js';
import { routingNeuron } from './routing.neuron.js';
import { viewsNeuron } from './views.neuron.js';
import { testingNeuron } from './testing.neuron.js';
import { projectDetectorNeuron } from './project-detector.neuron.js';

export function registerBaseNeurons(): void {
  registerNeuron(bootstrapNeuron);
  registerNeuron(validationNeuron);
  registerNeuron(authNeuron);
  registerNeuron(eloquentNeuron);
  registerNeuron(routingNeuron);
  registerNeuron(viewsNeuron);
  registerNeuron(testingNeuron);
  registerNeuron(projectDetectorNeuron);
}
