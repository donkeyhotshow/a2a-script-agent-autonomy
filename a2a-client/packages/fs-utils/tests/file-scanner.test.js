/**
 * FileScanner unit tests
 */
const FileScanner = require('../dist/file-scanner');
const GlobMatcher = require('../dist/glob-matcher');
const path = require('path');

describe('FileScanner', () => {
  const testRoot = path.join(__dirname, '..');

  describe('constructor', () => {
    it('uses cwd as default root', () => {
      const scanner = new FileScanner();
      expect(scanner.rootPath).toBe(process.cwd());
      expect(scanner.includePatterns.length).toBeGreaterThan(0);
      expect(scanner.excludePatterns.length).toBeGreaterThan(0);
    });

    it('accepts custom config', () => {
      const scanner = new FileScanner({
        rootPath: '/custom/path',
        includePatterns: ['**/*.php'],
        excludePatterns: ['vendor/**'],
        maxDepth: 5,
      });
      expect(scanner.rootPath).toBe('/custom/path');
      expect(scanner.includePatterns).toHaveLength(1);
      expect(scanner.excludePatterns).toHaveLength(1);
      expect(scanner.maxDepth).toBe(5);
    });
  });

  describe('shouldIncludeFile', () => {
    it('includes files matching pattern', () => {
      const scanner = new FileScanner({
        includePatterns: ['**/*.php'],
        excludePatterns: [],
      });
      expect(scanner.shouldIncludeFile('app.php')).toBe(true);
      expect(scanner.shouldIncludeFile('features/auth/app.php')).toBe(true);
    });
  });

  describe('shouldExcludeFile', () => {
    it('excludes node_modules', () => {
      const scanner = new FileScanner({
        includePatterns: ['**/*'],
        excludePatterns: ['node_modules/**'],
      });
      expect(scanner.shouldExcludeFile('node_modules/package/index.js')).toBe(true);
      expect(scanner.shouldExcludeFile('app/Controllers/UserController.php')).toBe(false);
    });
  });

  describe('shouldExcludeDir', () => {
    it('excludes common dirs', () => {
      const scanner = new FileScanner({
        excludePatterns: ['node_modules/**', 'vendor/**', '.git/**'],
      });
      expect(scanner.shouldExcludeDir('node_modules')).toBe(true);
      expect(scanner.shouldExcludeDir('vendor')).toBe(true);
      expect(scanner.shouldExcludeDir('.git')).toBe(true);
      expect(scanner.shouldExcludeDir('app')).toBe(false);
    });
  });

  describe('scan', () => {
    it('scans project and finds files', async () => {
      const scanner = new FileScanner({
        rootPath: testRoot,
        includePatterns: ['**/*.js'],
        excludePatterns: GlobMatcher.PATTERNS.EXCLUDE,
      });
      const result = await scanner.scan();
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.stats.totalFiles).toBeGreaterThan(0);
      expect(result.files.every((f) => f.ext === '.js')).toBe(true);
    });

    it('respects maxDepth', async () => {
      const scanner = new FileScanner({
        rootPath: testRoot,
        includePatterns: ['**/*.js'],
        excludePatterns: GlobMatcher.PATTERNS.EXCLUDE,
        maxDepth: 1,
      });
      const result = await scanner.scan();
      const maxDepth = Math.max(...result.files.map((f) => f.relativePath.split(/[/\\]/).length));
      expect(maxDepth).toBeLessThanOrEqual(2);
    });

    it('static scan method works', async () => {
      const result = await FileScanner.scan(testRoot, {
        includePatterns: ['**/*.json'],
        excludePatterns: GlobMatcher.PATTERNS.EXCLUDE,
      });
      expect(result.files.length).toBeGreaterThan(0);
    });
  });
});
