/**
 * Neuron Request Processor Helpers
 * 
 * Вспомогательные функции для NeuronRequestProcessor
 */

import type {Graph} from '../graph-store.service.js';
import {getGraphStats} from '../graph-store.service.js';

/**
 * Generate contextual questions based on missing items and graph state
 */
export function generateQuestions(missing: string[], graph: Graph): string[] {
    const questions: string[] = [];

    for (const item of missing) {
        if (item.includes('Controller')) {
            questions.push('Which controller handles this functionality? Please provide the controller file.');
        } else if (item.includes('Model')) {
            questions.push('Which model represents the data? Please provide the model file.');
        } else if (item.includes('Request')) {
            questions.push('Is there a FormRequest for validation? Please provide the request file or validation rules.');
        } else if (item.includes('Vue') || item.includes('Component')) {
            questions.push('Which Vue component should be modified? Please provide the component file.');
        } else if (item.includes('No entities')) {
            questions.push('Please provide the relevant code files (controller, model, service, or Vue components).');
        } else {
            questions.push(`Missing: ${item}. Please provide the relevant file.`);
        }
    }

    // Add contextual questions based on graph content
    const stats = getGraphStats(graph);

    // If we have models but no relations
    if ((stats.entityTypes['MODEL'] || 0) > 0 && stats.relationCount === 0) {
        questions.push('Are there relationships between models (belongsTo, hasMany)? Please provide files with relations.');
    }

    // If we have controller but no model
    if ((stats.entityTypes['CONTROLLER'] || 0) > 0 && (stats.entityTypes['MODEL'] || 0) === 0) {
        questions.push('Which model does this controller work with? Please provide the model file.');
    }

    return Array.from(new Set(questions)); // Deduplicate
}
