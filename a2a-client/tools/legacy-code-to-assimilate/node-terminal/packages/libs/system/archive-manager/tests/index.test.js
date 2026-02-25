const { archiveFiles, getArchiveInfo, searchArchive, ARCHIVE_ROOT, SOURCE_ROOT } = require('../index.cjs');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock dependencies
const mockWorkdir = require('C:/apps/libs/system/workdir/index.cjs');
const mockRuntimeMode = require('C:/apps/libs/system/runtime-mode/index.cjs');

jest.mock('C:/apps/libs/system/workdir/index.cjs', () => ({
  getCurrentDir: jest.fn(() => '/tmp/mock-dir'),
  expandPath: jest.fn((p) => p),
}));

jest.mock('C:/apps/libs/system/runtime-mode/index.cjs', () => ({
  isReadonly: jest.fn(() => false),
}));

describe('ArchiveManager', () => {
  let consoleErrorSpy;
  let mockSourceRoot;
  let mockArchiveRoot;
  let tempTestDir;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    tempTestDir = path.join(os.tmpdir(), `archive-test-${Date.now()}`);
    mockSourceRoot = path.join(tempTestDir, 'source');
    mockArchiveRoot = path.join(tempTestDir, '_archive');

    // Dynamically update ARCHIVE_ROOT and SOURCE_ROOT for the current test run
    Object.defineProperty(require('../index.cjs'), 'ARCHIVE_ROOT', { value: mockArchiveRoot });
    Object.defineProperty(require('../index.cjs'), 'SOURCE_ROOT', { value: mockSourceRoot });

    fs.existsSync = jest.fn(() => true);
    fs.mkdirSync = jest.fn(() => {});
    fs.copyFileSync = jest.fn(() => {});
    fs.statSync = jest.fn(() => ({ size: 100, mtime: new Date() }));
    fs.readdirSync = jest.fn(() => []);

    // Setup mock for getCurrentDir and expandPath if not already done by jest.mock
    mockWorkdir.getCurrentDir.mockReturnValue(mockSourceRoot);
    mockWorkdir.expandPath.mockImplementation(p => p);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    try {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  // Test utility functions (resolvePath, ensureWritableTarget, etc.)
  describe('Utility Functions', () => {
    const { resolvePath, ensureWritableTarget, generateUniqueFileName, getRelativeFromAppsRoot, createArchivePath } = require('../index.cjs');

    test('resolvePath should resolve path correctly', () => {
      mockWorkdir.getCurrentDir.mockReturnValue('/base');
      mockWorkdir.expandPath.mockReturnValue('sub/file.txt');
      expect(resolvePath('sub/file.txt')).toBe(path.resolve('/base', 'sub/file.txt'));
    });

    describe('ensureWritableTarget', () => {
      test('should return ok for writable target in archive mode', () => {
        const result = ensureWritableTarget(path.join(mockArchiveRoot, 'file.txt'));
        expect(result.ok).toBe(true);
      });

      test('should return error in readonly mode', () => {
        mockRuntimeMode.isReadonly.mockReturnValueOnce(true);
        const result = ensureWritableTarget(path.join(mockArchiveRoot, 'file.txt'));
        expect(result.ok).toBe(false);
        expect(result.error).toBe('FS в readonly режиме: запись запрещена');
      });

      test('should return error if target is outside archive root', () => {
        const result = ensureWritableTarget(path.join(mockSourceRoot, 'file.txt'));
        expect(result.ok).toBe(false);
        expect(result.error).toContain('Запись разрешена только в архив');
      });
    });

    test('generateUniqueFileName should create unique file name', () => {
      const originalPath = '/a/b/file.txt';
      const archivePath = path.join(mockArchiveRoot, 'file.txt');
      fs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(true).mockReturnValue(false);

      const uniquePath = generateUniqueFileName(originalPath, archivePath);
      expect(uniquePath).toBe(path.join(mockArchiveRoot, 'file_2.txt'));
    });

    describe('getRelativeFromAppsRoot', () => {
      test('should return relative path from SOURCE_ROOT', () => {
        const filePath = path.join(mockSourceRoot, 'sub', 'file.txt');
        expect(getRelativeFromAppsRoot(filePath)).toBe(path.join('sub', 'file.txt'));
      });

      test('should throw error if file is not in SOURCE_ROOT', () => {
        const filePath = '/another/path/file.txt';
        expect(() => getRelativeFromAppsRoot(filePath)).toThrow('Файл /another/path/file.txt не находится в директории');
      });
    });

    test('createArchivePath should create path under ARCHIVE_ROOT', () => {
      const relativePath = path.join('sub', 'file.txt');
      expect(createArchivePath(relativePath)).toBe(path.join(mockArchiveRoot, 'sub', 'file.txt'));
    });
  });

  describe('archiveFiles', () => {
    test('should archive a single file successfully', async () => {
      const filePath = path.join(mockSourceRoot, 'test-file.txt');
      fs.existsSync.mockImplementation((p) => p === filePath || p === mockArchiveRoot || p === path.dirname(path.join(mockArchiveRoot, 'test-file.txt')));
      fs.mkdirSync.mockImplementation(() => {});
      fs.copyFileSync.mockImplementation(() => {});
      fs.statSync.mockReturnValue({ size: 123, mtime: new Date() });
      mockWorkdir.getCurrentDir.mockReturnValue(mockSourceRoot);

      const result = await archiveFiles([filePath]);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.results[0].success).toBe(true);
      expect(fs.copyFileSync).toHaveBeenCalledWith(filePath, path.join(mockArchiveRoot, 'test-file.txt'));
    });

    test('should handle non-existent file', async () => {
      fs.existsSync.mockReturnValue(false);
      const result = await archiveFiles(['nonexistent.txt']);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toBe('Файл не существует');
    });

    test('should handle file outside SOURCE_ROOT', async () => {
      const filePath = '/outside/test-file.txt';
      fs.existsSync.mockReturnValueOnce(true);
      mockWorkdir.getCurrentDir.mockReturnValue('/tmp');

      const result = await archiveFiles([filePath]);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toContain('не находится в директории');
    });

    test('should handle readonly mode', async () => {
      const filePath = path.join(mockSourceRoot, 'test-file.txt');
      fs.existsSync.mockImplementation((p) => p === filePath || p === mockArchiveRoot || p === path.dirname(path.join(mockArchiveRoot, 'test-file.txt')));
      mockRuntimeMode.isReadonly.mockReturnValueOnce(true);

      const result = await archiveFiles([filePath]);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toBe('FS в readonly режиме: запись запрещена');
    });

    test('should handle archiving error', async () => {
      const filePath = path.join(mockSourceRoot, 'test-file.txt');
      fs.existsSync.mockReturnValueOnce(true);
      fs.copyFileSync.mockImplementationOnce(() => { throw new Error('Copy failed'); });

      const result = await archiveFiles([filePath]);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toBe('Copy failed');
    });
  });

  describe('getArchiveInfo', () => {
    test('should return archive info successfully', async () => {
      fs.existsSync.mockImplementation((p) => p === mockArchiveRoot);
      fs.statSync.mockReturnValue({ mtime: new Date('2023-01-01') });
      fs.readdirSync.mockImplementation((dir, options) => {
        if (dir === mockArchiveRoot) return [{ name: 'file1.txt', isDirectory: () => false, isFile: () => true }];
        return [];
      });
      
      const result = await getArchiveInfo();

      expect(result.success).toBe(true);
      expect(result.archiveRoot).toBe(mockArchiveRoot);
      expect(result.totalFiles).toBe(1);
      expect(result.files[0].name).toBe('file1.txt');
    });

    test('should return error if archive directory does not exist', async () => {
      fs.existsSync.mockReturnValue(false);
      const result = await getArchiveInfo();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Архивная директория не существует');
    });

    test('should handle error during archive info retrieval', async () => {
      fs.existsSync.mockReturnValueOnce(true);
      fs.statSync.mockImplementationOnce(() => { throw new Error('Stat failed'); });

      const result = await getArchiveInfo();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stat failed');
    });
  });

  describe('searchArchive', () => {
    beforeEach(() => {
      fs.existsSync.mockImplementation((p) => p === mockArchiveRoot);
      fs.readdirSync.mockImplementation((dir, options) => {
        if (dir === mockArchiveRoot) return [
          { name: 'document.txt', isDirectory: () => false, isFile: () => true },
          { name: 'image.jpg', isDirectory: () => false, isFile: () => true },
          { name: 'sub_dir', isDirectory: () => true, isFile: () => false },
        ];
        if (dir === path.join(mockArchiveRoot, 'sub_dir')) return [
          { name: 'another_doc.pdf', isDirectory: () => false, isFile: () => true },
        ];
        return [];
      });
      fs.statSync.mockReturnValue({ size: 100, mtime: new Date() });
    });

    test('should find files matching query case-insensitively', async () => {
      const result = await searchArchive('doc');
      expect(result.success).toBe(true);
      expect(result.found).toBe(2);
      expect(result.results[0].name).toBe('document.txt');
      expect(result.results[1].name).toBe('another_doc.pdf');
    });

    test('should find files matching query case-sensitively', async () => {
      const result = await searchArchive('doc', { caseSensitive: true });
      expect(result.success).toBe(true);
      expect(result.found).toBe(1);
      expect(result.results[0].name).toBe('document.txt');
    });

    test('should limit number of results', async () => {
      const result = await searchArchive('doc', { maxResults: 1 });
      expect(result.success).toBe(true);
      expect(result.found).toBe(1);
      expect(result.results).toHaveLength(1);
    });

    test('should return empty results if nothing found', async () => {
      const result = await searchArchive('nonexistent');
      expect(result.success).toBe(true);
      expect(result.found).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    test('should return error if archive directory does not exist', async () => {
      fs.existsSync.mockReturnValue(false);
      const result = await searchArchive('query');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Архивная директория не существует');
    });

    test('should handle error during archive search', async () => {
      fs.existsSync.mockReturnValueOnce(true);
      fs.readdirSync.mockImplementationOnce(() => { throw new Error('Read dir error'); });

      const result = await searchArchive('query');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Read dir error');
    });
  });

  describe('Exported Constants', () => {
    test('ARCHIVE_ROOT should be defined', () => {
      expect(ARCHIVE_ROOT).toBe(mockArchiveRoot);
    });

    test('SOURCE_ROOT should be defined', () => {
      expect(SOURCE_ROOT).toBe(mockSourceRoot);
    });
  });
});
