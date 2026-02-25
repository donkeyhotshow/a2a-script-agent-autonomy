import { describe, it, expect } from 'vitest';
import {
  normalizeState,
  sortRanges,
  dedupeRanges,
  compactRanges,
  mapToPairs,
  pairsToMap,
  getAllPortsSet,
  getTakenPortsSet,
  getFirstAvailablePort,
  getAvailablePortsForService,
  configToUiState,
  uiStateToConfig
} from '../helpers.browser.js';

describe('helpers.browser - selection and transformations', () => {
  it('normalizeState ensures shape', () => {
    expect(normalizeState(null)).toEqual({ reserved: [], ranges: [], map: {} });
    expect(normalizeState({ reserved: [1], ranges: [{ from: 1, to: 2 }], map: { a: 1 } })).toEqual({ reserved: [1], ranges: [{ from: 1, to: 2 }], map: { a: 1 } });
  });

  it('sortRanges / dedupeRanges / compactRanges', () => {
    const src = [ { from: 5, to: 6 }, { from: 1, to: 2 }, { from: 5, to: 6 }, { from: 3, to: 4 }, { from: 7, to: 7 } ];
    const sorted = sortRanges(src);
    expect(sorted[0]).toEqual({ from: 1, to: 2 });
    const deduped = dedupeRanges(sorted);
    expect(deduped.filter(r => r.from === 5 && r.to === 6).length).toBe(1);
    const compacted = compactRanges([ { from: 1, to: 2 }, { from: 3, to: 4 }, { from: 6, to: 6 }, { from: 5, to: 5 } ]);
    expect(compacted).toEqual([ { from: 1, to: 6 } ]);
  });

  it('mapToPairs / pairsToMap', () => {
    const map = { a: 1, b: 2 };
    const pairs = mapToPairs(map);
    expect(pairs).toEqual([ { serviceId: 'a', port: 1 }, { serviceId: 'b', port: 2 } ]);
    expect(pairsToMap(pairs)).toEqual(map);
  });

  it('getAllPortsSet / getTakenPortsSet', () => {
    const state = { reserved: [2], ranges: [{ from: 1, to: 3 }], map: { a: 3 } };
    expect(Array.from(getAllPortsSet(state))).toEqual([1,2,3]);
    expect(Array.from(getTakenPortsSet(state)).sort((a,b)=>a-b)).toEqual([2,3]);
  });

  it('getFirstAvailablePort / getAvailablePortsForService', () => {
    const state = { reserved: [2], ranges: [{ from: 1, to: 4 }], map: { a: 3 } };
    expect(getFirstAvailablePort(state)).toBe(1);
    // includes current mapping (3) to allow re-selection in UI
    expect(getAvailablePortsForService(state, 'a')).toEqual([1,3,4]);
  });

  it('configToUiState / uiStateToConfig round-trip', () => {
    const config = {
      ports: [ { name: 'svc1', port: 3000 }, { name: 'svc2', port: 3001 } ],
      reserved: [1024],
      ranges: [ { from: 3000, to: 3005 } ]
    };
    const ui = configToUiState(config);
    expect(ui.map).toEqual({ svc1: 3000, svc2: 3001 });
    const cfg2 = uiStateToConfig(ui);
    // Order of ports array may differ; compare as maps
    expect(cfg2.reserved).toEqual(config.reserved);
    expect(cfg2.ranges).toEqual(config.ranges);
    expect(pairsToMap(cfg2.ports.map(p => ({ serviceId: p.name, port: p.port })))).toEqual(ui.map);
  });
});


