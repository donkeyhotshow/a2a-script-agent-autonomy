const { 
  getLaunchDir, 
  getCurrentDir, 
  getCurrentDirSync, 
  setCurrentDir, 
  expandPath, 
  getProjectRoot, 
  getConsumerId, 
  resetInitialization 
} = require('../index.cjs');

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Mock dependencies
jest.mock('C:/apps/libs/validation/validation/validation-utils.js', () => ({
  validationUtils: {
    isString: jest.fn((val) => typeof val === 'string' && val.trim().length > 0),
  }
}));

jest.mock('../../../libs/app-framework/core/file-utils/file-system', () => ({
  FileSystemUtils: jest.fn().mockImplementation(() => ({
    resolve: jest.fn((p) => path.resolve(p)),
    join: jest.fn((...args) => path.join(...args)),
    getDirname: jest.fn((p) => path.dirname(p)),
  }))
}));

jest.mock('C:/apps/libs/error-management/error-handler/error-utils.js', () => ({
  errorUtils: {
    safeExecute: jest.fn((fn) => fn()),
  }
}));

jest.mock('C:/apps/libs/system/path-utils/index.js', () => ({
  HISTORY_CJS_PATH: 'mock-history-path'
}));

jest.mock('mock-history-path', () => ({
  SessionManager: {
    getCurrentSessionId: jest.fn(() => null),
  }
}));

describe('Workdir', () => {
  let originalCwd;
  let testDir;
  let mockSessionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    originalCwd = process.cwd();
    testDir = path.join(os.tmpdir(), `workdir-test-${Date.now()}`);
    
    // Mock SessionManager
    mockSessionManager = {
      getCurrentSessionId: jest.fn(() => null),
    };
    require('mock-history-path').SessionManager = mockSessionManager;
    
    // Reset initialization state
    resetInitialization();
  });

  afterEach(async () => {
    // Restore original working directory
    try {
      process.chdir(originalCwd);
    } catch (e) {
      // Ignore errors
    }
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('getLaunchDir', () => {
    test('should return launch directory', () => {
      const launchDir = getLaunchDir();
      expect(typeof launchDir).toBe('string');
      expect(path.isAbsolute(launchDir)).toBe(true);
    });

    test('should return consistent value', () => {
      const dir1 = getLaunchDir();
      const dir2 = getLaunchDir();
      expect(dir1).toBe(dir2);
    });
  });

  describe('expandPath', () => {
    test('should expand tilde to home directory', () => {
      const result = expandPath('~/test');
      expect(result).toBe(path.join(os.homedir(), 'test'));
    });

    test('should expand environment variables with % syntax', () => {
      const originalEnv = process.env.TEST_VAR;
      process.env.TEST_VAR = '/test/path';
      
      const result = expandPath('%TEST_VAR%/subdir');
      expect(result).toBe('/test/path/subdir');
      
      process.env.TEST_VAR = originalEnv;
    });

    test('should expand environment variables with $ syntax', () => {
      const originalEnv = process.env.TEST_VAR;
      process.env.TEST_VAR = '/test/path';
      
      const result = expandPath('$TEST_VAR/subdir');
      expect(result).toBe('/test/path/subdir');
      
      process.env.TEST_VAR = originalEnv;
    });

    test('should handle undefined environment variables', () => {
      const result = expandPath('%UNDEFINED_VAR%/test');
      expect(result).toBe('/test');
    });

    test('should handle mixed expansions', () => {
      const originalEnv = process.env.TEST_VAR;
      process.env.TEST_VAR = '/test';
      
      const result = expandPath('~/%TEST_VAR%/subdir');
      expect(result).toBe(path.join(os.homedir(), '/test', 'subdir'));
      
      process.env.TEST_VAR = originalEnv;
    });

    test('should return original path when no expansions needed', () => {
      const testPath = '/absolute/path';
      const result = expandPath(testPath);
      expect(result).toBe(testPath);
    });

    test('should handle relative paths', () => {
      const testPath = './relative/path';
      const result = expandPath(testPath);
      expect(result).toBe(testPath);
    });
  });

  describe('getCurrentDir', () => {
    test('should return current working directory', async () => {
      const currentDir = await getCurrentDir();
      expect(typeof currentDir).toBe('string');
      expect(path.isAbsolute(currentDir)).toBe(true);
    });

    test('should return consistent value', async () => {
      const dir1 = await getCurrentDir();
      const dir2 = await getCurrentDir();
      expect(dir1).toBe(dir2);
    });

    test('should handle initialization', async () => {
      // Reset to ensure initialization
      resetInitialization();
      
      const currentDir = await getCurrentDir();
      expect(typeof currentDir).toBe('string');
      expect(path.isAbsolute(currentDir)).toBe(true);
    });
  });

  describe('getCurrentDirSync', () => {
    test('should return current working directory synchronously', () => {
      const currentDir = getCurrentDirSync();
      expect(typeof currentDir).toBe('string');
      expect(path.isAbsolute(currentDir)).toBe(true);
    });

    test('should return consistent value', () => {
      const dir1 = getCurrentDirSync();
      const dir2 = getCurrentDirSync();
      expect(dir1).toBe(dir2);
    });

    test('should handle initialization synchronously', () => {
      // Reset to ensure initialization
      resetInitialization();
      
      const currentDir = getCurrentDirSync();
      expect(typeof currentDir).toBe('string');
      expect(path.isAbsolute(currentDir)).toBe(true);
    });
  });

  describe('setCurrentDir', () => {
    test('should change current directory successfully', async () => {
      // Create test directory
      await fs.mkdir(testDir, { recursive: true });
      
      const result = await setCurrentDir(testDir);
      
      expect(result.ok).toBe(true);
      expect(result.path).toBe(testDir);
      expect(process.cwd()).toBe(testDir);
    });

    test('should handle absolute paths', async () => {
      await fs.mkdir(testDir, { recursive: true });
      
      const result = await setCurrentDir(testDir);
      
      expect(result.ok).toBe(true);
      expect(result.path).toBe(testDir);
    });

    test('should handle relative paths', async () => {
      await fs.mkdir(testDir, { recursive: true });
      const subDir = path.join(testDir, 'subdir');
      await fs.mkdir(subDir, { recursive: true });
      
      process.chdir(testDir);
      const result = await setCurrentDir('./subdir');
      
      expect(result.ok).toBe(true);
      expect(process.cwd()).toBe(subDir);
    });

    test('should handle path expansion', async () => {
      await fs.mkdir(testDir, { recursive: true });
      
      const result = await setCurrentDir(testDir);
      
      expect(result.ok).toBe(true);
      expect(result.path).toBe(testDir);
    });

    test('should handle non-existent directory', async () => {
      const nonExistentDir = path.join(os.tmpdir(), 'non-existent-dir');
      
      const result = await setCurrentDir(nonExistentDir);
      
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Failed to set directory');
    });

    test('should handle permission errors', async () => {
      // Mock process.chdir to throw error
      const originalChdir = process.chdir;
      process.chdir = jest.fn().mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = await setCurrentDir('/root/protected');
      
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Failed to set directory');
      
      process.chdir = originalChdir;
    });
  });

  describe('getProjectRoot', () => {
    test('should return project root when package.json exists', async () => {
      // Create test project structure
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'package.json'), '{}');
      const subDir = path.join(testDir, 'src');
      await fs.mkdir(subDir, { recursive: true });
      
      process.chdir(subDir);
      const projectRoot = await getProjectRoot();
      
      expect(projectRoot).toBe(testDir);
    });

    test('should return project root when .git exists', async () => {
      await fs.mkdir(testDir, { recursive: true });
      await fs.mkdir(path.join(testDir, '.git'), { recursive: true });
      const subDir = path.join(testDir, 'src');
      await fs.mkdir(subDir, { recursive: true });
      
      process.chdir(subDir);
      const projectRoot = await getProjectRoot();
      
      expect(projectRoot).toBe(testDir);
    });

    test('should return current directory when no project markers found', async () => {
      await fs.mkdir(testDir, { recursive: true });
      process.chdir(testDir);
      
      const projectRoot = await getProjectRoot();
      
      expect(projectRoot).toBe(testDir);
    });

    test('should handle different project markers', async () => {
      const markers = [
        'package.json',
        '.git',
        'pyproject.toml',
        'go.mod',
        'Cargo.toml',
        'composer.json',
        'pom.xml',
        'Makefile',
        'Dockerfile'
      ];

      for (const marker of markers) {
        await fs.mkdir(testDir, { recursive: true });
        await fs.writeFile(path.join(testDir, marker), '');
        const subDir = path.join(testDir, 'src');
        await fs.mkdir(subDir, { recursive: true });
        
        process.chdir(subDir);
        const projectRoot = await getProjectRoot();
        
        expect(projectRoot).toBe(testDir);
        
        // Clean up
        await fs.rm(testDir, { recursive: true, force: true });
      }
    });

    test('should handle read errors gracefully', async () => {
      // Mock fs.readdir to throw error
      const originalReaddir = fs.readdir;
      fs.readdir = jest.fn().mockRejectedValue(new Error('Read error'));
      
      const projectRoot = await getProjectRoot();
      
      expect(projectRoot).toBe(process.cwd());
      
      fs.readdir = originalReaddir;
    });
  });

  describe('getConsumerId', () => {
    test('should return session ID when available', () => {
      const sessionId = 'test-session-123';
      mockSessionManager.getCurrentSessionId.mockReturnValue(sessionId);
      
      const consumerId = getConsumerId();
      
      expect(consumerId).toBe(sessionId);
    });

    test('should return null when no session ID', () => {
      mockSessionManager.getCurrentSessionId.mockReturnValue(null);
      
      const consumerId = getConsumerId();
      
      expect(consumerId).toBeNull();
    });

    test('should return null when session ID is empty string', () => {
      mockSessionManager.getCurrentSessionId.mockReturnValue('');
      
      const consumerId = getConsumerId();
      
      expect(consumerId).toBeNull();
    });

    test('should return null when session ID is whitespace only', () => {
      mockSessionManager.getCurrentSessionId.mockReturnValue('   ');
      
      const consumerId = getConsumerId();
      
      expect(consumerId).toBeNull();
    });
  });

  describe('resetInitialization', () => {
    test('should reset initialization state', () => {
      // First call to initialize
      getCurrentDirSync();
      
      // Reset
      resetInitialization();
      
      // Should reinitialize on next call
      const currentDir = getCurrentDirSync();
      expect(typeof currentDir).toBe('string');
      expect(path.isAbsolute(currentDir)).toBe(true);
    });

    test('should allow reinitialization with different settings', async () => {
      // Set up environment variable
      const originalEnv = process.env.MCP_WORKDIR;
      process.env.MCP_WORKDIR = testDir;
      
      await fs.mkdir(testDir, { recursive: true });
      
      // Reset and reinitialize
      resetInitialization();
      const currentDir = await getCurrentDir();
      
      expect(currentDir).toBe(testDir);
      
      process.env.MCP_WORKDIR = originalEnv;
    });
  });

  describe('Integration scenarios', () => {
    test('should handle typical workflow', async () => {
      // Create test project structure
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(path.join(testDir, 'package.json'), '{}');
      const srcDir = path.join(testDir, 'src');
      await fs.mkdir(srcDir, { recursive: true });
      
      // Set up session
      const sessionId = 'test-session-456';
      mockSessionManager.getCurrentSessionId.mockReturnValue(sessionId);
      
      // Test workflow
      const launchDir = getLaunchDir();
      expect(typeof launchDir).toBe('string');
      
      const currentDir = await getCurrentDir();
      expect(typeof currentDir).toBe('string');
      
      const projectRoot = await getProjectRoot();
      expect(projectRoot).toBe(testDir);
      
      const consumerId = getConsumerId();
      expect(consumerId).toBe(sessionId);
      
      // Change directory
      const result = await setCurrentDir(srcDir);
      expect(result.ok).toBe(true);
      expect(process.cwd()).toBe(srcDir);
    });

    test('should handle environment variable workflow', async () => {
      const originalEnv = process.env.MCP_WORKDIR;
      process.env.MCP_WORKDIR = testDir;
      
      await fs.mkdir(testDir, { recursive: true });
      
      resetInitialization();
      const currentDir = await getCurrentDir();
      
      expect(currentDir).toBe(testDir);
      
      process.env.MCP_WORKDIR = originalEnv;
    });

    test('should handle path expansion workflow', async () => {
      const originalEnv = process.env.TEST_PATH;
      process.env.TEST_PATH = testDir;
      
      await fs.mkdir(testDir, { recursive: true });
      
      const expandedPath = expandPath('%TEST_PATH%/subdir');
      expect(expandedPath).toBe(path.join(testDir, 'subdir'));
      
      const result = await setCurrentDir(expandedPath);
      expect(result.ok).toBe(true);
      
      process.env.TEST_PATH = originalEnv;
    });

    test('should handle error recovery', async () => {
      // Test with invalid directory
      const result = await setCurrentDir('/non/existent/path');
      expect(result.ok).toBe(false);
      
      // Should still be able to get current directory
      const currentDir = await getCurrentDir();
      expect(typeof currentDir).toBe('string');
      expect(path.isAbsolute(currentDir)).toBe(true);
    });
  });
});
