import { describe, it, expect } from 'vitest';
import { runTransformPipeline, loadTransformPipeline, runPromptsTransform, getPromptsTransformsPath } from '../src/transform/index.js';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(process.cwd(), '..');
const SIM_DIR = path.join(PROJECT_ROOT, 'simulations', 'coder', '3');
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
          { op: 'set', path: 'context.docVirtual', value: 'abcdefghij' },
          {
            op: 'truncate-section',
            path: 'context.docVirtual',
            maxChars: 8,
            suffix: '…'
          }
        ]
      };

      const result = await runTransformPipeline(pipeline, {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.context.docVirtual).toBe('abcdefg…');
      }
    });

    it('should truncate-section shallow object string fields', async () => {
      const pipeline = {
        steps: [
          {
            op: 'set',
            path: 'context.docVirtual',
            value: { a: '12345', b: 2, c: '678901234' }
          },
          {
            op: 'truncate-section',
            path: 'context.docVirtual',
            maxChars: 5,
            suffix: ''
          }
        ]
      };

      const result = await runTransformPipeline(pipeline, {});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output.context.docVirtual).toEqual({
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
  });

  describe('Integration coder/3 (prompts/transforms)', () => {
    it('transform request.json via runPromptsTransform', async () => {
      const requestPath = path.join(SIM_DIR, 'request.json');
      const input = JSON.parse(fs.readFileSync(requestPath, 'utf-8'));

      const result = await runPromptsTransform(
        PROMPTS_TRANSFORMS,
        'coder',
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
        'coder',
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
