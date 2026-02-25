import { describe, it, expect } from 'vitest';
import {
  getPortForServiceFromMap,
  getServiceByPortFromMap,
  isPortReservedInState,
  isPortInRangeInState,
  getAvailablePortsInRangeFromState,
  getAvailablePortsFromState,
  findFreePortInState,
  getPortsStatsFromState,
  addReservedPortToState,
  removeReservedPortFromState,
  addPortRangeToState,
  removePortRangeFromState,
  addPortMappingToState,
  removePortMappingFromState
} from '../helpers.browser.js';

const makeState = () => ({
  reserved: [3001],
  ranges: [
    { from: 3000, to: 3003 },
    { from: 4000, to: 4001 }
  ],
  map: { svcA: 3000, svcB: 4001 }
});

describe('helpers.browser (pure domain utilities)', () => {
  it('getPortForServiceFromMap / getServiceByPortFromMap', () => {
    const state = makeState();
    expect(getPortForServiceFromMap(state, 'svcA')).toBe(3000);
    expect(getPortForServiceFromMap(state, 'missing')).toBeNull();
    expect(getServiceByPortFromMap(state, 3000)).toBe('svcA');
    expect(getServiceByPortFromMap(state, 3999)).toBeNull();
  });

  it('isPortReservedInState', () => {
    const state = makeState();
    expect(isPortReservedInState(state, 3001)).toBe(true);
    expect(isPortReservedInState(state, 3002)).toBe(false);
  });

  it('isPortInRangeInState', () => {
    const state = makeState();
    expect(isPortInRangeInState(state, 3002)).toBe(true);
    expect(isPortInRangeInState(state, 4001)).toBe(true);
    expect(isPortInRangeInState(state, 5000)).toBe(false);
  });

  it('getAvailablePortsInRangeFromState filters out reserved and mapped', () => {
    const state = makeState();
    // range[0] = 3000..3003, with reserved 3001 and mapped 3000
    expect(getAvailablePortsInRangeFromState(state, 0)).toEqual([3002, 3003]);
    // range[1] = 4000..4001, with mapped 4001
    expect(getAvailablePortsInRangeFromState(state, 1)).toEqual([4000]);
  });

  it('getAvailablePortsFromState returns sorted available ports', () => {
    const state = makeState();
    // All ranges combined minus reserved[3001] and mapped[3000,4001]
    expect(getAvailablePortsFromState(state)).toEqual([3002, 3003, 4000]);
  });

  it('findFreePortInState respects preferred port and availability', () => {
    const state = makeState();
    // Preferred available
    expect(findFreePortInState(state, 3002)).toBe(3002);
    // Preferred taken (reserved), falls back to first available
    expect(findFreePortInState(state, 3001)).toBe(3002);
    // No preferred provided
    expect(findFreePortInState(state, null)).toBe(3002);
  });

  it('addReservedPortToState adds port if not already reserved', () => {
    const state = makeState();
    addReservedPortToState(state, 3004);
    expect(state.reserved).toEqual([3001, 3004]); // Ensure 3004 is added
    addReservedPortToState(state, 3001); // Attempt to add duplicate
    expect(state.reserved).toEqual([3001, 3004]); // Should not change if duplicate
  });

  it('removeReservedPortFromState removes a reserved port', () => {
    const state = makeState();
    removeReservedPortFromState(state, 3001);
    expect(state.reserved).not.toContain(3001);
    removeReservedPortFromState(state, 9999); // Not reserved
    expect(state.reserved).toEqual([]); // Should not change if not found
  });

  it('addPortRangeToState adds a new port range', () => {
    const state = makeState();
    addPortRangeToState(state, 5000, 5010);
    expect(state.ranges).toContainEqual({ from: 5000, to: 5010 });
  });

  it('removePortRangeFromState removes a port range by index', () => {
    const state = makeState();
    removePortRangeFromState(state, 0);
    expect(state.ranges).not.toContainEqual({ from: 3000, to: 3003 });
    expect(state.ranges).toContainEqual({ from: 4000, to: 4001 });
    removePortRangeFromState(state, 999); // Invalid index
    expect(state.ranges).toEqual([ { from: 4000, to: 4001 } ]); // Should not change
  });

  it('addPortMappingToState adds or updates a port mapping', () => {
    const state = makeState();
    addPortMappingToState(state, 'svcC', 5000);
    expect(state.map.svcC).toBe(5000);
    addPortMappingToState(state, 'svcA', 3005); // Update existing
    expect(state.map.svcA).toBe(3005);
  });

  it('removePortMappingFromState removes a port mapping', () => {
    const state = makeState();
    removePortMappingFromState(state, 'svcA');
    expect(state.map.svcA).toBeUndefined();
    removePortMappingFromState(state, 'missing'); // Not found
    expect(state.map.svcB).toBe(4001); // Other mappings should remain
  });

  it('getPortsStatsFromState computes correct stats', () => {
    const state = makeState();
    expect(getPortsStatsFromState(state)).toEqual({
      reserved: 1,
      ranges: 2,
      mapped: 2,
      available: 3
    });
  });
});


