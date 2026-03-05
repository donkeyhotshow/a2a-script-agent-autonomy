import type {Neuron} from '../types/knowledge.types.js';

// New task analysis neurons
import {taskSemanticAnalyzerNeuron} from './task-semantic-analyzer.neuron.js';
import {projectContextDetectorNeuron} from './project-context-detector.neuron.js';
import {fileCollectorNeuron} from './file-collector.neuron.js';
import {externalAiTriggerNeuron} from './external-ai-trigger.neuron.js';
import {validationNeuron} from './validation.neuron.js';

// Style and structure detection neurons
import {styleDetectorNeuron} from './style-detector.neuron.js';
import {structureDetectorNeuron} from './structure-detector.neuron.js';
import {patternDetectorNeuron} from './pattern-detector.neuron.js';

// Technology detection neurons
import {techDetectorNeuron} from './tech-detector.neuron.js';
import {frontendStackDetectorNeuron} from './frontend-stack-detector.neuron.js';
import {testingFrameworkDetectorNeuron} from './testing-framework-detector.neuron.js';
import {projectStructureDetectorNeuron} from './project-structure-detector.neuron.js';

/**
 * Neurons registry
 *
 * Legacy neurons moved to archive/neurons-legacy/
 * New architecture uses task analysis neurons with iterative processing
 * Style/structure detection neurons added for data analysis and metadata labeling
 * Technology detection neurons added for framework and stack detection
 */
export const neurons: Neuron[] = [
    // Task analysis neurons (highest priority - run first)
    taskSemanticAnalyzerNeuron,
    projectContextDetectorNeuron,
    fileCollectorNeuron,
    validationNeuron,
    
    // Style and structure detection neurons (medium priority)
    styleDetectorNeuron,
    structureDetectorNeuron,
    patternDetectorNeuron,
    
    // Technology detection neurons (medium-high priority)
    techDetectorNeuron,
    frontendStackDetectorNeuron,
    testingFrameworkDetectorNeuron,
    projectStructureDetectorNeuron,
    
    // External AI trigger (lowest priority - runs last)
    externalAiTriggerNeuron,
];

/**
 * Get neurons by category
 */
export function getNeuronsByCategory(category: string): Neuron[] {
    return neurons.filter(n => n.category === category);
}

/**
 * Get neurons sorted by priority (highest first)
 */
export function getNeuronsByPriority(): Neuron[] {
    return [...neurons].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

// Re-export individual neurons for direct access
export {
    taskSemanticAnalyzerNeuron,
    projectContextDetectorNeuron,
    fileCollectorNeuron,
    validationNeuron,
    externalAiTriggerNeuron,
    styleDetectorNeuron,
    structureDetectorNeuron,
    patternDetectorNeuron,
    techDetectorNeuron,
    frontendStackDetectorNeuron,
    testingFrameworkDetectorNeuron,
    projectStructureDetectorNeuron,
};
