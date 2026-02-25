const { FsCommands } = require('../index.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Real dependencies - no mocks needed
const { getCurrentDir, expandPath } = require('C:/apps/libs/system/workdir/index.cjs');
const { getFsSandboxRoot, isFsReadonly } = require('C:/apps/libs/system/runtime-mode/index.cjs');

describe('FsCommands', () => {
  let fsCommands;
  let realLogger;
  let realErrorHandler;
  let realPathUtils;
  let realRuntimeModeUtils;
  let testDir;
  let testFile;

  beforeAll(() => {
    testDir = path.join(os.tmpdir(), `fs-commands-test-${Date.now()}`);
    testFile = path.join(testDir, 'test.txt');

    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    realLogger = console;
    realErrorHandler = {
      handle: (error, context) => console.error(`[${context}] Error:`, error.message)
    };
    realPathUtils = { getCurrentDir, expandPath };
    realRuntimeModeUtils = { getFsSandboxRoot, isFsReadonly };
  });

  beforeEach(() => {
    // Clean up test files between tests
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    // Create real FsCommands instance
    fsCommands = new FsCommands(realLogger, realErrorHandler, realPathUtils, realRuntimeModeUtils);

    // Create test directory and file if needed
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    fs.writeFileSync(testFile, 'Hello, World!\nThis is a test file.\nLine 3.');
  });

  afterEach(() => {
    // Clean up test files
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('constructor', () => {
    test('should initialize with dependencies', () => {
      expect(fsCommands.logger).toBe(realLogger);
      expect(fsCommands.errorHandler).toBe(realErrorHandler);
      expect(fsCommands.pathUtils).toBe(realPathUtils);
      expect(fsCommands.runtimeModeUtils).toBe(realRuntimeModeUtils);
    });
  });

  describe('resolvePath', () => {
    test('should resolve path using pathUtils', () => {
      const result = fsCommands.resolvePath('test.txt');
      expect(result).toBe(path.resolve(testDir, 'test.txt'));
    });
  });

  describe('isInside', () => {
    test('should return true for child inside parent', () => {
      const parent = '/parent/dir';
      const child = '/parent/dir/child/file.txt';
      expect(fsCommands.isInside(parent, child)).toBe(true);
    });

    test('should return false for child outside parent', () => {
      const parent = '/parent/dir';
      const child = '/other/dir/file.txt';
      expect(fsCommands.isInside(parent, child)).toBe(false);
    });

    test('should return false for same path', () => {
      const parent = '/parent/dir';
      const child = '/parent/dir';
      expect(fsCommands.isInside(parent, child)).toBe(false);
    });

    test('should return false for invalid paths', () => {
      expect(fsCommands.isInside('invalid', 'path')).toBe(false);
    });
  });

  describe('ensureWritableTarget', () => {
    test('should return ok when not readonly and no sandbox', () => {
      const result = fsCommands.ensureWritableTarget('/test/path');
      expect(result.ok).toBe(true);
    });

    test('should return error when readonly mode', () => {
      // Create FsCommands instance with readonly mode
      const readonlyRuntimeModeUtils = {
        getFsSandboxRoot: () => null,
        isFsReadonly: () => true
      };
      const readonlyFsCommands = new FsCommands(realLogger, realErrorHandler, realPathUtils, readonlyRuntimeModeUtils);

      const result = readonlyFsCommands.ensureWritableTarget('/test/path');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('FS в readonly режиме: запись запрещена');
    });

    test('should return error when target outside sandbox', () => {
      // Create FsCommands instance with sandbox
      const sandboxRuntimeModeUtils = {
        getFsSandboxRoot: () => '/sandbox',
        isFsReadonly: () => false
      };
      const sandboxFsCommands = new FsCommands(realLogger, realErrorHandler, realPathUtils, sandboxRuntimeModeUtils);

      const result = sandboxFsCommands.ensureWritableTarget('/outside/path');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Запись разрешена только в песочницу');
    });

    test('should return ok when target inside sandbox', () => {
      // Create FsCommands instance with sandbox
      const sandboxRuntimeModeUtils = {
        getFsSandboxRoot: () => '/sandbox',
        isFsReadonly: () => false
      };
      const sandboxFsCommands = new FsCommands(realLogger, realErrorHandler, realPathUtils, sandboxRuntimeModeUtils);

      const result = sandboxFsCommands.ensureWritableTarget('/sandbox/inside/path');
      expect(result.ok).toBe(true);
    });
  });

  describe('listDirectory', () => {
    test('should list directory contents', async () => {
      const result = await fsCommands.listDirectory('.');
      
      expect(result.success).toBe(true);
      expect(result.path).toBe(testDir);
      expect(result.entries.length).toBeGreaterThan(0);
      
      const testFileEntry = result.entries.find(entry => entry.name === 'test.txt');
      expect(testFileEntry).toBeDefined();
      expect(testFileEntry.type).toBe('file');
    });

    test('should list directory recursively', async () => {
      const subDir = path.join(testDir, 'subdir');
      const subFile = path.join(subDir, 'subfile.txt');
      fs.mkdirSync(subDir);
      fs.writeFileSync(subFile, 'subfile content');

      const result = await fsCommands.listDirectory('.', true);

      expect(result.success).toBe(true);
      expect(result.entries.length).toBeGreaterThan(1); // Should include both files

      const subFileEntry = result.entries.find(entry => entry.name === 'subfile.txt');
      expect(subFileEntry).toBeDefined();
      expect(subFileEntry.type).toBe('file');
    });

    test('should handle directory not found', async () => {
      const result = await fsCommands.listDirectory('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('readFileContent', () => {
    test('should read entire file', async () => {
      const result = await fsCommands.readFileContent('test.txt');
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Hello, World!\nThis is a test file.\nLine 3.');
      expect(result.lines).toBe(3);
    });

    test('should read file with line range', async () => {
      const result = await fsCommands.readFileContent('test.txt', 1, 2);
      
      expect(result.success).toBe(true);
      expect(result.content).toBe('Hello, World!\nThis is a test file.');
      expect(result.lines).toBe(2);
    });

    test('should handle non-existent file', async () => {
      const result = await fsCommands.readFileContent('nonexistent.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Файл не существует');
    });

    test('should handle directory as file', async () => {
      const result = await fsCommands.readFileContent('.');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Не является файлом');
    });

    test('should handle invalid line range', async () => {
      const result = await fsCommands.readFileContent('test.txt', 5, 10);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Некорректный диапазон строк');
    });

    test('should handle read errors', async () => {
      // Test with a file that might cause read errors (create and delete quickly)
      const tempFile = path.join(testDir, 'temp-read-error.txt');
      fs.writeFileSync(tempFile, 'temp content');
      fs.unlinkSync(tempFile); // Delete file before reading

      const result = await fsCommands.readFileContent('temp-read-error.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('writeFileContent', () => {
    test('should write file content', async () => {
      const content = 'New content';
      const result = await fsCommands.writeFileContent('newfile.txt', content);
      
      expect(result.success).toBe(true);
      expect(result.path).toBe(path.join(testDir, 'newfile.txt'));
      expect(result.bytesWritten).toBe(content.length);
      
      const readResult = await fsCommands.readFileContent('newfile.txt');
      expect(readResult.content).toBe(content);
    });

    test('should append to existing file', async () => {
      const appendContent = '\nAppended content';
      const result = await fsCommands.writeFileContent('test.txt', appendContent, 'append');
      
      expect(result.success).toBe(true);
      
      const readResult = await fsCommands.readFileContent('test.txt');
      expect(readResult.content).toBe('Hello, World!\nThis is a test file.\nLine 3.\nAppended content');
    });

    test('should create directory if not exists', async () => {
      const content = 'Content in subdir';
      const result = await fsCommands.writeFileContent('subdir/file.txt', content);
      
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'subdir'))).toBe(true);
    });

    test('should handle readonly mode', async () => {
      // Create FsCommands instance with readonly mode
      const readonlyRuntimeModeUtils = {
        getFsSandboxRoot: () => null,
        isFsReadonly: () => true
      };
      const readonlyFsCommands = new FsCommands(realLogger, realErrorHandler, realPathUtils, readonlyRuntimeModeUtils);

      const result = await readonlyFsCommands.writeFileContent('test.txt', 'content');

      expect(result.success).toBe(false);
      expect(result.error).toBe('FS в readonly режиме: запись запрещена');
    });

    test('should handle write errors', async () => {
      // Create a directory instead of a file to cause write error
      const dirAsFile = 'directory-as-file.txt';
      fs.mkdirSync(path.join(testDir, dirAsFile));

      const result = await fsCommands.writeFileContent(dirAsFile, 'content');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      fs.rmdirSync(path.join(testDir, dirAsFile));
    });
  });

  describe('copyPath', () => {
    test('should copy file', async () => {
      const destFile = 'copy.txt';
      const result = await fsCommands.copyPath('test.txt', destFile);
      
      expect(result.success).toBe(true);
      expect(result.source).toBe(testFile);
      expect(result.destination).toBe(path.join(testDir, destFile));
      
      const readResult = await fsCommands.readFileContent(destFile);
      expect(readResult.content).toBe('Hello, World!\nThis is a test file.\nLine 3.');
    });

    test('should handle readonly mode', async () => {
      // Create FsCommands instance with readonly mode
      const readonlyRuntimeModeUtils = {
        getFsSandboxRoot: () => null,
        isFsReadonly: () => true
      };
      const readonlyFsCommands = new FsCommands(realLogger, realErrorHandler, realPathUtils, readonlyRuntimeModeUtils);

      const result = await readonlyFsCommands.copyPath('test.txt', 'copy.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('FS в readonly режиме: запись запрещена');
    });

    test('should handle copy errors', async () => {
      const result = await fsCommands.copyPath('nonexistent.txt', 'copy.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('movePath', () => {
    test('should move file', async () => {
      const destFile = 'moved.txt';
      const result = await fsCommands.movePath('test.txt', destFile);
      
      expect(result.success).toBe(true);
      expect(result.source).toBe(testFile);
      expect(result.destination).toBe(path.join(testDir, destFile));
      
      // Original file should not exist
      const originalExists = fs.existsSync(testFile);
      expect(originalExists).toBe(false);
      
      // Moved file should exist
      const readResult = await fsCommands.readFileContent(destFile);
      expect(readResult.content).toBe('Hello, World!\nThis is a test file.\nLine 3.');
    });

    test('should handle readonly mode', async () => {
      // Create FsCommands instance with readonly mode
      const readonlyRuntimeModeUtils = {
        getFsSandboxRoot: () => null,
        isFsReadonly: () => true
      };
      const readonlyFsCommands = new FsCommands(realLogger, realErrorHandler, realPathUtils, readonlyRuntimeModeUtils);

      const result = await readonlyFsCommands.movePath('test.txt', 'moved.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('FS в readonly режиме: запись запрещена');
    });

    test('should handle move errors', async () => {
      const result = await fsCommands.movePath('nonexistent.txt', 'moved.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

    });
  });

  describe('deletePath', () => {
    test('should delete file', async () => {
      const result = await fsCommands.deletePath('test.txt');
      
      expect(result.success).toBe(true);
      expect(result.path).toBe(testFile);
      
      const fileExists = fs.existsSync(testFile);
      expect(fileExists).toBe(false);
    });

    test('should delete directory recursively', async () => {
      const subDir = path.join(testDir, 'subdir');
      const subFile = path.join(subDir, 'subfile.txt');
      fs.mkdirSync(subDir);
      fs.writeFileSync(subFile, 'subfile content');

      const result = await fsCommands.deletePath('subdir', true);
      
      expect(result.success).toBe(true);
      expect(result.path).toBe(subDir);
      
      const dirExists = fs.existsSync(subDir);
      expect(dirExists).toBe(false);
    });

    test('should handle non-existent path', async () => {
      const result = await fsCommands.deletePath('nonexistent.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Путь не существует');
    });

    test('should handle readonly mode', async () => {
      // Create FsCommands instance with readonly mode
      const readonlyRuntimeModeUtils = {
        getFsSandboxRoot: () => null,
        isFsReadonly: () => true
      };
      const readonlyFsCommands = new FsCommands(realLogger, realErrorHandler, realPathUtils, readonlyRuntimeModeUtils);

      const result = await readonlyFsCommands.deletePath('test.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBe('FS в readonly режиме: запись запрещена');
    });

    test('should handle delete errors', async () => {
      // Try to delete a directory as if it were a file (should cause error)
      const dirPath = path.join(testDir, 'delete-test-dir');
      fs.mkdirSync(dirPath);

      const result = await fsCommands.deletePath('delete-test-dir');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      fs.rmdirSync(dirPath);
    });
  });
});
