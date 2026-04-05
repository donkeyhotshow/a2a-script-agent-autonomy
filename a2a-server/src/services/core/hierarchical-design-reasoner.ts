import { logger } from '../../utils/logger.js';
import { createArtifactWriteInput, globalArtifactStore } from './artifact-store.js';

export interface DesignManifesto {
    colors: Record<string, string>;
    typography: Record<string, string>;
    spacing: Record<string, string>;
    aesthetics: string[];
    summary: string;
    raw_manifesto: string;
}

export class HierarchicalDesignReasoner {
    private readonly COMPONENT_ID = 'HierarchicalDesignReasoner';

    constructor() {
        globalArtifactStore.registerWriter('DESIGN_MANIFESTO', this.COMPONENT_ID);
    }

    async generateManifesto(task: string, sessionContext: Record<string, unknown>): Promise<DesignManifesto> {
        logger.info(`[DesignReasoner] Generating manifesto for task: ${task.slice(0, 50)}...`);
        
        // Mocking the Lead Designer LLM call. 
        // In a real system, this calls a high-end model like Claude 3.5 Sonnet or GPT-4o.
        const manifesto: DesignManifesto = {
            colors: {
                primary: 'hsl(220, 95%, 50%)',
                background: 'hsl(240, 10%, 3.9%)',
                surface: 'hsla(240, 10%, 10%, 0.8)',
                accent: 'hsl(262, 83%, 58%)'
            },
            typography: {
                heading: 'Inter, system-ui, sans-serif',
                body: 'Outfit, sans-serif'
            },
            spacing: {
                base: '4px',
                scale: '1.5'
            },
            aesthetics: ['Glassmorphism', 'Neomorphism icons', 'Smooth gradients', 'Micro-interactions'],
            summary: 'Modern dark premium UI with high-contrast accent colors and semi-transparent glass surfaces.',
            raw_manifesto: `# Design Manifesto: ${task}\n\n## Vision\nCreate a premium, state-of-the-art interface that WOWs the user.\n\n## Tokens\n- **Primary**: #0055FF\n- **Surface**: Glassmorphic dark blur (ref: hsl(240, 10%, 10%, 0.8))\n- **Typography**: Inter (Modern/Clean)\n\n## Guidelines\n1. Use Backdrop Filter blur(16px) for all overlays.\n2. Apply subtle linear gradients to primary buttons (primary -> accent).`
        };

        await globalArtifactStore.write(
            createArtifactWriteInput({
                artifact_id: `design-manifesto-${Date.now()}`,
                artifact_type: 'DESIGN_MANIFESTO',
                session_id: (sessionContext['session_id'] as string) || 'unknown',
                turn_id: (sessionContext['turn_id'] as string) || 'unknown',
                schema_version: '1.0',
                data: manifesto as unknown as Record<string, unknown>,
                summary: manifesto.summary,
                severity: 'info',
            }),
            this.COMPONENT_ID,
        );

        return manifesto;
    }
}

export const globalDesignReasoner = new HierarchicalDesignReasoner();
