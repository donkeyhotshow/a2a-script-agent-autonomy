import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toPublicSession } from '../../packages/vite-plugin/routes/utils/session-projection-dto.js';

describe('sessionRoutes - debug context guard', () => {
    // Тесты для debug-only логики includeContext проверяются косвенно
    // через session-projection-dto тесты
    
    it('verifies includeContext=true keeps context (debug mode)', () => {
        const session = {
            id: 'sess_test',
            title: 'Test',
            context: { 
                execution: { action: 'task' },
                workbench: { sections: [{ id: 'test', data: {} }] }
            },
            execute: { form: { title: 'Test' } }
        };
        
        // When includeContext=true, context is kept (debug mode simulation)
        const projected = toPublicSession(session, true);
        
        expect(projected.context).toBeDefined();
        expect(projected.context.workbench).toEqual({ sections: [{ id: 'test', data: {} }] });
    });
});

describe('sessionRoutes - UI does not depend on raw context.workbench', () => {
    it('strips context from public session by default (includeContext=false)', () => {
        const session = {
            id: 'sess_test',
            title: 'Test',
            context: { 
                execution: { action: 'task' },
                workbench: { sections: [{ id: 'test', data: {} }] } // Raw workbench
            },
            execute: { form: { title: 'Test' } }
        };
        
        // When projected with includeContext=false, workbench should be hidden
        const projected = toPublicSession(session, false);
        
        // Context should be completely removed - UI doesn't depend on raw workbench
        expect(projected.context).toBeUndefined();
    });

    it('keeps context only when explicitly requesting debug mode', () => {
        const session = {
            id: 'sess_test',
            title: 'Test',
            context: { 
                execution: { action: 'task' },
                workbench: { sections: [{ id: 'test', data: {} }] }
            },
            execute: { form: { title: 'Test' } }
        };
        
        // Default behavior (includeContext=false) strips context
        const projectedDefault = toPublicSession(session, false);
        expect(projectedDefault.context).toBeUndefined();
        
        // Explicit includeContext=true keeps context for debugging
        const projectedDebug = toPublicSession(session, true);
        expect(projectedDebug.context).toBeDefined();
        expect(projectedDebug.context.workbench).toEqual({ sections: [{ id: 'test', data: {} }] });
    });

    it('ensures workbench sections are never exposed to production UI', () => {
        // Verify that the projection function properly removes workbench
        const sessionWithDeepWorkbench = {
            id: 'sess_deep',
            title: 'Deep Workbench Test',
            context: {
                execution: { action: 'agent', step: 'execute' },
                workbench: {
                    sections: [
                        { id: 'files', data: { files: ['/secret/path'] } },
                        { id: 'slots', data: { slots: [{ key: 'api_key', value: 'secret' }] } }
                    ],
                    batch: { steps: [] },
                    slots: {}
                }
            },
            execute: { form: { title: 'Test' } }
        };
        
        const projected = toPublicSession(sessionWithDeepWorkbench, false);
        
        // Context is completely removed - no workbench leakage to UI
        expect(projected.context).toBeUndefined();
        expect(projected.workbench).toBeUndefined();
    });
});
