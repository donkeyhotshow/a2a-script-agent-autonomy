const path = require('path');
const { TestFileAnalyzer } = require('../../test-file-analyzer');
const { FileSystemUtils } = require('@libs/system/file-operations');

describe('TestFileAnalyzer', () => {
  let testFileAnalyzer;
  let mockFileSystemUtils;
  let loggerSpy;

  beforeEach(() => {
    mockFileSystemUtils = {
      exists: jest.fn(),
      readdir: jest.fn(),
      readFile: jest.fn(),
      join: path.join, // Use actual path.join for join operations
    };
    loggerSpy = {
      info: jest.fn(),
      error: jest.fn(),
    };

    testFileAnalyzer = new TestFileAnalyzer({
      logger: loggerSpy,
      workingDir: '/app',
      fileSystemUtils: mockFileSystemUtils,
    });
  });

  describe('findTestFiles', () => {
    it('should find test files in specified directories', async () => {
      mockFileSystemUtils.exists.mockResolvedValue(true);
      mockFileSystemUtils.readdir.mockImplementation((dir) => {
        if (dir === '/app/tests') {
          return Promise.resolve([
            { name: 'test1.test.js', isDirectory: () => false },
            { name: 'subdir', isDirectory: () => true },
          ]);
        } else if (dir === '/app/tests/subdir') {
          return Promise.resolve([
            { name: 'test2.test.ts', isDirectory: () => false },
          ]);
        } else if (dir === '/app/libs') {
            return Promise.resolve([
                { name: 'lib1', isDirectory: () => true}
            ]);
        } else if (dir === '/app/libs/lib1') {
            return Promise.resolve([
                { name: 'index.js', isDirectory: () => false},
                { name: 'lib1.test.js', isDirectory: () => false}
            ]);
        }
        return Promise.resolve([]);
      });

      const files = await testFileAnalyzer.findTestFiles();
      expect(files).toEqual([
        path.join('/app', 'tests', 'test1.test.js'),
        path.join('/app', 'tests', 'subdir', 'test2.test.ts'),
        path.join('/app', 'libs', 'lib1', 'lib1.test.js'),
      ]);
      expect(loggerSpy.info).toHaveBeenCalledWith('Поиск тестовых файлов...');
      expect(loggerSpy.info).toHaveBeenCalledWith('Найдено 3 тестовых файлов');
    });

    it('should handle non-existent search directories', async () => {
      mockFileSystemUtils.exists.mockResolvedValue(false);
      mockFileSystemUtils.readdir.mockResolvedValue([]);

      const files = await testFileAnalyzer.findTestFiles();
      expect(files).toEqual([]);
      expect(loggerSpy.info).toHaveBeenCalledWith('Найдено 0 тестовых файлов');
    });
  });

  describe('recursiveFindFiles', () => {
    it('should recursively find files matching the pattern and ignore specified directories', async () => {
      mockFileSystemUtils.readdir.mockImplementation((dir) => {
        if (dir === '/app/root') {
          return Promise.resolve([
            { name: 'file1.js', isDirectory: () => false },
            { name: 'folder1', isDirectory: () => true },
            { name: 'node_modules', isDirectory: () => true }, // Should be ignored
          ]);
        } else if (dir === '/app/root/folder1') {
          return Promise.resolve([
            { name: 'test.test.js', isDirectory: () => false },
            { name: 'file2.ts', isDirectory: () => false },
          ]);
        }
        return Promise.resolve([]);
      });

      const files = await testFileAnalyzer.recursiveFindFiles('/app/root', /\.test\.(js|ts)$/);
      expect(files).toEqual([
        path.join('/app', 'root', 'folder1', 'test.test.js'),
      ]);
    });

    it('should return an empty array if no files match', async () => {
      mockFileSystemUtils.readdir.mockResolvedValue([
        { name: 'file1.js', isDirectory: () => false },
        { name: 'folder1', isDirectory: () => true },
      ]);
      const files = await testFileAnalyzer.recursiveFindFiles('/app/root', /\.spec\.js$/);
      expect(files).toEqual([]);
    });
  });

  describe('extractTestDependencies', () => {
    it('should extract require and import dependencies', async () => {
      const testFileContent = `
        const dep1 = require('./dep1');
        import { dep2 } from '../dep2';
        const dep3 = require('external-lib');
        import 'external-lib2';
      `;
      mockFileSystemUtils.readFile.mockResolvedValue(testFileContent);

      const dependencies = await testFileAnalyzer.extractTestDependencies('/app/tests/my-test.test.js');
      expect(dependencies).toEqual([
        path.resolve('/app/tests', './dep1'),
        path.resolve('/app/tests', '../dep2'),
      ]);
    });

    it('should handle errors during file reading', async () => {
      mockFileSystemUtils.readFile.mockRejectedValue(new Error('File not found'));

      const dependencies = await testFileAnalyzer.extractTestDependencies('/app/tests/non-existent.test.js');
      expect(dependencies).toEqual([]);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Ошибка анализа зависимостей для /app/tests/non-existent.test.js:',
        'File not found'
      );
    });

    it('should return empty array if no dependencies are found', async () => {
      const testFileContent = `console.log('No dependencies here');`;
      mockFileSystemUtils.readFile.mockResolvedValue(testFileContent);

      const dependencies = await testFileAnalyzer.extractTestDependencies('/app/tests/empty.test.js');
      expect(dependencies).toEqual([]);
    });
  });

  describe('hasDependencyChanges', () => {
    it('should return true if any dependency has changed', () => {
      const testFile = '/app/tests/my-test.test.js';
      const fileChanges = new Set(['/app/dep1.js']);
      const dependencies = new Map([
        [testFile, ['/app/dep1.js', '/app/dep2.js']],
      ]);

      const hasChanges = testFileAnalyzer.hasDependencyChanges(testFile, fileChanges, dependencies);
      expect(hasChanges).toBe(true);
    });

    it('should return false if no dependencies have changed', () => {
      const testFile = '/app/tests/my-test.test.js';
      const fileChanges = new Set(['/app/other-file.js']);
      const dependencies = new Map([
        [testFile, ['/app/dep1.js', '/app/dep2.js']],
      ]);

      const hasChanges = testFileAnalyzer.hasDependencyChanges(testFile, fileChanges, dependencies);
      expect(hasChanges).toBe(false);
    });

    it('should return false if test file has no dependencies', () => {
      const testFile = '/app/tests/my-test.test.js';
      const fileChanges = new Set(['/app/dep1.js']);
      const dependencies = new Map([
        [testFile, []],
      ]);

      const hasChanges = testFileAnalyzer.hasDependencyChanges(testFile, fileChanges, dependencies);
      expect(hasChanges).toBe(false);
    });

    it('should return false if test file is not in dependencies map', () => {
      const testFile = '/app/tests/my-test.test.js';
      const fileChanges = new Set(['/app/dep1.js']);
      const dependencies = new Map();

      const hasChanges = testFileAnalyzer.hasDependencyChanges(testFile, fileChanges, dependencies);
      expect(hasChanges).toBe(false);
    });
  });
});
