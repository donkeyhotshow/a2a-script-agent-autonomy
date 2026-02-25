const { validateAndResolveCwd, validateExecRunParams } = require('../index.cjs');
const path = require('path');
const fs = require('fs');

// Import real dependencies
const { PathUtils } = require('@libs/system/path-validation');
const fileSystemFactory = require('@libs/system/file-operations');
const { getCurrentDir, expandPath } = require('@libs/system/workdir');

describe('CommandValidation', () => {
  let realPathUtils;
  let realFileUtils;
  let realExpandPath;

  beforeAll(() => {
    // Create real instances
    realPathUtils = new PathUtils(console);
    realFileUtils = fileSystemFactory(console); // Instantiate FileSystemUtils using the factory
    realExpandPath = expandPath;
  });

  describe('validateAndResolveCwd', () => {
    test('should return current working directory for null/undefined cwd', async () => {
      const result1 = await validateAndResolveCwd(null, realPathUtils, realFileUtils, realExpandPath);
      expect(result1.ok).toBe(true);
      expect(result1.path).toBe(process.cwd());

      const result2 = await validateAndResolveCwd(undefined, realPathUtils, realFileUtils, realExpandPath);
      expect(result2.ok).toBe(true);
      expect(result2.path).toBe(process.cwd());
    });

    test('should return current working directory for empty string cwd', async () => {
      const result = await validateAndResolveCwd('   ', realPathUtils, realFileUtils, realExpandPath);
      expect(result.ok).toBe(true);
      expect(result.path).toBe(process.cwd());
    });

    test('should handle valid Windows paths', async () => {
      // Use existing directory for testing
      const existingDir = process.cwd();

      const result = await validateAndResolveCwd(existingDir, realPathUtils, realFileUtils, realExpandPath);
      expect(result.ok).toBe(true);
      expect(result.path).toBe(path.resolve(existingDir));
    });

    test('should handle valid Unix paths', async () => {
      const validPaths = [
        '/tmp',
        './',
      ];

      for (const cwd of validPaths) {
        const result = await validateAndResolveCwd(cwd, realPathUtils, realFileUtils, realExpandPath);
        if (fs.existsSync(path.resolve(cwd))) {
          expect(result.ok).toBe(true);
          expect(result.path).toBeDefined();
        }
      }
    });

    test('should handle URL-encoded Windows paths', async () => {
      const encodedPath = 'C%3A%5Capps%5Cproject';
      const decodedPath = 'C:\\apps\\project';

      const result = await validateAndResolveCwd(encodedPath, realPathUtils, realFileUtils, realExpandPath);

      if (fs.existsSync(decodedPath)) {
        expect(result.ok).toBe(true);
        expect(result.path).toBeDefined();
      }
    });

    test('should handle Unix-style Windows paths', async () => {
      const unixStylePath = '/c/apps/project';

      const result = await validateAndResolveCwd(unixStylePath, realPathUtils, realFileUtils, realExpandPath);

      // This test should check error handling for Unix-style paths on Windows
      if (process.platform === 'win32') {
        expect(result.ok).toBe(false);
        expect(result.error).toContain('формат "/c/..." не поддерживается');
      }
    });

    test('should reject invalid Windows disk format', async () => {
      const invalidPath = 'C%3A\\apps\\project';
      const result = await validateAndResolveCwd(invalidPath, realPathUtils, realFileUtils, realExpandPath);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('недопустимый формат диска');
    });

    test('should reject unsupported Unix-style format', async () => {
      const invalidPath = '/c/apps/project';
      const result = await validateAndResolveCwd(invalidPath, realPathUtils, realFileUtils, realExpandPath);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('формат "/c/..." не поддерживается');
    });

    test('should reject paths starting with slash before drive letter', async () => {
      const invalidPath = '/C:/apps/project';
      const result = await validateAndResolveCwd(invalidPath, realPathUtils, realFileUtils, realExpandPath);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('путь не должен начинаться со "/" перед буквой диска');
    });

    test('should reject paths missing colon after drive letter', async () => {
      const invalidPath = 'C\\apps\\project';
      const result = await validateAndResolveCwd(invalidPath, realPathUtils, realFileUtils, realExpandPath);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('отсутствует двоеточие после буквы диска');
    });

    test('should reject non-directory paths when fileUtils is provided', async () => {
      const cwd = 'C:\\nonexistent-file.txt';

      const result = await validateAndResolveCwd(cwd, realPathUtils, realFileUtils, realExpandPath);

      // Should fail because the file doesn't exist
      expect(result.ok).toBe(false);
    });

    test('should work without fileUtils', async () => {
      const cwd = 'C:\\apps\\project';
      const result = await validateAndResolveCwd(cwd, realPathUtils, null, realExpandPath);
      expect(result.ok).toBe(true);
      expect(result.path).toBeDefined();
    });

    test('should work without pathUtils', async () => {
      const cwd = process.cwd();

      const result = await validateAndResolveCwd(cwd, null, realFileUtils, realExpandPath);

      expect(result.ok).toBe(true);
      expect(result.path).toBe(cwd);
    });

    test('should work without expandPath', async () => {
      const cwd = process.cwd();

      const result = await validateAndResolveCwd(cwd, realPathUtils, realFileUtils, null);

      expect(result.ok).toBe(true);
      expect(result.path).toBe(cwd);
    });

    test('should handle non-existent paths', async () => {
      const cwd = 'C:\\nonexistent\\path';

      const result = await validateAndResolveCwd(cwd, realPathUtils, realFileUtils, realExpandPath);

      expect(result.ok).toBe(false);
    });
  });

  describe('validateExecRunParams', () => {
    test('should validate correct parameters', () => {
      const args = {
        command: 'echo hello',
        timeout: 60,
        is_background: false,
        cwd: '/tmp'
      };

      const result = validateExecRunParams(args);

      expect(result.errors).toHaveLength(0);
      expect(result.validated).toEqual({
        command: 'echo hello',
        timeout: 60,
        is_background: false,
        cwd: '/tmp'
      });
    });

    test('should use default values for missing parameters', () => {
      const args = {
        command: 'echo hello'
      };

      const result = validateExecRunParams(args);

      expect(result.errors).toHaveLength(0);
      expect(result.validated).toEqual({
        command: 'echo hello',
        timeout: 120,
        is_background: false,
        cwd: null
      });
    });

    test('should validate command parameter', () => {
      // Missing command
      let result = validateExecRunParams({});
      expect(result.errors).toContain('command: must be a string');

      // Non-string command
      result = validateExecRunParams({ command: 123 });
      expect(result.errors).toContain('command: must be a string');

      // Empty command
      result = validateExecRunParams({ command: '' });
      expect(result.errors).toContain('command: cannot be empty');

      // Whitespace-only command
      result = validateExecRunParams({ command: '   ' });
      expect(result.errors).toContain('command: cannot be empty');

      // Valid command with whitespace
      result = validateExecRunParams({ command: '  echo hello  ' });
      expect(result.errors).toHaveLength(0);
      expect(result.validated.command).toBe('echo hello');
    });

    test('should validate timeout parameter', () => {
      // Invalid timeout types
      let result = validateExecRunParams({ command: 'echo', timeout: 'invalid' });
      expect(result.errors).toContain('timeout: must be a valid number');

      result = validateExecRunParams({ command: 'echo', timeout: NaN });
      expect(result.errors).toContain('timeout: must be a valid number');

      result = validateExecRunParams({ command: 'echo', timeout: Infinity });
      expect(result.errors).toContain('timeout: must be a valid number');

      // Non-positive timeout
      result = validateExecRunParams({ command: 'echo', timeout: 0 });
      expect(result.errors).toContain('timeout: must be positive');

      result = validateExecRunParams({ command: 'echo', timeout: -10 });
      expect(result.errors).toContain('timeout: must be positive');

      // Too large timeout
      result = validateExecRunParams({ command: 'echo', timeout: 4000 });
      expect(result.errors).toContain('timeout: cannot exceed 3600 seconds (1 hour)');

      // Valid timeout (should be floored)
      result = validateExecRunParams({ command: 'echo', timeout: 60.7 });
      expect(result.errors).toHaveLength(0);
      expect(result.validated.timeout).toBe(60);
    });

    test('should validate is_background parameter', () => {
      // Invalid boolean types
      let result = validateExecRunParams({ command: 'echo', is_background: 'true' });
      expect(result.errors).toContain('is_background: must be a boolean');

      result = validateExecRunParams({ command: 'echo', is_background: 1 });
      expect(result.errors).toContain('is_background: must be a boolean');

      // Valid boolean values
      result = validateExecRunParams({ command: 'echo', is_background: true });
      expect(result.errors).toHaveLength(0);
      expect(result.validated.is_background).toBe(true);

      result = validateExecRunParams({ command: 'echo', is_background: false });
      expect(result.errors).toHaveLength(0);
      expect(result.validated.is_background).toBe(false);
    });

    test('should validate cwd parameter', () => {
      // Invalid cwd types
      let result = validateExecRunParams({ command: 'echo', cwd: 123 });
      expect(result.errors).toContain('cwd: must be a string or null');

      result = validateExecRunParams({ command: 'echo', cwd: true });
      expect(result.errors).toContain('cwd: must be a string or null');

      // Valid cwd values
      result = validateExecRunParams({ command: 'echo', cwd: '/tmp' });
      expect(result.errors).toHaveLength(0);
      expect(result.validated.cwd).toBe('/tmp');

      result = validateExecRunParams({ command: 'echo', cwd: null });
      expect(result.errors).toHaveLength(0);
      expect(result.validated.cwd).toBe(null);

      result = validateExecRunParams({ command: 'echo', cwd: '' });
      expect(result.errors).toHaveLength(0);
      expect(result.validated.cwd).toBe('');
    });

    test('should handle multiple validation errors', () => {
      const args = {
        command: '',
        timeout: -10,
        is_background: 'yes',
        cwd: 123
      };

      const result = validateExecRunParams(args);

      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContain('command: cannot be empty');
      expect(result.errors).toContain('timeout: must be positive');
      expect(result.errors).toContain('is_background: must be a boolean');
      expect(result.errors).toContain('cwd: must be a string or null');
    });
  });
});
