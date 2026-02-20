import {
  registerNeuron,
  clearNeurons,
} from '../../../src/knowledge/neurons/neuron-store.js';
import { activateNeurons } from '../../../src/knowledge/neurons/neuron-activator.js';
import type { Neuron } from '../../../src/knowledge/neurons/neuron.types.js';

describe('neuron-activator', () => {
  beforeEach(() => clearNeurons());

  it('returns empty when no neurons registered', () => {
    const result = activateNeurons({ filePaths: ['app/Http/Requests/UserRequest.php'] });
    expect(result).toEqual([]);
  });

  it('activates neuron when trigger matches file path', () => {
    const n: Neuron = {
      id: 'validation',
      name: 'Validation',
      category: 'validation',
      triggers: ['FormRequest', 'Requests/'],
      knowledge: { entities: [], relations: [], description: '' },
    };
    registerNeuron(n);
    const result = activateNeurons({
      filePaths: ['app/Http/Requests/UserRequest.php'],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.neuron.id).toBe('validation');
    expect(result[0]?.matchedTriggers).toContain('Requests/');
  });

  it('does not activate when no trigger matches', () => {
    const n: Neuron = {
      id: 'auth',
      name: 'Auth',
      category: 'auth',
      triggers: ['Policy', 'Guard'],
      knowledge: { entities: [], relations: [], description: '' },
    };
    registerNeuron(n);
    const result = activateNeurons({
      filePaths: ['app/Http/Requests/UserRequest.php'],
    });
    expect(result).toEqual([]);
  });

  it('includes projectStructure in path matching', () => {
    const n: Neuron = {
      id: 'project-detector',
      name: 'Project Detector',
      category: 'architecture',
      triggers: ['composer.json'],
      knowledge: { entities: [], relations: [], description: '' },
    };
    registerNeuron(n);
    const result = activateNeurons({
      filePaths: [],
      projectStructure: ['composer.json', 'app/'],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.matchedTriggers).toContain('composer.json');
  });

  it('activates multiple neurons', () => {
    registerNeuron({
      id: 'v',
      name: 'V',
      category: 'validation',
      triggers: ['Request'],
      knowledge: { entities: [], relations: [], description: '' },
    });
    registerNeuron({
      id: 'r',
      name: 'R',
      category: 'routing',
      triggers: ['routes/'],
      knowledge: { entities: [], relations: [], description: '' },
    });
    const result = activateNeurons({
      filePaths: ['app/Http/Requests/UserRequest.php', 'routes/web.php'],
    });
    expect(result).toHaveLength(2);
  });
});
