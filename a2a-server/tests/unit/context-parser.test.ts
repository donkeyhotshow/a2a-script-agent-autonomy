/**
 * Context Parser Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simulated context parser functions
const contextParser = {
  parseContextBlock: (context: unknown) => {
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context: must be an object');
    }
    return context as {
      version?: string;
      session_id?: string;
      project_id?: string;
      metadata?: Record<string, unknown>;
    };
  },

  validateContextVersion: (version: string): boolean => {
    return /^1\.\d+$/.test(version);
  },

  extractSessionId: (context: { session_id?: string }): string => {
    return context.session_id || 'stateless';
  },

  extractProjectId: (context: { project_id?: string }): string | null => {
    return context.project_id || null;
  },

  isValidContext: (context: unknown): context is { version: string; session_id: string } => {
    if (!context || typeof context !== 'object') return false;
    const ctx = context as { version?: unknown; session_id?: unknown };
    return typeof ctx.version === 'string' && typeof ctx.session_id === 'string';
  },

  serializeContext: (context: object): string => {
    return JSON.stringify(context);
  },

  deserializeContext: (serialized: string): object => {
    return JSON.parse(serialized);
  },
};

describe('Context Parser', () => {
  describe('parseContextBlock', () => {
    it('should parse valid context object', () => {
      const context = { version: '1.0', session_id: 'sess-123' };
      const parsed = contextParser.parseContextBlock(context);
      expect(parsed.version).toBe('1.0');
      expect(parsed.session_id).toBe('sess-123');
    });

    it('should throw for null context', () => {
      expect(() => contextParser.parseContextBlock(null)).toThrow('Invalid context');
    });

    it('should throw for undefined context', () => {
      expect(() => contextParser.parseContextBlock(undefined)).toThrow('Invalid context');
    });

    it('should throw for non-object context', () => {
      expect(() => contextParser.parseContextBlock('string')).toThrow('Invalid context');
    });
  });

  describe('validateContextVersion', () => {
    it('should validate version 1.0', () => {
      expect(contextParser.validateContextVersion('1.0')).toBe(true);
    });

    it('should validate version 1.1', () => {
      expect(contextParser.validateContextVersion('1.1')).toBe(true);
    });

    it('should validate version 1.10', () => {
      expect(contextParser.validateContextVersion('1.10')).toBe(true);
    });

    it('should reject version 2.0', () => {
      expect(contextParser.validateContextVersion('2.0')).toBe(false);
    });

    it('should reject invalid versions', () => {
      expect(contextParser.validateContextVersion('invalid')).toBe(false);
      expect(contextParser.validateContextVersion('1')).toBe(false);
      expect(contextParser.validateContextVersion('')).toBe(false);
    });
  });

  describe('extractSessionId', () => {
    it('should extract session_id from context', () => {
      const context = { session_id: 'sess-123' };
      expect(contextParser.extractSessionId(context)).toBe('sess-123');
    });

    it('should return stateless for missing session_id', () => {
      const context = {};
      expect(contextParser.extractSessionId(context)).toBe('stateless');
    });
  });

  describe('extractProjectId', () => {
    it('should extract project_id from context', () => {
      const context = { project_id: 'proj-123' };
      expect(contextParser.extractProjectId(context)).toBe('proj-123');
    });

    it('should return null for missing project_id', () => {
      const context = {};
      expect(contextParser.extractProjectId(context)).toBeNull();
    });
  });

  describe('isValidContext', () => {
    it('should validate complete context', () => {
      const context = { version: '1.0', session_id: 'sess-123' };
      expect(contextParser.isValidContext(context)).toBe(true);
    });

    it('should reject context without version', () => {
      const context = { session_id: 'sess-123' };
      expect(contextParser.isValidContext(context)).toBe(false);
    });

    it('should reject context without session_id', () => {
      const context = { version: '1.0' };
      expect(contextParser.isValidContext(context)).toBe(false);
    });

    it('should reject null', () => {
      expect(contextParser.isValidContext(null)).toBe(false);
    });

    it('should reject string', () => {
      expect(contextParser.isValidContext('string')).toBe(false);
    });
  });

  describe('serializeContext / deserializeContext', () => {
    it('should serialize and deserialize context', () => {
      const context = { version: '1.0', session_id: 'sess-123', metadata: { key: 'value' } };
      const serialized = contextParser.serializeContext(context);
      const deserialized = contextParser.deserializeContext(serialized);
      
      expect(deserialized.version).toBe('1.0');
      expect(deserialized.session_id).toBe('sess-123');
    });

    it('should preserve nested objects', () => {
      const context = { version: '1.0', data: { nested: { value: 123 } } };
      const serialized = contextParser.serializeContext(context);
      const deserialized = contextParser.deserializeContext(serialized);
      
      expect(deserialized.data.nested.value).toBe(123);
    });
  });
});

describe('File Block Parser', () => {
  const fileBlockParser = {
    isValidFileBlock: (block: unknown): block is { path: string; content: string } => {
      if (!block || typeof block !== 'object') return false;
      const b = block as { path?: unknown; content?: unknown };
      return typeof b.path === 'string' && typeof b.content === 'string';
    },

    extractFilePaths: (blocks: object[]): string[] => {
      return blocks.map(b => (b as { path: string }).path);
    },

    getFileExtension: (path: string): string => {
      const match = path.match(/\.([^.]+)$/);
      return match ? match[1] : '';
    },
  };

  describe('isValidFileBlock', () => {
    it('should validate valid file block', () => {
      const block = { path: 'src/main.ts', content: 'console.log("hello")' };
      expect(fileBlockParser.isValidFileBlock(block)).toBe(true);
    });

    it('should reject block without path', () => {
      const block = { content: 'test' };
      expect(fileBlockParser.isValidFileBlock(block)).toBe(false);
    });

    it('should reject block without content', () => {
      const block = { path: 'test.ts' };
      expect(fileBlockParser.isValidFileBlock(block)).toBe(false);
    });
  });

  describe('extractFilePaths', () => {
    it('should extract paths from multiple blocks', () => {
      const blocks = [
        { path: 'src/main.ts', content: '...' },
        { path: 'src/utils.ts', content: '...' },
        { path: 'src/index.ts', content: '...' },
      ];
      
      const paths = fileBlockParser.extractFilePaths(blocks);
      expect(paths).toHaveLength(3);
      expect(paths).toContain('src/main.ts');
    });
  });

  describe('getFileExtension', () => {
    it('should extract .ts extension', () => {
      expect(fileBlockParser.getFileExtension('src/main.ts')).toBe('ts');
    });

    it('should extract .js extension', () => {
      expect(fileBlockParser.getFileExtension('src/app.js')).toBe('js');
    });

    it('should extract .vue extension', () => {
      expect(fileBlockParser.getFileExtension('components/App.vue')).toBe('vue');
    });

    it('should return empty string for no extension', () => {
      expect(fileBlockParser.getFileExtension('Makefile')).toBe('');
    });
  });
});
