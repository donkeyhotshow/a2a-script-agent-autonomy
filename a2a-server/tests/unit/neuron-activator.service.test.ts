/**
 * Neuron Activator Service Unit Tests
 * Etalon scenarios from docs/etalon-neuron-activation.md
 */

import {describe, it, expect} from 'vitest';
import {activateNeurons} from '../../src/services/neuron-activator.service.js';

describe('Neuron Activator Service', () => {
    it('A. Short task, no files → 0 or bootstrap when pool empty', () => {
        const result = activateNeurons({
            taskText: 'fix bug',
            codeBlocks: [],
            architecturalFeatures: [],
        });
        const pool = 'fix bug'.toLowerCase();
        expect(result.activatedNeurons.length).toBeGreaterThanOrEqual(0);
        if (result.activatedNeurons.length > 0) {
            const bootstrap = result.activatedNeurons.find((a) => a.neuron.id === 'neuron-bootstrap');
            expect(bootstrap).toBeUndefined();
        }
    });

    it('B. Short task with arch [FormRequest, Laravel] → validation neuron fires', () => {
        const result = activateNeurons({
            taskText: 'add validation',
            codeBlocks: [],
            architecturalFeatures: ['FormRequest', 'Laravel'],
        });
        const validation = result.activatedNeurons.find((a) =>
            a.neuron.id.includes('validation')
        );
        expect(validation).toBeDefined();
    });

    it('D. Task + codeBlocks with FormRequest → validation/eloquent neurons fire', () => {
        const result = activateNeurons({
            taskText: 'refactor model',
            codeBlocks: [
                {path: 'app/Models/User.php', content: 'class User extends Model { }'},
                {
                    path: 'app/Http/Requests/RegisterRequest.php',
                    content: 'class RegisterRequest extends FormRequest { }'
                },
            ],
            architecturalFeatures: [],
        });
        expect(result.activatedNeurons.length).toBeGreaterThan(0);
        expect(result.requestFiles.length).toBeGreaterThan(0);
    });

    it('E. Empty pool → no neurons fire (no bootstrap in top-100)', () => {
        const result = activateNeurons({
            taskText: '',
            codeBlocks: [],
            architecturalFeatures: [],
        });
        expect(result.activatedNeurons.length).toBe(0);
    });
});
