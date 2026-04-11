import {describe, expect, it} from 'vitest';
import {isDialogToolExecutePayload} from '../../src/services/core/request-processor/dialog-request-processor';

describe('isDialogToolExecutePayload', () => {
  it('is true for a single allowed tool key', () => {
    expect(isDialogToolExecutePayload({'rag-search': {query: 'x'}})).toBe(true);
    expect(isDialogToolExecutePayload({'read-file': {path: 'a.ts'}})).toBe(true);
  });

  it('is false for form/message chat shape', () => {
    expect(isDialogToolExecutePayload({message: 'hi', form: {input: []}})).toBe(false);
    expect(isDialogToolExecutePayload({form: {input: []}})).toBe(false);
  });

  it('is false for multiple keys', () => {
    expect(isDialogToolExecutePayload({'read-file': {path: 'a'}, extra: 1} as Record<string, unknown>)).toBe(false);
  });
});
