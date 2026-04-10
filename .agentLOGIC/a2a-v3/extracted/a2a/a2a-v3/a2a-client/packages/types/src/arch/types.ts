/**
 * Architectural Feature Types
 * 
 * Types related to architectural features and patterns
 */

export type ArchitecturalFeatureCategory = 'directory_structure' | 'naming_convention' | 'custom_pattern' | 'framework';

export interface ArchitecturalFeature {
    name: string;
    category: ArchitecturalFeatureCategory;
    description?: string;
    path?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Request API result types
 */
export interface RequestContextBlock {
    tasks?: import('../state/types.js').Task[];
    request_files?: string[];
    architectural_features?: ArchitecturalFeature[];
    graph?: Record<string, unknown>;
    frameworks?: Record<string, unknown>;
    new_task?: string[];
}

export interface RequestApiResult {
    outcome: 'completed' | 'graph_incomplete' | 'failed';
    message?: string;
    context?: RequestContextBlock;
    questions?: string[];
    missing?: string[];
    graph_stats?: Record<string, unknown>;
    activated_neuron_ids?: string[];
    injected_content?: string[];
    error?: Record<string, unknown>;
}
