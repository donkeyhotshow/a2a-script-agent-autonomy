const chai = require('chai');
const sinon = require('sinon');
const { expect } = chai;
const fs = require('fs-extra');
const fsOriginal = require('fs');
const path = require('path');
const crypto = require('crypto'); // Добавляем crypto
const DataManager = require('../src/data-manager');
const AtomicOperations = require('../../atomic-operations/src/atomic-operations.js');
const { DataSearchAndStats } = require('../src/DataSearchAndStats.js');
const { DataBackupAndRestore } = require('../src/DataBackupAndRestore.js');

describe('DataManager', () => {
    let dataManager;
    let loggerMock;
    let existsSyncStub;
    let mkdirSyncStub;
    let atomicOperationsMock;
    let readFileStub;
    let unlinkSyncStub;
    let readdirSyncStub;
    let dataSearchAndStatsMock;
    let dataBackupAndRestoreMock;
    let statStub;

    beforeEach(() => {
        loggerMock = {
            debug: sinon.spy(),
            error: sinon.spy(),
            info: sinon.spy(),
            warn: sinon.spy()
        };

        // Создаем стабы для fs
        existsSyncStub = sinon.stub(fsOriginal, 'existsSync');
        mkdirSyncStub = sinon.stub(fsOriginal, 'mkdirSync');
        readFileStub = sinon.stub(fsOriginal, 'readFileSync');
        unlinkSyncStub = sinon.stub(fsOriginal, 'unlinkSync');
        readdirSyncStub = sinon.stub(fsOriginal, 'readdirSync');
        statStub = sinon.stub(fs, 'stat');

        // Создаем мок для AtomicOperations
        atomicOperationsMock = {
            atomicWrite: sinon.stub().resolves(),
            atomicRead: sinon.stub().resolves()
        };

        sinon.stub(AtomicOperations.prototype, 'atomicWrite').callsFake(atomicOperationsMock.atomicWrite);
        sinon.stub(AtomicOperations.prototype, 'atomicRead').callsFake(atomicOperationsMock.atomicRead);

        // Создаем моки для DataSearchAndStats и DataBackupAndRestore
        dataSearchAndStatsMock = {
            search: sinon.stub().resolves([]),
            getStats: sinon.stub().resolves({ count: 0, totalSize: 0 })
        };
        dataBackupAndRestoreMock = {
            backup: sinon.stub().resolves({ success: true, files: 0 }),
            restore: sinon.stub().resolves({ success: true, files: 0 }),
            getInfo: sinon.stub().resolves(null),
            getAllInfo: sinon.stub().resolves([])
        };

        // Стабы для конструкторов
        sinon.stub(DataSearchAndStats.prototype, 'search').callsFake(dataSearchAndStatsMock.search);
        sinon.stub(DataSearchAndStats.prototype, 'getStats').callsFake(dataSearchAndStatsMock.getStats);
        sinon.stub(DataBackupAndRestore.prototype, 'backup').callsFake(dataBackupAndRestoreMock.backup);
        sinon.stub(DataBackupAndRestore.prototype, 'restore').callsFake(dataBackupAndRestoreMock.restore);
        sinon.stub(DataBackupAndRestore.prototype, 'getInfo').callsFake(dataBackupAndRestoreMock.getInfo);
        sinon.stub(DataBackupAndRestore.prototype, 'getAllInfo').callsFake(dataBackupAndRestoreMock.getAllInfo);

        // Настраиваем стаб existsSync для возврата false перед созданием DataManager
        existsSyncStub.onFirstCall().returns(false); // Для this.dataDir
        existsSyncStub.returns(true); // Для остальных случаев по умолчанию

        dataManager = new DataManager({ logger: loggerMock });
    });

    afterEach(() => {
        sinon.restore();
    });

    // Existing tests
    it('should create data directory if it does not exist', () => {
        // Сбрасываем существующие стабы
        existsSyncStub.reset();
        mkdirSyncStub.reset();
        
        // Настраиваем стаб existsSync для возврата false только для директории data
        existsSyncStub.withArgs(path.join(process.cwd(), 'data')).returns(false);
        existsSyncStub.returns(true);
        
        dataManager.ensureDataDir(); // Явно вызываем метод
        
        // Проверяем, что mkdirSync был вызван для директории data
        expect(mkdirSyncStub.getCalls().some(call => 
            call.args[0] === path.join(process.cwd(), 'data') &&
            call.args[1].recursive === true
        )).to.be.true;
    });

    it('should set data with metadata', async () => {
        const key = 'testKey';
        const value = { test: 'value' };
        
        // Настраиваем стаб existsSync для возврата true
        existsSyncStub.returns(true);
        
        await dataManager.set(key, value);
        
        expect(atomicOperationsMock.atomicWrite.calledOnce).to.be.true;
        const expectedPath = path.join(process.cwd(), 'data', `${key}.json`);
        expect(atomicOperationsMock.atomicWrite.firstCall.args[0]).to.equal(expectedPath);
    });

    // New tests for get, delete, has, keys, clear, clearCache, setCacheTimeout

    describe('getFilePath', () => {
        it('should return the correct file path', () => {
            const key = 'testKey';
            const expectedPath = path.join(process.cwd(), 'data', 'testKey.json');
            expect(dataManager.getFilePath(key)).to.equal(expectedPath);
        });
    });

    describe('get', () => {
        const key = 'testKey';
        const value = { data: 'some value' };
        const metadata = {
            created: new Date().toISOString(),
            ttl: null,
            compress: false,
            encrypt: false,
            size: JSON.stringify(value).length
        };
        const fileContent = JSON.stringify({ value, metadata }, null, 2);

        it('should return data from cache if available and not expired', async () => {
            dataManager.cache.set(key, { data: { value, metadata }, timestamp: Date.now() });
            const result = await dataManager.get(key);
            expect(result).to.deep.equal(value);
            expect(readFileStub.notCalled).to.be.true;
        });

        it('should return data from file if cache is expired or refreshCache is true', async () => {
            dataManager.cache.set(key, { data: { value, metadata }, timestamp: Date.now() - dataManager.cacheTimeout - 1000 }); // Expired cache
            existsSyncStub.returns(true);
            readFileStub.returns(fileContent);
            const result = await dataManager.get(key);
            expect(result).to.deep.equal(value);
            expect(readFileStub.calledOnce).to.be.true;
            expect(dataManager.cache.has(key)).to.be.true; // Cache should be updated
        });

        it('should return defaultValue if file does not exist', async () => {
            existsSyncStub.returns(false);
            const result = await dataManager.get(key, { defaultValue: 'default' });
            expect(result).to.equal('default');
            expect(readFileStub.notCalled).to.be.true;
        });

        it('should return defaultValue if file content is invalid JSON', async () => {
            existsSyncStub.returns(true);
            readFileStub.returns('invalid json');
            const result = await dataManager.get(key, { defaultValue: 'default' });
            expect(result).to.equal('default');
            expect(loggerMock.error.calledOnce).to.be.true;
        });

        it('should return defaultValue and delete file if data is expired (TTL)', async () => {
            const expiredMetadata = { ...metadata, expires: new Date(Date.now() - 1000).toISOString() };
            const expiredFileContent = JSON.stringify({ value, metadata: expiredMetadata }, null, 2);
            existsSyncStub.returns(true);
            readFileStub.returns(expiredFileContent);
            const deleteStub = sinon.stub(dataManager, 'delete').resolves(); // Mock delete method
            
            const result = await dataManager.get(key, { defaultValue: 'default' });
            expect(result).to.equal('default');
            expect(deleteStub.calledOnceWith(key)).to.be.true;
            expect(loggerMock.debug.calledWith('Data expired, removing', { key })).to.be.true;
            deleteStub.restore();
        });

        it('should return data from file and update cache', async () => {
            existsSyncStub.returns(true);
            readFileStub.returns(fileContent);
            const result = await dataManager.get(key);
            expect(result).to.deep.equal(value);
            expect(dataManager.cache.has(key)).to.be.true;
            expect(dataManager.cache.get(key).data.value).to.deep.equal(value);
        });

        it('should handle errors during file read', async () => {
            existsSyncStub.returns(true);
            readFileStub.throws(new Error('Read error'));
            const result = await dataManager.get(key, { defaultValue: 'default' });
            expect(result).to.equal('default');
            expect(loggerMock.error.calledOnce).to.be.true;
        });
    });

    describe('delete', () => {
        const key = 'testKey';
        const filePath = path.join(process.cwd(), 'data', `${key}.json`);

        it('should delete the file and remove from cache if it exists', async () => {
            existsSyncStub.withArgs(filePath).returns(true);
            dataManager.cache.set(key, { data: { value: 'some' }, timestamp: Date.now() });
            
            const result = await dataManager.delete(key);
            
            expect(unlinkSyncStub.calledOnceWith(filePath)).to.be.true;
            expect(dataManager.cache.has(key)).to.be.false;
            expect(result).to.deep.equal({ success: true, key });
            expect(loggerMock.info.calledWith('Data deleted successfully', { key })).to.be.true;
        });

        it('should not throw error if file does not exist', async () => {
            existsSyncStub.withArgs(filePath).returns(false);
            dataManager.cache.set(key, { data: { value: 'some' }, timestamp: Date.now() });
            
            const result = await dataManager.delete(key);
            
            expect(unlinkSyncStub.notCalled).to.be.true;
            expect(dataManager.cache.has(key)).to.be.false;
            expect(result).to.deep.equal({ success: true, key });
        });

        it('should handle errors during file deletion', async () => {
            existsSyncStub.withArgs(filePath).returns(true);
            unlinkSyncStub.throws(new Error('Delete error'));
            
            try {
                await dataManager.delete(key);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Delete error');
                expect(loggerMock.error.calledOnce).to.be.true;
            }
        });
    });

    describe('has', () => {
        const key = 'testKey';
        const filePath = path.join(process.cwd(), 'data', `${key}.json`);

        it('should return true if file exists', async () => {
            existsSyncStub.withArgs(filePath).returns(true);
            const result = await dataManager.has(key);
            expect(result).to.be.true;
        });

        it('should return false if file does not exist', async () => {
            existsSyncStub.withArgs(filePath).returns(false);
            const result = await dataManager.has(key);
            expect(result).to.be.false;
        });

        it('should handle errors and return false', async () => {
            existsSyncStub.withArgs(filePath).throws(new Error('Has error'));
            const result = await dataManager.has(key);
            expect(result).to.be.false;
            expect(loggerMock.error.calledOnce).to.be.true;
        });
    });

    describe('keys', () => {
        it('should return all JSON file keys if no pattern is provided', async () => {
            readdirSyncStub.returns(['file1.json', 'file2.json', 'other.txt']);
            const result = await dataManager.keys();
            expect(result).to.deep.equal(['file1', 'file2']);
        });

        it('should return filtered JSON file keys if a pattern is provided', async () => {
            readdirSyncStub.returns(['test1.json', 'test2.json', 'other.json', 'file.txt']);
            const result = await dataManager.keys('^test');
            expect(result).to.deep.equal(['test1', 'test2']);
        });

        it('should handle errors during directory read and return empty array', async () => {
            readdirSyncStub.throws(new Error('Read dir error'));
            const result = await dataManager.keys();
            expect(result).to.deep.equal([]);
            expect(loggerMock.error.calledOnce).to.be.true;
        });
    });

    describe('clear', () => {
        it('should delete all JSON files and clear cache', async () => {
            const files = ['file1.json', 'file2.json', 'other.txt'];
            readdirSyncStub.returns(files);
            existsSyncStub.returns(true);
            
            dataManager.cache.set('file1', {});
            dataManager.cache.set('file2', {});
            
            const result = await dataManager.clear();
            
            expect(unlinkSyncStub.calledWith(path.join(dataManager.dataDir, 'file1.json'))).to.be.true;
            expect(unlinkSyncStub.calledWith(path.join(dataManager.dataDir, 'file2.json'))).to.be.true;
            expect(unlinkSyncStub.callCount).to.equal(2);
            expect(dataManager.cache.size).to.equal(0);
            expect(result).to.deep.equal({ success: true, filesDeleted: 2 });
            expect(loggerMock.info.calledWith('All data cleared successfully', { filesDeleted: 2 })).to.be.true;
        });

        it('should handle errors during file deletion', async () => {
            readdirSyncStub.returns(['file1.json']);
            existsSyncStub.returns(true);
            unlinkSyncStub.throws(new Error('Clear error'));
            
            try {
                await dataManager.clear();
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Clear error');
                expect(loggerMock.error.calledOnce).to.be.true;
            }
        });
    });

    describe('backup', () => {
        it('should call dataBackupAndRestore.backup', async () => {
            const backupPath = '/some/path/backup';
            dataBackupAndRestoreMock.backup.resolves({ success: true, files: 5 });
            const result = await dataManager.backup(backupPath);
            expect(dataBackupAndRestoreMock.backup.calledOnceWith(backupPath)).to.be.true;
            expect(result).to.deep.equal({ success: true, files: 5 });
        });
    });

    describe('restore', () => {
        it('should call dataBackupAndRestore.restore', async () => {
            const backupPath = '/some/path/backup';
            dataBackupAndRestoreMock.restore.resolves({ success: true, files: 5 });
            const result = await dataManager.restore(backupPath);
            expect(dataBackupAndRestoreMock.restore.calledOnceWith(backupPath)).to.be.true;
            expect(result).to.deep.equal({ success: true, files: 5 });
        });
    });

    describe('clearCache', () => {
        it('should clear the internal cache', () => {
            dataManager.cache.set('test', 'value');
            expect(dataManager.cache.size).to.equal(1);
            dataManager.clearCache();
            expect(dataManager.cache.size).to.equal(0);
            expect(loggerMock.debug.calledWith('Cache cleared')).to.be.true;
        });
    });

    describe('setCacheTimeout', () => {
        it('should set the cache timeout', () => {
            const newTimeout = 10 * 60 * 1000;
            dataManager.setCacheTimeout(newTimeout);
            expect(dataManager.cacheTimeout).to.equal(newTimeout);
            expect(loggerMock.debug.calledWith('Cache timeout updated', { timeout: newTimeout })).to.be.true;
        });
    });

    describe('isValidEncoding', () => {
        it('should return true for valid content', () => {
            const validContent = 'Hello, world!';
            expect(dataManager.isValidEncoding(validContent)).to.be.true;
        });

        it('should return false for content with invalid characters', () => {
            const invalidContent = 'Hello\x00World!';
            expect(dataManager.isValidEncoding(invalidContent)).to.be.false;
        });

        it('should handle errors and return false', () => {
            const content = null; // This will cause an error when .test() is called
            expect(dataManager.isValidEncoding(content)).to.be.false;
        });
    });

    describe('getFilesRecursive', () => {
        const testDirPath = path.join(process.cwd(), 'test_data_recursive');
        const file1Path = path.join(testDirPath, 'file1.json');
        const subDirPath = path.join(testDirPath, 'sub');
        const file2Path = path.join(subDirPath, 'file2.txt');

        beforeEach(() => {
            // Mock fs.readdir for recursive calls
            sinon.stub(fs, 'readdir').callsFake(async (dir) => {
                if (dir === testDirPath) return ['file1.json', 'sub'];
                if (dir === subDirPath) return ['file2.txt'];
                return [];
            });
            // Mock fs.stat for recursive calls
            statStub.callsFake(async (filePath) => {
                if (filePath === testDirPath) return { isDirectory: () => true, isFile: () => false };
                if (filePath === file1Path) return { isDirectory: () => false, isFile: () => true };
                if (filePath === subDirPath) return { isDirectory: () => true, isFile: () => false };
                if (filePath === file2Path) return { isDirectory: () => false, isFile: () => true };
                return { isDirectory: () => false, isFile: () => false };
            });
        });

        it('should return all files recursively without extension filter', async () => {
            const files = await dataManager.getFilesRecursive(testDirPath);
            expect(files).to.deep.include(file1Path);
            expect(files).to.deep.include(file2Path);
            expect(files.length).to.equal(2);
        });

        it('should return files filtered by extensions', async () => {
            const files = await dataManager.getFilesRecursive(testDirPath, ['.json']);
            expect(files).to.deep.equal([file1Path]);
        });

        it('should use cache if available and not expired', async () => {
            const cachedFiles = ['cached_file.json'];
            dataManager.cache.set(`${testDirPath}:.json`, { files: cachedFiles, timestamp: Date.now() });
            const files = await dataManager.getFilesRecursive(testDirPath, ['.json']);
            expect(files).to.deep.equal(cachedFiles);
            expect(fs.readdir.notCalled).to.be.true;
        });

        it('should handle maxFiles limit and log a warning', async () => {
            sinon.restore(); // Restore fs.readdir and fs.stat stubs
            const mockFiles = Array.from({ length: 5001 }, (_, i) => `file${i}.json`);
            sinon.stub(fs, 'readdir').callsFake(async (dir) => {
                if (dir === testDirPath) return mockFiles;
                return [];
            });
            statStub.callsFake(async (filePath) => {
                return { isDirectory: () => false, isFile: () => true };
            });

            const files = await dataManager.getFilesRecursive(testDirPath, ['.json']);
            expect(files.length).to.equal(5000); // Should be capped at 5000
            expect(loggerMock.warn.calledOnce).to.be.true;
            expect(loggerMock.warn.firstCall.args[0]).to.include('Reached file limit 5000');
        });

        it('should handle errors during file access', async () => {
            sinon.restore(); // Restore fs.readdir and fs.stat stubs
            sinon.stub(fs, 'readdir').callsFake(async (dir) => {
                if (dir === testDirPath) return ['file1.json'];
                return [];
            });
            statStub.callsFake(async (filePath) => {
                if (filePath === file1Path) throw new Error('Access error');
                return { isDirectory: () => false, isFile: () => true };
            });

            const files = await dataManager.getFilesRecursive(testDirPath, ['.json']);
            expect(files).to.deep.equal([]);
            expect(loggerMock.error.calledOnce).to.be.true;
        });

        it('should handle errors during directory read', async () => {
            sinon.restore(); // Restore fs.readdir and fs.stat stubs
            sinon.stub(fs, 'readdir').throws(new Error('Directory read error'));
            const files = await dataManager.getFilesRecursive(testDirPath);
            expect(files).to.deep.equal([]);
            expect(loggerMock.error.calledOnce).to.be.true;
        });
    });

    describe('readFileWithPagination', () => {
        const filePath = 'test_file.txt';
        const fileContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10';
        const mockIntegrity = { isValid: true, modified: new Date() };

        beforeEach(() => {
            sinon.stub(dataManager, 'checkFileIntegrity').resolves(mockIntegrity);
            sinon.stub(fs, 'readFile').resolves(fileContent);
        });

        it('should throw error if filePath is not provided', async () => {
            try {
                await dataManager.readFileWithPagination(null);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Путь к файлу не указан');
            }
        });

        it('should throw error if file integrity check fails', async () => {
            dataManager.checkFileIntegrity.resolves({ isValid: false, error: 'Corrupted' });
            try {
                await dataManager.readFileWithPagination(filePath);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Файл поврежден: Corrupted');
            }
        });

        it('should return paginated content for a given page and pageSize', async () => {
            const result = await dataManager.readFileWithPagination(filePath, { page: 2, pageSize: 3 });
            expect(result.content).to.equal('Line 4\nLine 5\nLine 6');
            expect(result.pagination.page).to.equal(2);
            expect(result.pagination.pageSize).to.equal(3);
            expect(result.pagination.totalLines).to.equal(10);
            expect(result.pagination.totalPages).to.equal(4);
            expect(result.pagination.startLine).to.equal(4);
            expect(result.pagination.endLine).to.equal(6);
            expect(result.pagination.hasNext).to.be.true;
            expect(result.pagination.hasPrev).to.be.true;
        });

        it('should return content for a given startLine and endLine', async () => {
            const result = await dataManager.readFileWithPagination(filePath, { startLine: 2, endLine: 4 });
            expect(result.content).to.equal('Line 2\nLine 3\nLine 4');
            expect(result.pagination.startLine).to.equal(2);
            expect(result.pagination.endLine).to.equal(4);
        });

        it('should return full content if pagination options are out of bounds', async () => {
            const result = await dataManager.readFileWithPagination(filePath, { page: 1, pageSize: 20 });
            expect(result.content).to.equal(fileContent);
            expect(result.pagination.totalLines).to.equal(10);
            expect(result.pagination.totalPages).to.equal(1);
            expect(result.pagination.hasNext).to.be.false;
            expect(result.pagination.hasPrev).to.be.false;
        });

        it('should handle errors during file read', async () => {
            fs.readFile.throws(new Error('File read error'));
            try {
                await dataManager.readFileWithPagination(filePath);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('File read error');
                expect(loggerMock.error.calledOnce).to.be.true;
            }
        });
    });

    describe('checkFileIntegrity', () => {
        const filePath = 'test_integrity.json';
        const validContent = JSON.stringify({ key: 'value' });
        const invalidJsonContent = 'invalid json';
        const binaryContent = Buffer.from([0x00, 0x01, 0x02]).toString('utf8');
        const mockStats = { size: validContent.length, mtime: new Date() };

        beforeEach(() => {
            sinon.stub(fs, 'stat').resolves(mockStats);
            sinon.stub(fs, 'readFile').resolves(validContent);
            sinon.stub(crypto, 'createHash').returns({
                update: sinon.stub().returnsThis(),
                digest: sinon.stub().returns('mockedHash')
            });
        });

        it('should throw error if file_path is not provided', async () => {
            try {
                await dataManager.checkFileIntegrity({});
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error.message).to.equal('Путь к файлу не указан');
            }
        });

        it('should return valid integrity for a valid JSON file', async () => {
            const result = await dataManager.checkFileIntegrity({ file_path: filePath });
            expect(result.isValid).to.be.true;
            expect(result.filePath).to.equal(filePath);
            expect(result.size).to.equal(mockStats.size);
            expect(result.modified).to.equal(mockStats.mtime);
            expect(result.hash).to.equal('mockedHash');
            expect(result.isValidSize).to.be.true;
            expect(result.isValidEncoding).to.be.true;
            expect(result.isValidStructure).to.be.true;
        });

        it('should return invalid for invalid JSON structure', async () => {
            fs.readFile.resolves(invalidJsonContent);
            const result = await dataManager.checkFileIntegrity({ file_path: filePath });
            expect(result.isValid).to.be.false;
            expect(result.isValidStructure).to.be.false;
        });

        it('should return invalid for invalid encoding', async () => {
            sinon.stub(dataManager, 'isValidEncoding').returns(false);
            const result = await dataManager.checkFileIntegrity({ file_path: filePath });
            expect(result.isValid).to.be.false;
            expect(result.isValidEncoding).to.be.false;
            dataManager.isValidEncoding.restore();
        });

        it('should return invalid for file size exceeding limit', async () => {
            fs.stat.resolves({ size: 100 * 1024 * 1024 + 1, mtime: new Date() });
            const result = await dataManager.checkFileIntegrity({ file_path: filePath });
            expect(result.isValid).to.be.false;
            expect(result.isValidSize).to.be.false;
        });

        it('should handle errors during file stat', async () => {
            fs.stat.throws(new Error('Stat error'));
            const result = await dataManager.checkFileIntegrity({ file_path: filePath });
            expect(result.isValid).to.be.false;
            expect(result.error).to.equal('Stat error');
            expect(loggerMock.error.calledOnce).to.be.true;
        });

        it('should handle errors during file read', async () => {
            fs.readFile.throws(new Error('Read error'));
            const result = await dataManager.checkFileIntegrity({ file_path: filePath });
            expect(result.isValid).to.be.false;
            expect(result.error).to.equal('Read error');
            expect(loggerMock.error.calledOnce).to.be.true;
        });
    });

    describe('getInfo', () => {
        it('should call dataBackupAndRestore.getInfo', async () => {
            const key = 'testKey';
            const mockInfo = { key, size: 100 };
            dataBackupAndRestoreMock.getInfo.resolves(mockInfo);
            const result = await dataManager.getInfo(key);
            expect(dataBackupAndRestoreMock.getInfo.calledOnceWith(key)).to.be.true;
            expect(result).to.deep.equal(mockInfo);
        });
    });

    describe('getAllInfo', () => {
        it('should call dataBackupAndRestore.getAllInfo', async () => {
            const mockAllInfo = [{ key: 'a', size: 10 }, { key: 'b', size: 20 }];
            dataBackupAndRestoreMock.getAllInfo.resolves(mockAllInfo);
            const result = await dataManager.getAllInfo();
            expect(dataBackupAndRestoreMock.getAllInfo.calledOnce).to.be.true;
            expect(result).to.deep.equal(mockAllInfo);
        });
    });

    describe('DataSearchAndStats integrations', () => {
        it('should call dataSearchAndStats.search', async () => {
            const query = 'test query';
            const mockSearchResults = ['fileA', 'fileB'];
            dataSearchAndStatsMock.search.resolves(mockSearchResults);
            const result = await dataManager.dataSearchAndStats.search(query);
            expect(dataSearchAndStatsMock.search.calledOnceWith(query)).to.be.true;
            expect(result).to.deep.equal(mockSearchResults);
        });

        it('should call dataSearchAndStats.getStats', async () => {
            const mockStats = { count: 10, totalSize: 1024 };
            dataSearchAndStatsMock.getStats.resolves(mockStats);
            const result = await dataManager.dataSearchAndStats.getStats();
            expect(dataSearchAndStatsMock.getStats.calledOnce).to.be.true;
            expect(result).to.deep.equal(mockStats);
        });
    });
});
