import {describe, expect, it} from 'vitest';
import {mergeGrayRoomSlotIntoContext} from '../src/transform/interrupt-trace-contract.js';
import type {GrayRoomControlEnvelope} from '../src/transform/types.js';

describe('mergeGrayRoomSlotIntoContext', () => {
    it('merges grayRoom under workbench.slots and preserves interruptTrace', () => {
        const env: GrayRoomControlEnvelope = {
            enabled: true,
            planId: 'prom_1',
            phase: 'completed',
            maxTurns: 10,
            turn: 0,
            status: 'completed',
            timestamps: {startedAt: 't0', lastUpdateAt: 't1'},
            traceRef: {length: 3},
        };
        const ctx = mergeGrayRoomSlotIntoContext(
            {
                workbench: {
                    slots: {
                        interruptTrace: [{kind: 'llm_output', phase: 'primary', chars: 1}],
                    },
                },
            },
            env
        );
        const slots = (ctx['workbench'] as Record<string, unknown>)['slots'] as Record<string, unknown>;
        expect(slots['interruptTrace']).toHaveLength(1);
        expect(slots['grayRoom']).toEqual(env);
    });
});
