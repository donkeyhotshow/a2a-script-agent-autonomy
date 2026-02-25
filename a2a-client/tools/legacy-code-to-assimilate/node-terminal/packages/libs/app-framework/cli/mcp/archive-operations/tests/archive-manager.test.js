const fs = require('fs-extra');
const path = require('path');
const { ArchiveManager } = require('../src/archive-manager');

describe('ArchiveManager', () => {
    let archiveManager;
    let testDir;

    beforeEach(() => {
        testDir = path.join(__dirname, 'test-temp');
        fs.mkdirpSync(testDir);
        archiveManager = new ArchiveManager({
            logger: {
                info: jest.fn(),
                error: jest.fn(),
                debug: jest.fn()
            }
        });
        archiveManager.archiveDir = testDir;
    });

    afterEach(() => {
        fs.removeSync(testDir);
    });

    describe('constructor', () => {
        test('должен создавать экземпляр с настройками по умолчанию', () => {
            const manager = new ArchiveManager();
            expect(manager).toBeInstanceOf(ArchiveManager);
            expect(manager.archiveDir).toBeDefined();
        });

        test('должен использовать предоставленный логгер', () => {
            const customLogger = { info: jest.fn(), error: jest.fn() };
            const manager = new ArchiveManager({ logger: customLogger });
            expect(manager.logger).toBe(customLogger);
        });
    });

    describe('ensureArchiveDir', () => {
        test('должен создавать директорию архива, если она не существует', () => {
            const testPath = path.join(testDir, 'new-archive-dir');
            archiveManager.archiveDir = testPath;
            
            archiveManager.ensureArchiveDir();
            expect(fs.existsSync(testPath)).toBe(true);
        });

        test('должен не выбрасывать ошибку, если директория уже существует', () => {
            expect(() => {
                archiveManager.ensureArchiveDir();
                archiveManager.ensureArchiveDir();
            }).not.toThrow();
        });
    });

    describe('archiveFiles', () => {
        let testFiles;

        beforeEach(async () => {
            testFiles = [
                path.join(testDir, 'test1.txt'),
                path.join(testDir, 'test2.txt')
            ];

            await Promise.all(testFiles.map(file => 
                fs.writeFile(file, 'test content')
            ));
        });

        test('должен создавать архив с указанными файлами', async () => {
            const archiveName = 'test-archive';
            
            await archiveManager.archiveFiles(testFiles, {
                archiveName,
                compression: 'zip'
            });

            const archivePath = path.join(testDir, `${archiveName}.zip`);
            expect(fs.existsSync(archivePath)).toBe(true);
        });

        test('должен включать метаданные при опции includeMetadata=true', async () => {
            const archiveName = 'test-archive-with-meta';
            
            await archiveManager.archiveFiles(testFiles, {
                archiveName,
                includeMetadata: true
            });

            const metadataPath = path.join(testDir, `${archiveName}.meta.json`);
            expect(fs.existsSync(metadataPath)).toBe(true);
            
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            expect(metadata.files).toHaveLength(testFiles.length);
            expect(metadata.totalFiles).toBe(testFiles.length);
        });

        test('должен обрабатывать ошибки при отсутствующих файлах', async () => {
            const nonExistentFiles = [
                path.join(testDir, 'non-existent1.txt'),
                path.join(testDir, 'non-existent2.txt')
            ];

            await archiveManager.archiveFiles(nonExistentFiles);
            expect(archiveManager.logger.error).toHaveBeenCalled();
        });
    });
});
