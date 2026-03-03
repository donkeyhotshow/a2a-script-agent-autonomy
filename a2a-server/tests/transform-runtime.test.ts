import { describe, it, expect } from 'vitest';
import { runTransformPipeline, loadTransformPipeline } from '../src/transform/index.js';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.join(process.cwd(), '..');
const SIM_DIR = path.join(PROJECT_ROOT, 'simulations', 'coder', '3');

describe('Transform Pipeline Runtime', () => {
  describe('loadTransformPipeline', () => {
    it('should load pipeline from file', async () => {
      const pipelinePath = path.join(SIM_DIR, 'server-transforms-request.json');
      const pipeline = await loadTransformPipeline(pipelinePath);
      expect(pipeline).toBeDefined();
      expect(pipeline.steps).toBeDefined();
      expect(Array.isArray(pipeline.steps)).toBe(true);
    });

    it('should reject invalid pipeline - no steps', async () => {
      await expect(loadTransformPipeline({} as any)).rejects.toThrow();
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
  });

  describe('Integration coder/3', () => {
    it('transform request.json', async () => {
      const requestPath = path.join(SIM_DIR, 'request.json');
      const transformPath = path.join(SIM_DIR, 'server-transforms-request.json');
      
      const input = JSON.parse(fs.readFileSync(requestPath, 'utf-8'));
      const pipeline = JSON.parse(fs.readFileSync(transformPath, 'utf-8'));
      
      // Use project root as baseDir since templateRef paths are relative to project root
      const result = await runTransformPipeline(pipeline, input, { baseDir: PROJECT_ROOT });
      
      if (!result.success) {
        console.log('Transform error:', result.error);
      }
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toBeDefined();
      }
    });

    it('transform response.json', async () => {
      const responsePath = path.join(SIM_DIR, 'response.json');
      const transformPath = path.join(SIM_DIR, 'server-transforms-response.json');
      
      const input = JSON.parse(fs.readFileSync(responsePath, 'utf-8'));
      const pipeline = JSON.parse(fs.readFileSync(transformPath, 'utf-8'));
      
      const result = await runTransformPipeline(pipeline, input, { baseDir: SIM_DIR });
      
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
