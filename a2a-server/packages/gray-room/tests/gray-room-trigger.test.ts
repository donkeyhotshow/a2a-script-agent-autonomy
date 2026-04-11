import {afterEach, describe, expect, it} from 'vitest';
import {detectGrayRoomTrigger, shouldUseGrayRoom} from '../src/services/core/request-processor/gray-room-trigger';

describe('gray room trigger policy', () => {
    const prev = process.env.A2A_GRAY_ROOM_ENABLED;

    afterEach(() => {
        if (prev === undefined) {
            delete process.env.A2A_GRAY_ROOM_ENABLED;
        } else {
            process.env.A2A_GRAY_ROOM_ENABLED = prev;
        }
    });

    it('defaults to on when env unset (agent action)', () => {
        delete process.env.A2A_GRAY_ROOM_ENABLED;
        const ctx = {context: {execution: {action: 'agent'}}};
        expect(shouldUseGrayRoom(ctx).shouldTrigger).toBe(true);
        expect(detectGrayRoomTrigger(ctx).shouldTrigger).toBe(true);
    });

    it('explicit A2A_GRAY_ROOM_ENABLED=0 disables interrupt chain for agent', () => {
        process.env.A2A_GRAY_ROOM_ENABLED = '0';
        const ctx = {context: {execution: {action: 'agent'}}};
        expect(shouldUseGrayRoom(ctx).shouldTrigger).toBe(false);
        expect(detectGrayRoomTrigger(ctx).shouldTrigger).toBe(false);
    });

    it('grayRoomRequested true overrides env off', () => {
        process.env.A2A_GRAY_ROOM_ENABLED = '0';
        const ctx = {context: {execution: {action: 'agent', grayRoomRequested: true}}};
        expect(shouldUseGrayRoom(ctx).shouldTrigger).toBe(true);
    });

    it('reads flowControlHint from ctx when arg omitted', () => {
        process.env.A2A_GRAY_ROOM_ENABLED = '0';
        const ctx = {context: {execution: {action: 'agent'}}, flowControlHint: 'gray-room'};
        expect(shouldUseGrayRoom(ctx).shouldTrigger).toBe(true);
    });

    it('uses flat context.execution when env is not a strict enable token (policy path)', () => {
        process.env.A2A_GRAY_ROOM_ENABLED = 'maybe';
        const ctx = {execution: {action: 'dialog'}};
        expect(shouldUseGrayRoom(ctx).shouldTrigger).toBe(true);
        expect(shouldUseGrayRoom(ctx).source).toBe('policy_dialog');
    });
});
