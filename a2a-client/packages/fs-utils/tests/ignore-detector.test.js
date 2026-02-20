/**
 * IgnoreDetector unit tests
 */
const IgnoreDetector = require('../src/ignore-detector');

describe('IgnoreDetector', () => {
  describe('constructor', () => {
    it('uses cwd as default projectPath', () => {
      const detector = new IgnoreDetector();
      expect(detector.projectPath).toBe(process.cwd());
      expect(detector.customIgnoreFiles).toEqual([]);
      expect(detector._initialized).toBe(false);
    });

    it('accepts custom config', () => {
      const detector = new IgnoreDetector({
        projectPath: '/custom/path',
        customIgnoreFiles: ['.myignore'],
        additionalPatterns: ['custom/**'],
      });
      expect(detector.projectPath).toBe('/custom/path');
      expect(detector.customIgnoreFiles).toHaveLength(1);
      expect(detector.additionalPatterns).toHaveLength(1);
    });
  });

  describe('_isCommonIgnoredDir', () => {
    it('returns true for common dirs', () => {
      const detector = new IgnoreDetector();
      expect(detector._isCommonIgnoredDir('node_modules')).toBe(true);
      expect(detector._isCommonIgnoredDir('.git')).toBe(true);
      expect(detector._isCommonIgnoredDir('vendor')).toBe(true);
      expect(detector._isCommonIgnoredDir('dist')).toBe(true);
      expect(detector._isCommonIgnoredDir('build')).toBe(true);
    });

    it('returns false for app dirs', () => {
      const detector = new IgnoreDetector();
      expect(detector._isCommonIgnoredDir('app')).toBe(false);
      expect(detector._isCommonIgnoredDir('src')).toBe(false);
    });
  });

  describe('_parseIgnoreFile', () => {
    it('parses basic patterns', () => {
      const detector = new IgnoreDetector();
      const content = `
# Comment
node_modules
*.log
/dist/
!important.txt
`;
      const patterns = detector._parseIgnoreFile(content, '.gitignore');
      expect(patterns).toHaveLength(4);
      expect(patterns[0].pattern).toBe('node_modules');
      expect(patterns[0].isNegation).toBe(false);
      expect(patterns[1].pattern).toBe('*.log');
      expect(patterns[2].pattern).toBe('dist');
      expect(patterns[2].isRootAnchored).toBe(true);
      expect(patterns[2].isDir).toBe(true);
      expect(patterns[3].pattern).toBe('important.txt');
      expect(patterns[3].isNegation).toBe(true);
    });
  });

  describe('_matchPattern', () => {
    it('matches glob patterns', () => {
      const detector = new IgnoreDetector();
      expect(detector._matchPattern('test.log', '*.log')).toBe(true);
      expect(detector._matchPattern('app.min.js', '*.min.js')).toBe(true);
      expect(detector._matchPattern('app.js', '*.min.js')).toBe(false);
      expect(detector._matchPattern('node_modules/package', 'node_modules')).toBe(true);
    });
  });

  describe('_matchComponent', () => {
    it('matches path components', () => {
      const detector = new IgnoreDetector();
      expect(detector._matchComponent('node_modules', 'node_modules', true)).toBe(true);
      expect(detector._matchComponent('test.log', '*.log', false)).toBe(true);
      expect(detector._matchComponent('test.txt', '*.log', false)).toBe(false);
    });
  });

  describe('async methods', () => {
    it('initialize loads default patterns', async () => {
      const detector = new IgnoreDetector({ projectPath: process.cwd() });
      await detector.initialize();
      expect(detector._initialized).toBe(true);
      expect(detector.ignorePatterns.length).toBeGreaterThan(0);
      const patterns = detector.getPatterns();
      expect(patterns.some((p) => p.pattern === 'node_modules')).toBe(true);
      expect(patterns.some((p) => p.pattern === 'vendor')).toBe(true);
    });

    it('shouldIgnore returns true for ignored paths', async () => {
      const detector = new IgnoreDetector({ projectPath: process.cwd() });
      await detector.initialize();
      expect(detector.shouldIgnore('node_modules/package/index.js')).toBe(true);
      expect(detector.shouldIgnore('vendor/autoload.php')).toBe(true);
      expect(detector.shouldIgnore('.git/config')).toBe(true);
      expect(detector.shouldIgnore('app/Controllers/UserController.php')).toBe(false);
    });

    it('getDirectoriesToSkip returns directory patterns', async () => {
      const detector = new IgnoreDetector({ projectPath: process.cwd() });
      await detector.initialize();
      const dirsToSkip = detector.getDirectoriesToSkip();
      expect(dirsToSkip).toContain('node_modules');
      expect(dirsToSkip).toContain('vendor');
    });

    it('filterEntries filters ignored entries', async () => {
      const detector = new IgnoreDetector({ projectPath: process.cwd() });
      await detector.initialize();
      const entries = [
        { name: 'app.php', path: 'app/app.php', type: 'file' },
        { name: 'index.js', path: 'node_modules/package/index.js', type: 'file' },
        { name: 'UserController.php', path: 'app/Controllers/UserController.php', type: 'file' },
      ];
      const filtered = detector.filterEntries(entries);
      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => !e.path.includes('node_modules'))).toBe(true);
    });

    it('shouldSkipDirectory returns true for common dirs', async () => {
      const detector = new IgnoreDetector({ projectPath: process.cwd() });
      await detector.initialize();
      expect(detector.shouldSkipDirectory('node_modules')).toBe(true);
      expect(detector.shouldSkipDirectory('.git')).toBe(true);
      expect(detector.shouldSkipDirectory('vendor')).toBe(true);
      expect(detector.shouldSkipDirectory('app')).toBe(false);
    });

    it('addPatterns adds patterns programmatically', async () => {
      const detector = new IgnoreDetector({ projectPath: process.cwd() });
      await detector.initialize();
      const initialCount = detector.ignorePatterns.length;
      detector.addPatterns(['custom/**', 'temp/**']);
      expect(detector.ignorePatterns.length).toBe(initialCount + 2);
    });
  });
});
