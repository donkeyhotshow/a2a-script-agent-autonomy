import {describe, expect, it} from 'vitest';
import {mergeGrayRoomSlotIntoContext} from '@a2a/server-ai';
import type {GrayRoomControlEnvelope} from '@a2a/server-ai';

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

    it('adds empty workbench.sections when workbench had no sections (proba / UI contract)', () => {
        const env: GrayRoomControlEnvelope = {
            enabled: true,
            planId: 'prom_1',
            phase: 'completed',
            maxTurns: 10,
            turn: 0,
            status: 'completed',
            timestamps: {startedAt: 't0', lastUpdateAt: 't1'},
            traceRef: {length: 0},
        };
        const ctx = mergeGrayRoomSlotIntoContext({}, env);
        const wb = ctx['workbench'] as Record<string, unknown>;
        expect(wb['sections']).toEqual({});
        expect((wb['slots'] as Record<string, unknown>)['grayRoom']).toEqual(env);
    });
});
