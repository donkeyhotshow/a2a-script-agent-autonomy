import { describe, it, expect } from 'vitest';
import { runTransformPipeline, loadTransformPipeline, runPromptsTransform, getPromptsTransformsPath } from '../src/transform/index.js';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(process.cwd(), '..');
const SIM_DIR = path.join(PROJECT_ROOT, 'simulations', 'sync', 'agent-coder', '3');
const PROMPTS_TRANSFORMS = getPromptsTransformsPath();

describe('Transform Pipeline Runtime', () => {
  describe('loadTransformPipeline', () => {
    it('should load pipeline from file', async () => {
      const pipelinePath = path.join(PROMPTS_TRANSFORMS, 'server-transforms-request.json');
      const pipeline = await loadTransformPipeline(pipelinePath);
      expect(pipeline).toBeDefined();
      expect(pipeline.steps).toBeDefined();
      expect(Array.isArray(pipeline.steps)).toBe(true);
    });

    it('should reject invalid pipeline - no steps', async () => {
      const invalidPath = path.join(process.cwd(), 'tests', 'fixtures', 'invalid-pipeline-no-steps.json');
      await expect(loadTransformPipeline(invalidPath)).rejects.toThrow();
    });
  });

  describe('runTransformPipeline', () => {
    it('should transform basic request', async () => {
      const pipeline = {
        steps: [
          { op: 'set', path: 'output', value: 'test-value' }
        ]
      };
      
      const input = { name: 'test' };
      const result = await runTransformPipeline(pipeline, input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.output).toBe('test-value');
      }
    });

    it('should handle copy operation', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: 'name', to: 'copiedName' }
        ]
      };
      
      const input = { name: 'test-value' };
      const result = await runTransformPipeline(pipeline, input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.copiedName).toBe('test-value');
      }
    });

    it('should handle set operation', async () => {
      const pipeline = {
        steps: [
          { op: 'set', path: 'result.status', value: 'completed' }
        ]
      };
      
      const input = {};
      const result = await runTransformPipeline(pipeline, input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.result.status).toBe('completed');
      }
    });

    it('should handle append-to-array operation', async () => {
      const pipeline = {
        steps: [
          { op: 'append-to-array', to: 'items', value: 'new-item' }
        ]
      };
      
      const input = { items: ['item1', 'item2'] };
      const result = await runTransformPipeline(pipeline, input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.items).toHaveLength(3);
        expect(result.output.items[2]).toBe('new-item');
      }
    });

    it('should handle conditional case matching', async () => {
      const pipeline = {
        steps: [
          {
            op: 'switch',
            discriminator: 'status',
            cases: {
              'active': { op: 'set', path: 'state', value: 'running' },
              'inactive': { op: 'set', path: 'state', value: 'stopped' }
            },
            'default': { op: 'set', path: 'state', value: 'unknown' }
          }
        ]
      };
      
      const input = { status: 'active' };
      const result = await runTransformPipeline(pipeline, input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.state).toBe('running');
      }
    });

    it('should handle default case', async () => {
      const pipeline = {
        steps: [
          {
            op: 'switch',
            discriminator: 'status',
            cases: {
              'active': { op: 'set', path: 'state', value: 'running' }
            },
            'default': { op: 'set', path: 'state', value: 'unknown' }
          }
        ]
      };
      
      const input = { status: 'other' };
      const result = await runTransformPipeline(pipeline, input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.state).toBe('unknown');
      }
    });

    it('should handle multiple steps in sequence', async () => {
      const pipeline = {
        steps: [
          { op: 'set', path: 'step1', value: 'done' },
          { op: 'copy', from: 'step1', to: 'step2' },
          { op: 'append-to-array', to: 'log', value: 'completed' }
        ]
      };
      
      const input = { log: [] };
      const result = await runTransformPipeline(pipeline, input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.step1).toBe('done');
        expect(result.output.step2).toBe('done');
        expect(result.output.log).toContain('completed');
      }
    });

    it('should handle error gracefully', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: 'nonexistent', to: 'result' }
        ]
      };
      
      const input = {};
      const result = await runTransformPipeline(pipeline, input);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.result).toBeUndefined();
      }
    });

    it('should truncate-section on string path', async () => {
      const pipeline = {
        steps: [
          { op: 'set', path: 'context.workbench.sections', value: { note: 'abcdefghij' } },
          {
            op: 'truncate-section',
            path: 'context.workbench.sections',
            maxChars: 8,
            suffix: '…'
          }
        ]
      };

      const result = await runTransformPipeline(pipeline, {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.context.workbench.sections).toEqual({ note: 'abcdefg…' });
      }
    });

    it('should truncate-section on context.workbench.sections', async () => {
      const pipeline = {
        steps: [
          {
            op: 'set',
            path: 'context.workbench.sections',
            value: { a: '12345', b: 2, c: '678901234' },
          },
          {
            op: 'truncate-section',
            path: 'context.workbench.sections',
            maxChars: 5,
            suffix: '',
          },
        ],
      };

      const result = await runTransformPipeline(pipeline, {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.context.workbench.sections).toEqual({
          a: '12345',
          b: 2,
          c: '67890',
        });
      }
    });

    it('should truncate-section shallow object string fields', async () => {
      const pipeline = {
        steps: [
          {
            op: 'set',
            path: 'context.workbench.sections',
            value: { a: '12345', b: 2, c: '678901234' }
          },
          {
            op: 'truncate-section',
            path: 'context.workbench.sections',
            maxChars: 5,
            suffix: ''
          }
        ]
      };

      const result = await runTransformPipeline(pipeline, {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.context.workbench.sections).toEqual({
          a: '12345',
          b: 2,
          c: '67890'
        });
      }
    });

    it('should apply scratchpad ops from input', async () => {
      const pipeline = {
        steps: [
          { op: 'set', path: 'context', value: { scratchpad: { a: true } } },
          {
            op: 'apply-scratchpad-ops',
            from: 'ops',
            scratchpadPath: 'context.scratchpad'
          }
        ]
      };

      const input = {
        ops: [
          { op: 'add', item: 'read_app' },
          { op: 'check', item: 'a' },
          { op: 'remove', item: 'a' }
        ]
      };

      const result = await runTransformPipeline(pipeline, input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.context.scratchpad).toEqual({ read_app: true });
      }
    });

    it('pick-context keeps only listed fields', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          { op: 'pick-context', include: ['execution', 'task'] }
        ]
      };
      const input = {
        context: {
          execution: { action: 'agent' },
          task: 'do it',
          files: { 'src/a.js': 'content' },
          scratchpad: { done: true },
          history: [{ role: 'user', message: 'hi' }]
        }
      };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      const ctx = result.output.context as Record<string, unknown>;
      expect(ctx.execution).toBeDefined();
      expect(ctx.task).toBe('do it');
      expect(ctx.files).toBeUndefined();
      expect(ctx.scratchpad).toBeUndefined();
      expect(ctx.history).toBeUndefined();
    });

    it('pick-context history:N keeps last N entries', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          { op: 'pick-context', include: ['history:2'] }
        ]
      };
      const input = {
        context: {
          history: [
            { role: 'user', message: '1' },
            { role: 'user', message: '2' },
            { role: 'user', message: '3' }
          ]
        }
      };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      const ctx = result.output.context as Record<string, unknown>;
      expect((ctx.history as unknown[]).length).toBe(2);
      expect((ctx.history as Array<{ message: string }>)[0].message).toBe('2');
    });

    it('pick-context history:all and history:0 keep full history', async () => {
      const hist = [
        { role: 'user', message: '1' },
        { role: 'user', message: '2' },
        { role: 'user', message: '3' }
      ];
      for (const inc of ['history:all', 'history:0'] as const) {
        const pipeline = {
          steps: [
            { op: 'copy', from: '$', to: '$out' },
            { op: 'pick-context', include: [inc] }
          ]
        };
        const result = await runTransformPipeline(pipeline, {
          context: { history: [...hist] }
        });
        expect(result.success).toBe(true);
        const ctx = result.output.context as Record<string, unknown>;
        expect((ctx.history as unknown[]).length).toBe(3);
      }
    });

    it('apply-workbench-section-ops runs set/append/remove and short aliases', async () => {
      const pipeline = {
        steps: [
          { op: 'set', path: 'context.workbench.sections', value: { findings: 'a', dropme: 'x' } },
          {
            op: 'set',
            path: 'llm.workbench_ops',
            value: [
              { o: 'a', k: 'findings', t: 'b' },
              { op: 'set', key: 'task_digest', value: 'goal' },
              { o: 'rm', k: 'dropme' }
            ]
          },
          {
            op: 'apply-workbench-section-ops',
            from: 'llm.workbench_ops',
            sectionsPath: 'context.workbench.sections'
          }
        ]
      };
      const result = await runTransformPipeline(pipeline, {});
      expect(result.success).toBe(true);
      const sec = (result.output.context as { workbench: { sections: Record<string, string> } }).workbench
        .sections;
      expect(sec.findings).toBe('a\nb');
      expect(sec.task_digest).toBe('goal');
      expect(sec.dropme).toBeUndefined();
    });

    it('merge-workbench-sections shallow-merges llm sections into context', async () => {
      const pipeline = {
        steps: [
          { op: 'set', path: '$.llm.workbench.sections', value: { findings: 'from llm', onlyLlm: 'x' } },
          { op: 'set', path: '$.context.workbench.sections', value: { findings: 'stale', preserved: 'keep' } },
          {
            op: 'merge-workbench-sections',
            from: '$.llm.workbench.sections',
            to: '$.context.workbench.sections'
          }
        ]
      };
      const result = await runTransformPipeline(pipeline, {});
      expect(result.success).toBe(true);
      const sections = (result.output.context as Record<string, unknown>).workbench as Record<string, unknown>;
      const sec = sections.sections as Record<string, string>;
      expect(sec.findings).toBe('from llm');
      expect(sec.onlyLlm).toBe('x');
      expect(sec.preserved).toBe('keep');
    });

    it('drop removes nested path from $out', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          { op: 'drop', path: '$.context.files' }
        ]
      };
      const input = {
        context: { files: { 'a.js': 'x' }, task: 'ok' }
      };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      const ctx = result.output.context as Record<string, unknown>;
      expect(ctx.files).toBeUndefined();
      expect(ctx.task).toBe('ok');
    });

    it('truncate-history keeps last N entries', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          { op: 'truncate-history', keep: 2 }
        ]
      };
      const input = {
        context: {
          history: [
            { role: 'user', message: 'a' },
            { role: 'user', message: 'b' },
            { role: 'user', message: 'c' }
          ]
        }
      };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      const h = (result.output.context as Record<string, unknown>).history as Array<{ message: string }>;
      expect(h.length).toBe(2);
      expect(h[0].message).toBe('b');
      expect(h[1].message).toBe('c');
    });

    it('include-if drops path when condition is falsy', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          { op: 'include-if', path: '$.context.workbench', condition: '$.context.hasWorkbench' }
        ]
      };
      const input = {
        context: { workbench: { sections: { a: 'text' } }, hasWorkbench: false }
      };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      const ctx = result.output.context as Record<string, unknown>;
      expect(ctx.workbench).toBeUndefined();
    });

    it('include-if keeps path when condition is truthy', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          { op: 'include-if', path: '$.context.workbench', condition: '$.context.hasWorkbench' }
        ]
      };
      const input = {
        context: { workbench: { sections: { a: 'text' } }, hasWorkbench: true }
      };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      const ctx = result.output.context as Record<string, unknown>;
      expect(ctx.workbench).toBeDefined();
    });

    it('pick-files keeps only specified paths', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          { op: 'pick-files', paths: ['src/auth.js'] }
        ]
      };
      const input = {
        context: {
          files: {
            'src/auth.js': 'content-a',
            'src/app.js': 'content-b',
            'src/utils.js': 'content-c'
          }
        }
      };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      const files = (result.output.context as Record<string, unknown>).files as Record<string, unknown>;
      expect(files['src/auth.js']).toBe('content-a');
      expect(files['src/app.js']).toBeUndefined();
      expect(files['src/utils.js']).toBeUndefined();
    });

    it('pick-files $result auto-picks from result action key', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          { op: 'pick-files', paths: '$result' }
        ]
      };
      const input = {
        context: {
          files: {
            'src/auth.js': 'content-a',
            'src/app.js': 'content-b'
          }
        },
        result: {
          'rag-search': {
            files: ['src/auth.js'],
            results: []
          }
        }
      };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      const files = (result.output.context as Record<string, unknown>).files as Record<string, unknown>;
      expect(files['src/auth.js']).toBe('content-a');
      expect(files['src/app.js']).toBeUndefined();
    });

    it('merge-files-to-context folds read-file result into context.files', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          { op: 'merge-files-to-context' }
        ]
      };
      const input = {
        context: { files: { 'src/app.js': 'old' } },
        result: { 'read-file': { path: 'src/auth.js', content: 'new content' } }
      };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      const files = (result.output.context as Record<string, unknown>).files as Record<string, unknown>;
      expect(files['src/auth.js']).toBe('new content');
      expect(files['src/app.js']).toBe('old');
    });

    it('summarize-files truncates to maxLines', async () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          { op: 'summarize-files', maxLines: 10 }
        ]
      };
      const input = {
        context: { files: { 'src/big.js': lines.join('\n') } }
      };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      const files = (result.output.context as Record<string, unknown>).files as Record<string, unknown>;
      const content = files['src/big.js'] as string;
      expect(content.split('\n').length).toBe(11); // 10 lines + comment
      expect(content).toContain('90 more lines');
    });

    it('summarize-files skips files not matching only prefix', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          { op: 'summarize-files', maxLines: 2, only: ['src/'] }
        ]
      };
      const lines5 = 'a\nb\nc\nd\ne';
      const input = {
        context: {
          files: {
            'src/auth.js': lines5,
            'tests/auth.test.js': lines5
          }
        }
      };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      const files = (result.output.context as Record<string, unknown>).files as Record<string, unknown>;
      expect((files['src/auth.js'] as string).split('\n').length).toBe(3); // 2 + comment
      expect(files['tests/auth.test.js']).toBe(lines5); // untouched
    });

    it('for-each runs sub-steps per item', async () => {
      const pipeline = {
        steps: [
          { op: 'copy', from: '$', to: '$out' },
          {
            op: 'for-each',
            arrayPath: '$.items',
            as: '$item',
            steps: [
              { op: 'append-to-array', to: '$.processed', value: { done: '${$item}' } }
            ]
          }
        ]
      };
      const input = { items: ['a', 'b', 'c'], processed: [] };
      const result = await runTransformPipeline(pipeline, input);
      expect(result.success).toBe(true);
      expect((result.output.processed as unknown[]).length).toBe(3);
    });
  });

  describe('Integration agent-coder/3 (prompts/transforms)', () => {
    it('transform request.json via runPromptsTransform', async () => {
      const requestPath = path.join(SIM_DIR, 'request.json');
      const input = JSON.parse(fs.readFileSync(requestPath, 'utf-8'));

      const result = await runPromptsTransform(
        PROMPTS_TRANSFORMS,
        'agent',
        input,
        'request',
        { step: 3, baseDir: PROJECT_ROOT }
      );

      if (!result.success) {
        console.log('Transform error:', result.error);
      }
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toBeDefined();
      }
    });

    it('transform response via runPromptsTransform', async () => {
      const responseMdPath = path.join(SIM_DIR, 'response.md');
      const responseMd = fs.existsSync(responseMdPath)
        ? fs.readFileSync(responseMdPath, 'utf-8')
        : '{"step":"done","message":"ok","execute":{},"completed":true}';
      const input = { context: {}, llm: { response: responseMd } };

      const result = await runPromptsTransform(
        PROMPTS_TRANSFORMS,
        'agent',
        input,
        'response',
        { step: 3, baseDir: SIM_DIR }
      );

      if (!result.success) {
        console.log('Transform error:', result.error);
      }
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toBeDefined();
      }
    });
  });
});
