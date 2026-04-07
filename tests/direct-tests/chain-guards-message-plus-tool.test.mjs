import { describe, it, expect } from 'vitest';
import { getValidatedToolKey } from '../../a2a-client/packages/vite-plugin/routes/utils/chain-guards.js';

describe('getValidatedToolKey', () => {
  it('accepts message + one chainable tool', () => {
    expect(
      getValidatedToolKey({
        message: 'Listing root.',
        'list-directory': { path: '.' },
      })
    ).toBe('list-directory');
  });

  it('rejects two tool keys with message', () => {
    expect(
      getValidatedToolKey({
        message: 'x',
        'list-directory': { path: '.' },
        'read-file': { path: 'a' },
      })
    ).toBeNull();
  });

  it('still requires exactly one tool key without message', () => {
    expect(getValidatedToolKey({ 'grep-search': { pattern: 'x', path: '.' } })).toBe('grep-search');
  });
});
