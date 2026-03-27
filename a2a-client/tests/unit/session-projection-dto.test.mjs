import { describe, it, expect } from 'vitest';
import {
    toMinimalNextAck,
    toPublicNextResponse,
    toPublicSession,
} from '../../vite-plugin-a2a/routes/utils/session-projection-dto.js';

describe('session-projection-dto', () => {
    it('builds minimal ack for async next calls', () => {
        const ack = toMinimalNextAck({ success: true, step: 3, promiseId: 'prom_1' });
        expect(ack).toEqual({
            success: true,
            accepted: true,
            step: 3,
            asyncPending: true,
        });
    });

    it('projects public session and strips context + transport promiseId', () => {
        const projected = toPublicSession({
            id: 'sess_1',
            title: 'Test',
            status: 'active',
            promiseId: 'prom_hidden',
            execute: { 'read-file': { path: 'src/app.js' } },
            context: {
                execution: { action: 'agent', step: 'read_code' },
            },
        });

        expect(projected.context).toBeUndefined();
        expect(projected.promiseId).toBeUndefined();
        expect(projected.asyncPending).toBe(false);
        expect(projected.promiseStatus).toBe(null);
        expect(projected.execute).toMatchObject({
            message: 'Reading files…',
            attachments: { readFiles: [{ path: 'src/app.js' }] },
        });
        expect(typeof projected.stage).toBe('string');
    });

    it('keeps context when includeContext=true', () => {
        const session = {
            id: 'sess_2',
            context: { execution: { action: 'dialog', step: 'input' } },
            execute: { form: { title: 'Input', input: [] } },
        };
        const projected = toPublicSession(session, true);
        expect(projected.context).toEqual(session.context);
    });

    it('normalizes next response execute from projected session when top execute missing', () => {
        const out = toPublicNextResponse({
            success: true,
            context: { hidden: true },
            session: {
                id: 'sess_3',
                execute: { 'rag-search': { query: 'health route' } },
                context: { execution: { action: 'agent', step: 'inspect_structure' } },
            },
        });

        expect(out.context).toBeUndefined();
        expect(out.execute).toMatchObject({
            message: 'Searching the codebase…',
            attachments: { ragQuery: 'health route' },
        });
        expect(out.session.execute).toEqual(out.execute);
    });
});
