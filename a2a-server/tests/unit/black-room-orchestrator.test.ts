import {describe, expect, it} from 'vitest';
import {BlackRoomOrchestrator} from '../../src/services/core/black-room/black-room-orchestrator.js';

describe('BlackRoomOrchestrator', () => {

    it('returns failed when algorithm id is not in registry', async () => {
        const orch = new BlackRoomOrchestrator({});
        const res = await orch.executeAlgorithm('definitely-missing-algorithm-id-xyz', {sessionId: 's1'} as any, {});
        expect(res.status).toBe('failed');
        expect(res.error).toMatch(/not found/i);
    });
});
