import { describe, it, expect } from 'vitest';
import {
  prepareInvokePayloadForLlmPrompt,
  formatToolResultForHistory
} from '../../src/transform/materialize-result-for-llm.js';

describe('materialize-result-for-llm', () => {
  it('folds result.message as user and clears result', () => {
    const input = {
      context: { history: [], task: 't' },
      result: { message: 'hello' }
    };
    const out = prepareInvokePayloadForLlmPrompt(input as Record<string, unknown>);
    expect(out.result).toEqual({});
    expect((out.context as Record<string, unknown>).history).toEqual([{ role: 'user', message: 'hello' }]);
    expect((input as Record<string, unknown>).result).toEqual({ message: 'hello' });
  });

  it('does not duplicate user line already in history', () => {
    const input = {
      context: { history: [{ role: 'user', message: 'same' }] },
      result: { message: 'same' }
    };
    const out = prepareInvokePayloadForLlmPrompt(input as Record<string, unknown>);
    expect((out.context as Record<string, unknown>).history).toEqual([{ role: 'user', message: 'same' }]);
  });

  it('adds rag-search as system and skips duplicate system line', () => {
    const rag = {
      query: 'q',
      files: ['src/a.js'],
      page: 1,
      pageSize: 20,
      total: 1,
      hasMore: false
    };
    const line = formatToolResultForHistory('rag-search', rag);
    const input = {
      context: {
        history: [{ role: 'user', message: 'x' }, { role: 'system', message: line }]
      },
      result: { 'rag-search': rag }
    };
    const out = prepareInvokePayloadForLlmPrompt(input as Record<string, unknown>);
    const h = (out.context as Record<string, unknown>).history as unknown[];
    expect(h.filter((e) => (e as { role: string }).role === 'system').length).toBe(1);
  });

  it('formats grep-search like simulations when path/glob omitted', () => {
    const s = formatToolResultForHistory('grep-search', {
      matches: [
        { file: 'tests/api.test.js', line: 1, text: 'x' },
        { file: 'tests/api.test.js', line: 2, text: 'y' }
      ]
    });
    expect(s).toBe('Grep tests/*.test.js: tests/api.test.js (2 matches)');
  });
});
