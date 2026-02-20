import {
  registerBaseNeurons,
  getAllNeurons,
  activateNeurons,
  clearNeurons,
} from '../../../src/knowledge/neurons/index.js';

describe('base neurons', () => {
  beforeEach(() => clearNeurons());

  describe('registerBaseNeurons', () => {
    it('registers 7 neurons', () => {
      registerBaseNeurons();
      expect(getAllNeurons()).toHaveLength(7);
    });

    it('includes project-detector with composer.json trigger', () => {
      registerBaseNeurons();
      const detector = getAllNeurons().find((n) => n.id === 'neuron-project-detector');
      expect(detector?.triggers).toContain('composer.json');
    });
  });

  describe('activation on Laravel project structure', () => {
    it('activates project-detector for composer.json', () => {
      registerBaseNeurons();
      const activated = activateNeurons({
        projectStructure: ['composer.json', 'app/', 'routes/'],
      });
      const ids = activated.map((a) => a.neuron.id);
      expect(ids).toContain('neuron-project-detector');
    });

    it('activates validation for FormRequest path', () => {
      registerBaseNeurons();
      const activated = activateNeurons({
        filePaths: ['app/Http/Requests/StoreUserRequest.php'],
      });
      expect(activated.some((a) => a.neuron.id === 'neuron-validation')).toBe(true);
    });

    it('activates routing for routes path', () => {
      registerBaseNeurons();
      const activated = activateNeurons({
        filePaths: ['routes/web.php'],
      });
      expect(activated.some((a) => a.neuron.id === 'neuron-routing')).toBe(true);
    });
  });
});
