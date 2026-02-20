import {
  registerContextBlock,
  getContextBlock,
  hasContextBlock,
  clearContextBlocks,
  listRegisteredIds,
} from '../../../src/knowledge/context-store.js';

describe('context-store', () => {
  beforeEach(() => clearContextBlocks());

  it('returns undefined for unknown id', () => {
    expect(getContextBlock('unknown')).toBeUndefined();
    expect(hasContextBlock('unknown')).toBe(false);
  });

  it('registers and retrieves context block', () => {
    registerContextBlock('test-id', '## Test content');
    expect(getContextBlock('test-id')).toBe('## Test content');
    expect(hasContextBlock('test-id')).toBe(true);
  });

  it('overwrites on re-register', () => {
    registerContextBlock('id', 'v1');
    registerContextBlock('id', 'v2');
    expect(getContextBlock('id')).toBe('v2');
  });

  it('clears only user blocks, builtin remains', () => {
    registerContextBlock('user-block', 'x');
    clearContextBlocks();
    expect(getContextBlock('user-block')).toBeUndefined();
    expect(getContextBlock('neuron-context-laravel-11')).toBeDefined();
  });

  it('has pre-registered neuron-context-laravel-11', () => {
    const content = getContextBlock('neuron-context-laravel-11');
    expect(content).toBeDefined();
    expect(content).toContain('app/Models/');
    expect(content).toContain('laravel');
  });

  it('throws on empty id', () => {
    expect(() => registerContextBlock('', 'x')).toThrow(/invalid/);
  });

  it('throws on invalid id chars', () => {
    expect(() => registerContextBlock('bad id', 'x')).toThrow(/invalid/);
    expect(() => registerContextBlock('bad.id', 'x')).toThrow(/invalid/);
  });

  it('throws when overwriting builtin without flag', () => {
    expect(() =>
      registerContextBlock('neuron-context-laravel-11', 'override')
    ).toThrow(/Cannot override builtin/);
  });

  it('allows overwriting builtin with allowOverwriteBuiltin', () => {
    registerContextBlock('neuron-context-laravel-11', 'custom', {
      allowOverwriteBuiltin: true,
    });
    expect(getContextBlock('neuron-context-laravel-11')).toBe('custom');
  });

  it('returns undefined for invalid id in getContextBlock', () => {
    expect(getContextBlock('')).toBeUndefined();
    expect(getContextBlock('a'.repeat(300))).toBeUndefined();
  });

  it('listRegisteredIds returns user and builtin ids', () => {
    registerContextBlock('my-block', 'x');
    const ids = listRegisteredIds();
    expect(ids).toContain('my-block');
    expect(ids).toContain('neuron-context-laravel-11');
  });

  it('throws when content exceeds 512KB', () => {
    const big = 'x'.repeat(512 * 1024 + 1);
    expect(() => registerContextBlock('big', big)).toThrow(/invalid/);
  });
});
