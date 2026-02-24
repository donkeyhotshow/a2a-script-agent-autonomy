import { describe, it, expect } from 'vitest';
import {
  hasId,
  isSessionLike,
  isTaskLike,
  isMessageLike,
  isRequestLike,
} from '../../src/types/entity.guards.js';

describe('entity.guards', () => {
  it('hasId', () => {
    expect(hasId({ id: 'x' })).toBe(true);
    expect(hasId({})).toBe(false);
    expect(hasId(null)).toBe(false);
    expect(hasId({ id: 1 })).toBe(false);
  });
  it('isSessionLike', () => {
    expect(isSessionLike({ id: '1', projectId: 'p1' })).toBe(true);
    expect(isSessionLike({ id: '1' })).toBe(false);
  });
  it('isTaskLike', () => {
    expect(isTaskLike({ id: '1', sessionId: 's1' })).toBe(true);
    expect(isTaskLike({ id: '1' })).toBe(false);
  });
  it('isMessageLike', () => {
    expect(isMessageLike({ id: '1', sessionId: 's1', direction: 'in' })).toBe(true);
    expect(isMessageLike({ id: '1', sessionId: 's1' })).toBe(false);
  });
  it('isRequestLike', () => {
    expect(isRequestLike({ id: '1', promiseId: 'p1', status: 'pending' })).toBe(true);
    expect(isRequestLike({ id: '1' })).toBe(false);
  });
});
