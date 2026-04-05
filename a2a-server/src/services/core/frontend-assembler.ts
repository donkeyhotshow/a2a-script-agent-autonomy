import { Graph, getRelationsForEntity } from './graph-store.service.js';
import { logger } from '../../utils/logger.js';

export interface AssemblyPlan {
    order: string[]; // entity IDs in order of implementation
    recommendations: string[];
}

export class FrontendAssembler {
    /**
     * Generate a plan for implementing components based on a dependency graph.
     * Uses a simple topological sort logic (simplified for this context).
     */
    plan(graph: Graph): AssemblyPlan {
        logger.info('[FrontendAssembler] Planning implementation order for graph');
        
        const entities = graph.entities;
        const relations = graph.relations;
        
        // Simplified dependency resolution:
        // We want to implement things that others depend on FIRST.
        const order: string[] = [];
        const visited = new Set<string>();

        // Find leaf nodes (no outgoing dependencies to other entities in this graph)
        const visit = (id: string) => {
            if (visited.has(id)) return;
            visited.add(id);

            const { outgoing } = getRelationsForEntity(graph, id);
            for (const rel of outgoing) {
                if (rel.toId && !visited.has(rel.toId)) {
                    visit(rel.toId);
                }
            }
            order.push(id);
        };

        for (const entity of entities) {
            visit(entity.id);
        }

        return {
            order: order.reverse(), // Top-down
            recommendations: [
                'Start with foundational CSS/Design Tokens.',
                'Implement atomic components (Buttons, Inputs) before complex Layouts.',
                'Verify visual consistency after each major component group using VisionTester.'
            ]
        };
    }
}

export const globalFrontendAssembler = new FrontendAssembler();
