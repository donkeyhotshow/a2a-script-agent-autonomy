import { describe, it, expect } from 'vitest';
import { updateSessionWithServerResponse } from './session-transform.js';
import type { Project, Session } from '../../models/session.model.js';

const project = { id: 'p1', name: 'p' } as Project;

function baseSession(): Session {
    return {
        id: 's1',
        projectId: 'p1',
        title: 't',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        context: {
            workbench: {
                sections: { a: 'keep', shared: 'old' },
            },
        },
    };
}

describe('updateSessionWithServerResponse workbench (T009)', () => {
    it('merges workbench.sections instead of replacing', async () => {
        const out = await updateSessionWithServerResponse(project, baseSession(), {
            context: {
                workbench: {
                    sections: { b: 'new', shared: 'updated' },
                },
            },
        });
        const sections = (out.context?.workbench as { sections?: Record<string, string> })?.sections;
        expect(sections).toEqual({
            a: 'keep',
            b: 'new',
            shared: 'updated',
        });
    });
});
