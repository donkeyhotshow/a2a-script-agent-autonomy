/**
 * PathUtils - Unit Tests
 * Тестирование утилит для работы с путями и файловой системой
 */

const { PathUtils } = require('../index.cjs');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Mock logger for testing
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
};

describe('PathUtils', () => {
    let pathUtils;
    let testDir;
    let testFile;

    beforeEach(() => {
        pathUtils = new PathUtils(mockLogger);
        testDir = path.join(os.tmpdir(), 'path-utils-test-' + Date.now());
        testFile = path.join(testDir, 'test.txt');

        // Clear all mocks
        jest.clearAllMocks();
    });

    afterEach(async () => {
        // Cleanup test files
        try {
            await pathUtils.remove(testDir);
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Constructor', () => {
        test('should create instance with default logger', () => {
            const defaultPathUtils = new PathUtils();
            expect(defaultPathUtils).toBeDefined();
            expect(defaultPathUtils.logger).toBe(console);
        });

        test('should create instance with custom logger', () => {
            expect(pathUtils).toBeDefined();
            expect(pathUtils.logger).toBe(mockLogger);
        });
    });

    describe('Path Operations', () => {
        test('getDirname should return directory name', () => {
            const result = pathUtils.getDirname('/path/to/file.txt');
            expect(result).toBe('/path/to');
        });

        test('join should combine paths correctly', () => {
            const result = pathUtils.join('path', 'to', 'file.txt');
            expect(result).toBe(path.join('path', 'to', 'file.txt'));
        });

        test('resolve should resolve to absolute path', () => {
            const result = pathUtils.resolve('test.txt');
            expect(path.isAbsolute(result)).toBe(true);
        });

        test('getRelativePath should return relative path', () => {
            const result = pathUtils.getRelativePath('/path/to', '/path/to/file.txt');
            expect(result).toBe('file.txt');
        });

        test('isAbsolute should detect absolute paths', () => {
            expect(pathUtils.isAbsolute('/absolute/path')).toBe(true);
            expect(pathUtils.isAbsolute('relative/path')).toBe(false);
        });

        test('getExtension should return file extension', () => {
            expect(pathUtils.getExtension('file.txt')).toBe('.txt');
            expect(pathUtils.getExtension('file.js')).toBe('.js');
            expect(pathUtils.getExtension('file')).toBe('');
        });

        test('getBasename should return filename without extension', () => {
            expect(pathUtils.getBasename('file.txt')).toBe('file');
            expect(pathUtils.getBasename('/path/file.txt')).toBe('file');
        });

        test('getFilename should return full filename', () => {
            expect(pathUtils.getFilename('/path/file.txt')).toBe('file.txt');
            expect(pathUtils.getFilename('file.txt')).toBe('file.txt');
        });

        test('normalize should normalize path', () => {
            const result = pathUtils.normalize('path//to///file.txt');
            expect(result).toBe(path.normalize('path//to///file.txt'));
        });
    });

    describe('File System Operations', () => {
        test('existsSync should check file existence', async () => {
            // Create test directory and file
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'test content');

            expect(pathUtils.existsSync(testFile)).toBe(true);
            expect(pathUtils.existsSync(path.join(testDir, 'nonexistent.txt'))).toBe(false);
        });

        test('readFileSync should read file content', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'test content');

            const content = pathUtils.readFileSync(testFile);
            expect(content).toBe('test content');
        });

        test('writeFileSync should write file content', async () => {
            await pathUtils.ensureDir(testDir);
            pathUtils.writeFileSync(testFile, 'test content');

            const content = await fs.readFile(testFile, 'utf8');
            expect(content).toBe('test content');
        });

        test('appendFileSync should append to file', async () => {
            await pathUtils.ensureDir(testDir);
            pathUtils.writeFileSync(testFile, 'initial');
            pathUtils.appendFileSync(testFile, ' appended');

            const content = await fs.readFile(testFile, 'utf8');
            expect(content).toBe('initial appended');
        });

        test('statSync should return file stats', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'test content');

            const stats = pathUtils.statSync(testFile);
            expect(stats.isFile()).toBe(true);
            expect(stats.size).toBeGreaterThan(0);
        });

        test('readdirSync should list directory contents', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'test');
            await pathUtils.writeFile(path.join(testDir, 'test2.txt'), 'test2');

            const files = pathUtils.readdirSync(testDir);
            expect(files).toContain('test.txt');
            expect(files).toContain('test2.txt');
        });
    });

    describe('Async File Operations', () => {
        test('exists should check file existence asynchronously', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'test');

            expect(await pathUtils.exists(testFile)).toBe(true);
            expect(await pathUtils.exists(path.join(testDir, 'nonexistent.txt'))).toBe(false);
        });

        test('readFile should read file content asynchronously', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'async test content');

            const content = await pathUtils.readFile(testFile);
            expect(content).toBe('async test content');
        });

        test('writeFile should write file content asynchronously', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'async write test');

            const content = await fs.readFile(testFile, 'utf8');
            expect(content).toBe('async write test');
        });

        test('appendFile should append to file asynchronously', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'async');
            await pathUtils.appendFile(testFile, ' append');

            const content = await fs.readFile(testFile, 'utf8');
            expect(content).toBe('async append');
        });

        test('stat should return file stats asynchronously', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'stat test');

            const stats = await pathUtils.stat(testFile);
            expect(stats.isFile()).toBe(true);
        });

        test('readdir should list directory contents asynchronously', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'test1');
            await pathUtils.writeFile(path.join(testDir, 'test2.txt'), 'test2');

            const entries = await pathUtils.readdir(testDir);
            expect(entries.length).toBeGreaterThanOrEqual(2);
            expect(entries.some(entry => entry.name === 'test.txt')).toBe(true);
        });
    });

    describe('Directory Operations', () => {
        test('ensureDirSync should create directory recursively', () => {
            const nestedDir = path.join(testDir, 'nested', 'deep');
            pathUtils.ensureDirSync(nestedDir);

            expect(pathUtils.existsSync(nestedDir)).toBe(true);
        });

        test('ensureDir should create directory asynchronously', async () => {
            const nestedDir = path.join(testDir, 'async', 'nested');
            await pathUtils.ensureDir(nestedDir);

            expect(await pathUtils.exists(nestedDir)).toBe(true);
        });
    });

    describe('File Operations', () => {
        test('copyFile should copy files', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'copy test');

            const copyPath = path.join(testDir, 'copy.txt');
            await pathUtils.copyFile(testFile, copyPath);

            expect(await pathUtils.exists(copyPath)).toBe(true);
            const content = await pathUtils.readFile(copyPath);
            expect(content).toBe('copy test');
        });

        test('moveFile should move/rename files', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'move test');

            const movePath = path.join(testDir, 'moved.txt');
            await pathUtils.moveFile(testFile, movePath);

            expect(await pathUtils.exists(testFile)).toBe(false);
            expect(await pathUtils.exists(movePath)).toBe(true);
            const content = await pathUtils.readFile(movePath);
            expect(content).toBe('move test');
        });

        test('remove should delete files and directories', async () => {
            await pathUtils.ensureDir(testDir);
            await pathUtils.writeFile(testFile, 'test');

            await pathUtils.remove(testFile);
            expect(await pathUtils.exists(testFile)).toBe(false);

            // Test directory removal
            const testSubDir = path.join(testDir, 'subdir');
            await pathUtils.ensureDir(testSubDir);
            await pathUtils.writeFile(path.join(testSubDir, 'file.txt'), 'content');

            await pathUtils.remove(testSubDir);
            expect(await pathUtils.exists(testSubDir)).toBe(false);
        });
    });

    describe('Utility Methods', () => {
        test('getCurrentWorkingDir should return current working directory', () => {
            const cwd = pathUtils.getCurrentWorkingDir();
            expect(typeof cwd).toBe('string');
            expect(path.isAbsolute(cwd)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle errors gracefully', () => {
            // Test with invalid path
            expect(() => {
                pathUtils.getDirname(null);
            }).toThrow();

            expect(mockLogger.error).toHaveBeenCalled();
        });

        test('exists should handle non-existent files gracefully', async () => {
            const result = await pathUtils.exists('/non/existent/path/file.txt');
            expect(result).toBe(false);
        });
    });

    describe('Exported Constants', () => {
        test('should export APP_ROOT constant', () => {
            const { APP_ROOT } = require('../index.cjs');
            expect(APP_ROOT).toBeDefined();
            expect(path.isAbsolute(APP_ROOT)).toBe(true);
        });

        test('should export path constants', () => {
            const exports = require('../index.cjs');
            expect(exports.LIBS_ROOT).toBeDefined();
            expect(exports.MCP_SERVER_ROOT).toBeDefined();
            expect(exports.TESTS_ROOT).toBeDefined();
        });
    });
});
