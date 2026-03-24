import { describe, it, expect } from 'vitest';
import { attachWorkbenchForLlmPrompt } from '../src/transform/workbench-normalize.js';

describe('attachWorkbenchForLlmPrompt', () => {
  it('moves legacy docVirtual object into workbench.sections and removes docVirtual', () => {
    const root: Record<string, unknown> = {
      context: {
        task: 't',
        docVirtual: { section1: 'a', section2: 'b' },
      },
    };
    attachWorkbenchForLlmPrompt(root);
    const ctx = root.context as Record<string, unknown>;
    expect(ctx.docVirtual).toBeUndefined();
    expect(ctx.workbench).toEqual({ sections: { section1: 'a', section2: 'b' } });
    expect(root.workbench).toEqual({ sections: { section1: 'a', section2: 'b' } });
  });

  it('moves legacy docVirtual string into workbench.sections.body', () => {
    const root: Record<string, unknown> = {
      context: { docVirtual: 'hello' },
    };
    attachWorkbenchForLlmPrompt(root);
    const ctx = root.context as Record<string, unknown>;
    expect(ctx.docVirtual).toBeUndefined();
    expect(ctx.workbench).toEqual({ sections: { body: 'hello' } });
  });

  it('merges legacy docVirtual into existing workbench when sections missing', () => {
    const root: Record<string, unknown> = {
      context: {
        workbench: { batch: { cursor: 0, items: [1] } },
        docVirtual: { section1: 'x' },
      },
    };
    attachWorkbenchForLlmPrompt(root);
    const ctx = root.context as Record<string, unknown>;
    expect(ctx.docVirtual).toBeUndefined();
    expect(ctx.workbench).toEqual({
      batch: { cursor: 0, items: [1] },
      sections: { section1: 'x' },
    });
  });
});
