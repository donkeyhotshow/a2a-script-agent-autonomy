/**
 * Auto-Decomposition Helpers
 * 
 * Вспомогательные методы для автоматического разбиения задач
 */

import type { 
    StructuredTask 
} from './task-capture.service.js';
import type { 
    Subtask, 
    Step, 
    DependencyType 
} from './types.js';

/**
 * Auto-decompose a structured task into subtasks
 */
export function autoDecomposeTask(task: StructuredTask): Array<{
    title: string;
    description: string;
    order: number;
    estimatedDuration?: number;
    dependencies?: Array<{dependsOnOrder: number; type: DependencyType}>;
}> {
    // Simple heuristic-based decomposition
    const requirements = task.requirements || [];
    
    if (requirements.length === 0) {
        return [{
            title: task.title || 'Main Task',
            description: task.description,
            order: 1,
            estimatedDuration: 30,
        }];
    }

    return requirements.map((req, index) => ({
        title: req.slice(0, 50) + (req.length > 50 ? '...' : ''),
        description: req,
        order: index + 1,
        estimatedDuration: 20 + Math.floor(Math.random() * 40),
        dependencies: index > 0 ? [{dependsOnOrder: index, type: 'requires'}] : [],
    }));
}

/**
 * Auto-decompose a subtask into steps
 */
export function autoDecomposeSubtask(subtask: Subtask): Array<{
    title: string;
    description: string;
    order: number;
    estimatedDuration?: number;
}> {
    // Parse description for action items
    const lines = subtask.description.split('\n').filter(l => l.trim());
    const actionItems = lines.filter(l => 
        l.match(/^\s*[-*+]\s+/) || 
        l.match(/^\s*\d+\.\s+/)
    );

    if (actionItems.length === 0) {
        return [{
            title: subtask.title,
            description: subtask.description,
            order: 1,
            estimatedDuration: subtask.estimatedDuration || 20,
        }];
    }

    const durationPerStep = Math.floor((subtask.estimatedDuration || 20) / actionItems.length);

    return actionItems.map((item, index) => ({
        title: item.replace(/^\s*[-*+\d.\s]+/, '').slice(0, 40),
        description: item,
        order: index + 1,
        estimatedDuration: durationPerStep,
    }));
}

/**
 * Auto-decompose a step into actions
 */
export function autoDecomposeStep(step: Step): Array<{
    type: string;
    description: string;
    order: number;
    input?: Record<string, unknown>;
}> {
    // Determine action types based on step description
    const description = step.description.toLowerCase();
    
    const actions: Array<{
        type: string;
        description: string;
        order: number;
        input?: Record<string, unknown>;
    }> = [];

    if (description.includes('analyze') || description.includes('check')) {
        actions.push({
            type: 'analyze',
            description: 'Analyze context and requirements',
            order: 1,
        });
    }

    if (description.includes('search') || description.includes('find')) {
        actions.push({
            type: 'rag-search',
            description: 'Search relevant code and documentation',
            order: actions.length + 1,
        });
    }

    if (description.includes('read') || description.includes('load')) {
        actions.push({
            type: 'read-file',
            description: 'Read file contents',
            order: actions.length + 1,
        });
    }

    if (description.includes('write') || description.includes('create')) {
        actions.push({
            type: 'write-file',
            description: 'Write or modify file',
            order: actions.length + 1,
        });
    }

    if (description.includes('execute') || description.includes('run')) {
        actions.push({
            type: 'execute-command',
            description: 'Execute shell command',
            order: actions.length + 1,
        });
    }

    if (actions.length === 0) {
        actions.push({
            type: 'process',
            description: step.description,
            order: 1,
        });
    }

    return actions;
}

/**
 * Check if subtasks can run in parallel
 */
export function canParallelize(subtasks: Array<{dependencies: Array<{type: string}>}>): boolean {
    // Check if any subtasks can run in parallel (no required dependencies)
    return subtasks.some(s => 
        s.dependencies.filter(d => d.type === 'requires').length === 0
    );
}

/**
 * Estimate steps for a subtask
 */
export function estimateStepsForSubtask(subtask: Subtask): number {
    // Rough estimate based on description complexity
    const wordCount = subtask.description.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 20));
}
