import { describe, it, expect } from 'vitest';
import {
  validatePortNumber,
  validateRange,
  hasRangeOverlap,
  hasAnyOverlaps,
  isPortTakenInState,
  getConflicts
} from '../helpers.browser.js';

describe('helpers.browser - validation and conflicts', () => {
  it('validatePortNumber', () => {
    expect(validatePortNumber(1)).toBe(true);
    expect(validatePortNumber(65535)).toBe(true);
    expect(validatePortNumber(0)).toBe(false);
    expect(validatePortNumber(70000)).toBe(false);
    expect(validatePortNumber(3000.5)).toBe(false);
    expect(validatePortNumber('3000')).toBe(false);
  });

  it('validateRange', () => {
    expect(validateRange({ from: 1000, to: 1000 })).toBe(true);
    expect(validateRange({ from: 1000, to: 1001 })).toBe(true);
    expect(validateRange({ from: 1001, to: 1000 })).toBe(false);
    expect(validateRange({ from: 0, to: 1000 })).toBe(false);
    expect(validateRange({ from: 1000, to: 70000 })).toBe(false);
    expect(validateRange({ from: 'a', to: 1000 })).toBe(false);
  });

  it('hasRangeOverlap / hasAnyOverlaps', () => {
    const a = { from: 1000, to: 2000 };
    const b = { from: 1500, to: 2500 };
    const c = { from: 3000, to: 4000 };
    expect(hasRangeOverlap(a, b)).toBe(true);
    expect(hasRangeOverlap(a, c)).toBe(false);
    expect(hasAnyOverlaps([a, b, c])).toBe(true);
    expect(hasAnyOverlaps([a, c])).toBe(false);
  });

  it('isPortTakenInState', () => {
    const state = { reserved: [3001], map: { svc: 3000 } };
    expect(isPortTakenInState(state, 3001)).toBe(true);
    expect(isPortTakenInState(state, 3000)).toBe(true);
    expect(isPortTakenInState(state, 3002)).toBe(false);
  });

  it('getConflicts detects overlaps, duplicates and out-of-range', () => {
    const state = {
      reserved: [],
      ranges: [ { from: 3000, to: 3002 }, { from: 3002, to: 3004 } ], // touching/overlap at 3002
      map: { a: 2999, b: 3001, c: 3001 }
    };
    const conflicts = getConflicts(state);
    expect(conflicts.overlappingRanges.length).toBeGreaterThan(0);
    expect(conflicts.duplicatedMappings).toEqual([{ port: 3001, services: ['b', 'c'] }]);
    expect(conflicts.outOfRanges).toContain(2999);
  });
});


