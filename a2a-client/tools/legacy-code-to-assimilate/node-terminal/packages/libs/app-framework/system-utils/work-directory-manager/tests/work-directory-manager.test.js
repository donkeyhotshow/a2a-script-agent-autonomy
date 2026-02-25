
const { WorkDirectoryManager } = require('../index');
const path = require('path');
const fs = require('fs').promises;

// Мок-объект для globalLogger
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
};

describe('WorkDirectoryManager', () => {
    const testWorkDir = path.join(__dirname, 'temp_test_work_dir');
    let manager;

    beforeEach(() => {
        manager = new WorkDirectoryManager(mockLogger);
        jest.clearAllMocks();
    });

    afterEach(async () => {
        // Очистка тестовой директории после каждого теста
        if (await fs.stat(testWorkDir).catch(() => null)) {
            await fs.rm(testWorkDir, { recursive: true, force: true });
        }
    });

    test('should create the work directory if it does not exist', async () => {
        await manager.createWorkDirectory(testWorkDir);
        const stats = await fs.stat(testWorkDir);
        expect(stats.isDirectory()).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(`Work directory created: ${testWorkDir}`);
    });

    test('should not recreate the work directory if it already exists', async () => {
        await fs.mkdir(testWorkDir, { recursive: true });
        await manager.createWorkDirectory(testWorkDir);
        const stats = await fs.stat(testWorkDir);
        expect(stats.isDirectory()).toBe(true);
        expect(mockLogger.info).toHaveBeenCalledWith(`Work directory already exists: ${testWorkDir}`);
    });

    test('should clear the work directory', async () => {
        await fs.mkdir(testWorkDir, { recursive: true });
        await fs.writeFile(path.join(testWorkDir, 'test.txt'), 'test content');
        await manager.clearWorkDirectory(testWorkDir);
        const files = await fs.readdir(testWorkDir);
        expect(files.length).toBe(0);
        expect(mockLogger.info).toHaveBeenCalledWith(`Work directory cleared: ${testWorkDir}`);
    });

    test('should handle clearing a non-existent work directory gracefully', async () => {
        await manager.clearWorkDirectory(testWorkDir);
        // Должен просто ничего не делать и залогировать, что директория не существует
        expect(mockLogger.warn).toHaveBeenCalledWith(`Attempted to clear non-existent work directory: ${testWorkDir}`);
        const exists = await fs.stat(testWorkDir).catch(() => null);
        expect(exists).toBeNull();
    });

    test('should throw an error if createWorkDirectory fails', async () => {
        // Мокируем ошибку при создании директории
        jest.spyOn(fs, 'mkdir').mockImplementationOnce(() => {
            throw new Error('Mock mkdir error');
        });

        await expect(manager.createWorkDirectory(testWorkDir)).rejects.toThrow('Mock mkdir error');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error creating work directory'));
    });

    test('should throw an error if clearWorkDirectory fails', async () => {
        await fs.mkdir(testWorkDir, { recursive: true });
        // Мокируем ошибку при удалении содержимого директории
        jest.spyOn(fs, 'rm').mockImplementationOnce(() => {
            throw new Error('Mock rm error');
        });

        await expect(manager.clearWorkDirectory(testWorkDir)).rejects.toThrow('Mock rm error');
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error clearing work directory'));
    });
});
