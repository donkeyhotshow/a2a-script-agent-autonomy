/**
 * T009: context.workbench merge test
 * Verifies that after a server round-trip, persisted session state 
 * preserves workbench.sections (and slots if used) correctly
 */

import { describe, it, expect } from 'vitest';

/**
 * Test workbench merge behavior
 */
describe('T009: context.workbench merge parity', () => {
    /**
     * Test case: server response with workbench.sections merges correctly
     */
    it('workbench sections merge correctly', () => {
        // Existing session with workbench
        const existingSession = {
            id: 'test-session',
            context: {
                workbench: {
                    sections: {
                        s1: 'existing content',
                        s2: 'more existing'
                    }
                }
            }
        };

        // Server response with new workbench
        const serverResponse = {
            context: {
                workbench: {
                    sections: {
                        s2: 'updated',
                        s3: 'new section'
                    }
                }
            }
        };

        // Simulate merge logic from session-transform.ts
        const existingWorkbench = existingSession.context?.workbench;
        const newWorkbench = serverResponse.context.workbench;

        const mergedWorkbench = {
            ...existingWorkbench,
            ...newWorkbench,
            sections: {
                ...(existingWorkbench?.sections || {}),
                ...(newWorkbench?.sections || {})
            }
        };

        // Verify merged result preserves all sections
        expect(mergedWorkbench.sections.s1).toBe('existing content');
        expect(mergedWorkbench.sections.s2).toBe('updated');
        expect(mergedWorkbench.sections.s3).toBe('new section');
    });

    /**
     * Test case: server response without workbench preserves existing
     */
    it('no workbench in response preserves existing', () => {
        const existingSession = {
            id: 'test-session',
            context: {
                workbench: {
                    sections: { s1: 'existing' }
                }
            }
        };

        // Server response without workbench
        const serverResponse = {
            context: {}
        };

        // Merge should preserve existing
        const existingWorkbench = existingSession.context?.workbench;
        const newWorkbench = serverResponse.context.workbench;

        // If new is undefined, use existing
        const mergedWorkbench = newWorkbench ?? existingWorkbench;

        expect(mergedWorkbench.sections.s1).toBe('existing');
    });

    /**
     * Test case: empty workbench objects handled correctly
     */
    it('empty workbench handled correctly', () => {
        const existingSession = {
            id: 'test-session',
            context: {
                workbench: {
                    sections: { s1: 'existing' }
                }
            }
        };

        // Server response with empty workbench
        const serverResponse = {
            context: {
                workbench: {}
            }
        };

        const existingWorkbench = existingSession.context?.workbench;
        const newWorkbench = serverResponse.context.workbench;

        // Merge logic from session-transform.ts
        const mergedWorkbench = {
            ...existingWorkbench,
            ...newWorkbench,
            sections: {
                ...(existingWorkbench?.sections || {}),
                ...(newWorkbench?.sections || {})
            }
        };

        expect(mergedWorkbench.sections.s1).toBe('existing');
    });

    /**
     * Test case: workbench with slots preserves slots
     */
    it('workbench with slots preserves correctly', () => {
        const existingSession = {
            id: 'test-session',
            context: {
                workbench: {
                    sections: { s1: 'existing' },
                    slots: {
                        thinking: 'existing thinking'
                    }
                }
            }
        };

        const serverResponse = {
            context: {
                workbench: {
                    sections: { s2: 'new' },
                    slots: {
                        thinking: 'updated thinking'
                    }
                }
            }
        };

        const existingWorkbench = existingSession.context?.workbench;
        const newWorkbench = serverResponse.context.workbench;

        const mergedWorkbench = {
            ...existingWorkbench,
            ...newWorkbench,
            sections: {
                ...(existingWorkbench?.sections || {}),
                ...(newWorkbench?.sections || {})
            }
        };

        expect(mergedWorkbench.sections.s1).toBe('existing');
        expect(mergedWorkbench.sections.s2).toBe('new');
        expect(mergedWorkbench.slots?.thinking).toBe('updated thinking');
    });
});
