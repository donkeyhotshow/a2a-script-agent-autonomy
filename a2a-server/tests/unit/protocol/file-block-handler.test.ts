import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  validateFileBlock,
  parseFileBlock,
  parseFileBlocks,
  parseFileBlockSafe,
  createFileBlock,
  createFileBlockRequest,
  extractLines,
  getLineCount,
  getLine,
  chunkFile,
  chunkFileBlock,
  mergeFileBlocks,
  diffFileBlocks,
  applyDiff,
  serializeFileBlock,
  deserializeFileBlock,
  deserializeFileBlockSafe,
  getFileExtension,
  getFileName,
  getDirectory,
  isBinaryFile,
  getFileSize,
  truncateFileBlock,
  cloneFileBlock,
} from '../../../src/protocol/file-block-handler.js';

describe('file-block-handler', () => {
  describe('detectLanguage', () => {
    it('detects by extension', () => {
      expect(detectLanguage('a.php')).toBe('php');
      expect(detectLanguage('a.ts')).toBe('typescript');
      expect(detectLanguage('a.vue')).toBe('vue');
      expect(detectLanguage('a.php')).toBe('php');
    });
    it('returns plaintext for unknown', () => {
      expect(detectLanguage('file.xyz')).toBe('plaintext');
      expect(detectLanguage('noext')).toBe('plaintext');
    });
  });

  describe('validateFileBlock, parseFileBlock', () => {
    it('rejects invalid', () => {
      expect(validateFileBlock(null).valid).toBe(false);
      expect(validateFileBlock({}).valid).toBe(false);
      expect(validateFileBlock({ path: '', content: 'x' }).valid).toBe(false);
    });
    it('accepts valid', () => {
      expect(validateFileBlock({ path: 'a.ts', content: 'x' }).valid).toBe(true);
    });
    it('parseFileBlock throws on invalid', () => {
      expect(() => parseFileBlock(null)).toThrow();
    });
    it('parseFileBlock parses valid', () => {
      const block = parseFileBlock({ path: 'a.ts', content: 'x', startLine: 1, endLine: 2 });
      expect(block.path).toBe('a.ts');
      expect(block.content).toBe('x');
      expect(block.startLine).toBe(1);
    });
    it('parseFileBlocks', () => {
      const blocks = parseFileBlocks([{ path: 'a.ts', content: 'x' }, { path: 'b.ts', content: 'y' }]);
      expect(blocks).toHaveLength(2);
    });
    it('parseFileBlockSafe returns null on error', () => {
      expect(parseFileBlockSafe(null)).toBeNull();
    });
  });

  describe('createFileBlock, createFileBlockRequest', () => {
    it('createFileBlock', () => {
      const b = createFileBlock('a.ts', 'content', { startLine: 1, endLine: 5 });
      expect(b.path).toBe('a.ts');
      expect(b.startLine).toBe(1);
    });
    it('createFileBlockRequest', () => {
      const r = createFileBlockRequest('a.ts', 1, 10);
      expect(r.path).toBe('a.ts');
      expect(r.startLine).toBe(1);
      expect(r.endLine).toBe(10);
    });
  });

  describe('extractLines, getLineCount, getLine', () => {
    const block = createFileBlock('a.ts', 'line1\nline2\nline3\nline4');
    it('extractLines', () => {
      expect(extractLines(block, 2, 3)).toBe('line2\nline3');
    });
    it('getLineCount', () => {
      expect(getLineCount(block)).toBe(4);
    });
    it('getLine', () => {
      expect(getLine(block, 1)).toBe('line1');
      expect(getLine(block, 99)).toBeNull();
    });
  });

  describe('chunkFile, chunkFileBlock', () => {
    it('chunkFile', () => {
      const chunks = chunkFile('a\nb\nc\nd\ne', 2);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]?.startLine).toBe(1);
      expect(chunks[0]?.endLine).toBe(2);
    });
    it('chunkFileBlock', () => {
      const block = createFileBlock('a.ts', 'a\nb\nc\nd');
      const chunks = chunkFileBlock(block, 2);
      expect(chunks).toHaveLength(2);
      expect(chunks[0]?.path).toBe('a.ts');
    });
  });

  describe('mergeFileBlocks', () => {
    it('throws on empty', () => {
      expect(() => mergeFileBlocks([])).toThrow();
    });
    it('returns single for one block', () => {
      const b = createFileBlock('a.ts', 'x');
      expect(mergeFileBlocks([b])).toBe(b);
    });
    it('merges multiple', () => {
      const b1 = createFileBlock('a.ts', 'line1\nline2', { startLine: 1, endLine: 2 });
      const b2 = createFileBlock('a.ts', 'line3', { startLine: 3, endLine: 3 });
      const merged = mergeFileBlocks([b1, b2]);
      expect(merged.content).toContain('line1');
      expect(merged.content).toContain('line3');
    });
  });

  describe('diffFileBlocks, applyDiff', () => {
    it('diffFileBlocks', () => {
      const orig = createFileBlock('a.ts', 'a\nb\nc');
      const mod = createFileBlock('a.ts', 'a\nx\nc\nd');
      const diff = diffFileBlocks(orig, mod);
      expect(diff.additions).toBeGreaterThanOrEqual(0);
      expect(diff.deletions).toBeGreaterThanOrEqual(0);
      expect(diff.changes.length).toBeGreaterThanOrEqual(0);
    });
    it('applyDiff', () => {
      const block = createFileBlock('a.ts', 'a\nb\nc');
      const result = applyDiff(block, [{ line: 2, type: 'modify', content: 'x' }]);
      expect(result.content).toContain('x');
    });
  });

  describe('serializeFileBlock, deserializeFileBlock', () => {
    it('round-trip', () => {
      const block = createFileBlock('a.ts', 'content');
      const str = serializeFileBlock(block);
      const parsed = deserializeFileBlock(str);
      expect(parsed.path).toBe(block.path);
    });
    it('deserializeFileBlockSafe returns null on error', () => {
      expect(deserializeFileBlockSafe('{invalid')).toBeNull();
    });
  });

  describe('getFileExtension, getFileName, getDirectory', () => {
    it('getFileExtension', () => {
      expect(getFileExtension('a/b/c.ts')).toBe('.ts');
      expect(getFileExtension('noext')).toBe('');
      expect(getFileExtension('.hidden')).toBe('');
    });
    it('getFileName', () => {
      expect(getFileName('a/b/file.ts')).toBe('file.ts');
      expect(getFileName('file.ts')).toBe('file.ts');
    });
    it('getDirectory', () => {
      expect(getDirectory('a/b/file.ts')).toBe('a/b');
      expect(getDirectory('file.ts')).toBe('');
    });
  });

  describe('isBinaryFile, getFileSize, truncateFileBlock, cloneFileBlock', () => {
    it('isBinaryFile', () => {
      expect(isBinaryFile('a.png')).toBe(true);
      expect(isBinaryFile('a.ts')).toBe(false);
    });
    it('getFileSize', () => {
      expect(getFileSize(createFileBlock('a.ts', 'hello'))).toBe(5);
    });
    it('truncateFileBlock', () => {
      const block = createFileBlock('a.ts', 'x'.repeat(200));
      const truncated = truncateFileBlock(block, 50);
      expect(getFileSize(truncated)).toBeLessThanOrEqual(60);
      expect(truncated.content).toContain('truncated');
    });
    it('cloneFileBlock', () => {
      const block = createFileBlock('a.ts', 'x');
      const cloned = cloneFileBlock(block);
      expect(cloned).not.toBe(block);
      expect(cloned.path).toBe(block.path);
    });
  });
});
