/**
 * Unit tests for IgnoreDetector
 */

const { IgnoreDetector } = require('./ignore-detector');

describe('IgnoreDetector', () => {
  let detector;
  const tempDir = '/test/project';

  beforeEach(() => {
    detector = new IgnoreDetector({ projectPath: tempDir });
  });

  describe('_parseIgnoreFile', () => {
    it('should parse simple patterns', () => {
      const content = 'node_modules/\n.git\n*.log';
      const patterns = detector._parseIgnoreFile(content, '.a2aignore');
      
      expect(patterns).toHaveLength(3);
      expect(patterns[0]).toEqual({
        pattern: 'node_modules',
        isNegation: false,
        isDir: true,
        isRootAnchored: false,
        source: '.a2aignore'
      });
    });

    it('should parse root-anchored patterns', () => {
      const content = '/node_modules/\n/build\n';
      const patterns = detector._parseIgnoreFile(content, '.a2aignore');
      
      expect(patterns[0].isRootAnchored).toBe(true);
      expect(patterns[0].pattern).toBe('node_modules');
      expect(patterns[1].isRootAnchored).toBe(true);
      expect(patterns[1].pattern).toBe('build');
    });

    it('should parse negation patterns', () => {
      const content = '*.log\n!important.log';
      const patterns = detector._parseIgnoreFile(content, '.a2aignore');
      
      expect(patterns[0].isNegation).toBe(false);
      expect(patterns[1].isNegation).toBe(true);
      expect(patterns[1].pattern).toBe('important.log');
    });

    it('should skip comments and empty lines', () => {
      const content = '# This is a comment\nnode_modules/\n\n.git';
      const patterns = detector._parseIgnoreFile(content, '.a2aignore');
      
      expect(patterns).toHaveLength(2);
    });
  });

  describe('_matchPattern', () => {
    beforeEach(() => {
      detector._initialized = true;
    });

    it('should match exact paths', () => {
      expect(detector._matchPattern('node_modules', 'node_modules')).toBe(true);
      expect(detector._matchPattern('src/index.js', 'src')).toBe(true);
    });

    it('should match patterns at any path level', () => {
      expect(detector._matchPattern('packages/agent/node_modules', 'node_modules')).toBe(true);
      expect(detector._matchPattern('deep/nested/node_modules/lib', 'node_modules')).toBe(true);
      expect(detector._matchPattern('src/components/Button.js', 'components')).toBe(true);
    });

    it('should match path prefixes', () => {
      expect(detector._matchPattern('node_modules/express/package.json', 'node_modules')).toBe(true);
    });

    it('should not match partial names', () => {
      expect(detector._matchPattern('my_node_modules', 'node_modules')).toBe(false);
      expect(detector._matchPattern('node_modules_backup', 'node_modules')).toBe(false);
    });

    it('should handle glob patterns', () => {
      expect(detector._matchPattern('test.js', '*.js')).toBe(true);
      expect(detector._matchPattern('helper.js', '*.js')).toBe(true);
      expect(detector._matchPattern('file.txt', '*.js')).toBe(false);
      expect(detector._matchPattern('src/utils/helper.js', '*.js')).toBe(false); // *.js only matches filename, not full path
    });

  });

  describe('shouldIgnore - node_modules filtering', () => {
    beforeEach(() => {
      detector._initialized = true;
    });

    it('should ignore node_modules at root level', () => {
      detector.ignorePatterns = [
        { pattern: 'node_modules', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' }
      ];
      
      expect(detector.shouldIgnore('node_modules')).toBe(true);
      expect(detector.shouldIgnore('node_modules/express')).toBe(true);
      expect(detector.shouldIgnore('node_modules/express/package.json')).toBe(true);
    });

    it('should ignore node_modules in subdirectories', () => {
      detector.ignorePatterns = [
        { pattern: 'node_modules', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' }
      ];
      
      expect(detector.shouldIgnore('packages/agent/node_modules')).toBe(true);
      expect(detector.shouldIgnore('packages/agent/node_modules/lodash')).toBe(true);
      expect(detector.shouldIgnore('deep/nested/path/node_modules')).toBe(true);
    });

    it('should NOT ignore node_modules when using root-anchored pattern', () => {
      detector.ignorePatterns = [
        { pattern: 'node_modules', isNegation: false, isDir: true, isRootAnchored: true, source: '.a2aignore' }
      ];
      
      expect(detector.shouldIgnore('node_modules')).toBe(true);
      expect(detector.shouldIgnore('packages/agent/node_modules')).toBe(false);
      expect(detector.shouldIgnore('deep/nested/node_modules')).toBe(false);
    });

    it('should handle negation patterns', () => {
      detector.ignorePatterns = [
        { pattern: '*.log', isNegation: false, isDir: false, isRootAnchored: false, source: '.a2aignore' },
        { pattern: 'important.log', isNegation: true, isDir: false, isRootAnchored: false, source: '.a2aignore' }
      ];
      
      expect(detector.shouldIgnore('debug.log')).toBe(true);
      expect(detector.shouldIgnore('important.log')).toBe(false);
    });
  });

  describe('shouldIgnore - various patterns', () => {
    beforeEach(() => {
      detector._initialized = true;
    });

    it('should ignore directories with trailing slash pattern', () => {
      detector.ignorePatterns = [
        { pattern: 'dist', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' }
      ];
      
      expect(detector.shouldIgnore('dist')).toBe(true);
      expect(detector.shouldIgnore('dist/bundle.js')).toBe(true);
      expect(detector.shouldIgnore('src/dist')).toBe(true);
    });

    it('should ignore files by extension', () => {
      detector.ignorePatterns = [
        { pattern: '*.tmp', isNegation: false, isDir: false, isRootAnchored: false, source: '.a2aignore' }
      ];
      
      expect(detector.shouldIgnore('cache.tmp')).toBe(true);
      expect(detector.shouldIgnore('temp/cache.tmp')).toBe(true);
    });

    it('should ignore specific directories anywhere in path', () => {
      detector.ignorePatterns = [
        { pattern: '.git', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' }
      ];
      
      expect(detector.shouldIgnore('.git')).toBe(true);
      expect(detector.shouldIgnore('packages/.git')).toBe(true);
      expect(detector.shouldIgnore('packages/agent/.git/config')).toBe(true);
    });

    it('should ignore specific files anywhere in path', () => {
      detector.ignorePatterns = [
        { pattern: 'package-lock.json', isNegation: false, isDir: false, isRootAnchored: false, source: '.a2aignore' }
      ];
      
      // Root level
      expect(detector.shouldIgnore('package-lock.json')).toBe(true);
      // Subdirectory level
      expect(detector.shouldIgnore('scripts/laravel-route-health-checker/package-lock.json')).toBe(true);
      expect(detector.shouldIgnore('packages/agent/package-lock.json')).toBe(true);
      // Should not match partial names
      expect(detector.shouldIgnore('my-package-lock.json')).toBe(false);
      expect(detector.shouldIgnore('package-lock.json.backup')).toBe(false);
    });

  });

  describe('shouldSkipDirectory', () => {
    beforeEach(() => {
      detector._initialized = true;
    });

    it('should skip node_modules directories at any level', () => {
      detector.ignorePatterns = [
        { pattern: 'node_modules', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' }
      ];
      
      expect(detector.shouldSkipDirectory('node_modules', '')).toBe(true);
      expect(detector.shouldSkipDirectory('node_modules', 'packages/agent')).toBe(true);
    });

    it('should skip when parent directory is ignored', () => {
      detector.ignorePatterns = [
        { pattern: 'node_modules', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' }
      ];
      
      expect(detector.shouldSkipDirectory('express', 'node_modules')).toBe(true);
      expect(detector.shouldSkipDirectory('lib', 'packages/agent/node_modules')).toBe(true);
    });
  });

  describe('filterEntries', () => {
    beforeEach(() => {
      detector._initialized = true;
      detector.ignorePatterns = [
        { pattern: 'node_modules', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' },
        { pattern: '*.log', isNegation: false, isDir: false, isRootAnchored: false, source: '.a2aignore' }
      ];
    });

    it('should filter out ignored entries', () => {
      const entries = [
        { name: 'src', path: 'src', type: 'directory' },
        { name: 'node_modules', path: 'node_modules', type: 'directory' },
        { name: 'debug.log', path: 'debug.log', type: 'file' },
        { name: 'index.js', path: 'index.js', type: 'file' },
        { name: 'node_modules', path: 'packages/agent/node_modules', type: 'directory' }
      ];
      
      const filtered = detector.filterEntries(entries);
      
      expect(filtered).toHaveLength(2);
      expect(filtered[0].name).toBe('src');
      expect(filtered[1].name).toBe('index.js');
    });
  });

  describe('integration - complex scenarios', () => {
    beforeEach(() => {
      detector._initialized = true;
    });

    it('real-world .a2aignore patterns', () => {
      // Simulate patterns from a real .a2aignore file
      const patterns = [
        { pattern: 'node_modules', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' },
        { pattern: '.git', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' },
        { pattern: 'dist', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' },
        { pattern: '*.log', isNegation: false, isDir: false, isRootAnchored: false, source: '.a2aignore' },
        { pattern: '.idea', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' }
      ];
      detector.ignorePatterns = patterns;

      // Should all be ignored
      expect(detector.shouldIgnore('node_modules')).toBe(true);
      expect(detector.shouldIgnore('packages/rag/node_modules')).toBe(true);
      expect(detector.shouldIgnore('.git')).toBe(true);
      expect(detector.shouldIgnore('packages/agent/.git')).toBe(true);
      expect(detector.shouldIgnore('dist')).toBe(true);
      expect(detector.shouldIgnore('build/dist')).toBe(true);
      expect(detector.shouldIgnore('error.log')).toBe(true);
      expect(detector.shouldIgnore('.idea')).toBe(true);
      expect(detector.shouldIgnore('packages/api-client/.idea')).toBe(true);

      // Should NOT be ignored
      expect(detector.shouldIgnore('src')).toBe(false);
      expect(detector.shouldIgnore('package.json')).toBe(false);
      expect(detector.shouldIgnore('README.md')).toBe(false);
    });

    it('mixed root-anchored and non-anchored patterns', () => {
      detector.ignorePatterns = [
        { pattern: 'build', isNegation: false, isDir: true, isRootAnchored: true, source: '.a2aignore' },  // Only root
        { pattern: 'node_modules', isNegation: false, isDir: true, isRootAnchored: false, source: '.a2aignore' }  // Anywhere
      ];

      expect(detector.shouldIgnore('build')).toBe(true);
      expect(detector.shouldIgnore('src/build')).toBe(false);  // Not ignored because root-anchored
      
      expect(detector.shouldIgnore('node_modules')).toBe(true);
      expect(detector.shouldIgnore('packages/agent/node_modules')).toBe(true);  // Ignored because not root-anchored
    });
  });
});
