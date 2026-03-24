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
        context: { execution: { action: 'agent', step: 'plan' } }
      } as Record<string, unknown>)
    ).toEqual({ action: 'agent', step: 'plan' });
  });

  it('falls back to top-level action when execution.action missing', () => {
    expect(readExecutionRef({ action: 'dialog', context: {} } as Record<string, unknown>)).toEqual({
      action: 'dialog',
      step: '*'
    });
  });

  it('resolves agent:plan', () => {
    const h = resolveFlowControlHintMarkdown({ action: 'agent', step: 'plan' });
    expect(h).toContain('plan');
    expect(h).toContain('rag-search');
  });

  it('resolves agent:analyze', () => {
    const h = resolveFlowControlHintMarkdown({ action: 'agent', step: 'analyze' });
    expect(h).toContain('Gather information');
    expect(h).toContain('ragResults');
  });

  it('resolves task:router', () => {
    const h = resolveFlowControlHintMarkdown({ action: 'task', step: 'router' });
    expect(h).toContain('ranked-choices');
  });

  it('attach sets flowControlHint on root', () => {
    const root = {
      context: { execution: { action: 'agent', step: 'execute' } }
    } as Record<string, unknown>;
    attachFlowControlHintToInvokePayload(root);
    expect(typeof root['flowControlHint']).toBe('string');
    expect(root['flowControlHint'] as string).toContain('execute');
  });

  it('legacy analyze mode redirects to agent', () => {
    // Old 'analyze' mode should now redirect to 'agent'
    const h = resolveFlowControlHintMarkdown({ action: 'analyze', step: 'analyze' });
    // Should resolve via FLOW_HINT_ACTION_ALIASES['analyze'] = 'agent', then find 'agent:analyze'
    expect(h).toContain('Gather information');
    expect(h).toContain('ragResults');
  });
});
