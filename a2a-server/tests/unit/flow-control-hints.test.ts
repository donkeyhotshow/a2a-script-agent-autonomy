import { describe, it, expect } from 'vitest';
import {
  readExecutionRef,
  resolveFlowControlHintMarkdown,
  attachFlowControlHintToInvokePayload
} from '../../src/prompts/flow-control-hints.js';

describe('flow-control-hints', () => {
  it('reads action and step from context.execution', () => {
    expect(
      readExecutionRef({
        context: { execution: { action: 'auto-ai', step: 'locate_code' } }
      } as Record<string, unknown>)
    ).toEqual({ action: 'auto-ai', step: 'locate_code' });
  });

  it('falls back to top-level action when execution.action missing', () => {
    expect(readExecutionRef({ action: 'dialog', context: {} } as Record<string, unknown>)).toEqual({
      action: 'dialog',
      step: '*'
    });
  });

  it('resolves auto-ai locate_code', () => {
    const h = resolveFlowControlHintMarkdown({ action: 'auto-ai', step: 'locate_code' });
    expect(h).toContain('locate_code');
    expect(h).toContain('rag-search');
  });

  it('resolves task:router', () => {
    const h = resolveFlowControlHintMarkdown({ action: 'task', step: 'router' });
    expect(h).toContain('Router');
  });

  it('attach sets flowControlHint on root', () => {
    const root = {
      context: { execution: { action: 'analyze', step: 'search' } }
    } as Record<string, unknown>;
    attachFlowControlHintToInvokePayload(root);
    expect(typeof root['flowControlHint']).toBe('string');
    expect(root['flowControlHint'] as string).toContain('search');
  });
});
