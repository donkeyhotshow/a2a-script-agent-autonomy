const fs = require('fs-extra');
const path = require('path');
const AtomicOperations = require('../src/atomic-operations');
const assert = require('assert');
const { LoggerCore } = require('../../archive-operations/tests/mocks');

// Добавляем TestRunner для запуска тестов
class TestRunner {
    constructor() {
        this.tests = [];
        this.beforeEachFns = [];
        this.afterEachFns = [];
    }

    describe(name, fn) {
        console.log(`\n📁 ${name}`);
        fn();
    }

    it(name, fn) {
        this.tests.push({ name, fn });
    }

    beforeEach(fn) {
        this.beforeEachFns.push(fn);
    }

    afterEach(fn) {
        this.afterEachFns.push(fn);
    }

    async run() {
        for (const test of this.tests) {
            try {
                for (const beforeFn of this.beforeEachFns) {
                    await beforeFn();
                }

                await test.fn();

                for (const afterFn of this.afterEachFns) {
                    await afterFn();
                }

                console.log(`✅ ${test.name}`);
            } catch (error) {
                console.error(`❌ ${test.name}\n   ${error.message}`);
            }
        }
    }
}

const runner = new TestRunner();
const describe = runner.describe.bind(runner);
const it = runner.it.bind(runner);
const beforeEach = runner.beforeEach.bind(runner);
const afterEach = runner.afterEach.bind(runner);

describe('AtomicOperations', () => {
    let atomicOps;
    let testDir;

    beforeEach(() => {
        testDir = path.join(__dirname, 'test-temp');
        fs.mkdirpSync(testDir);
        atomicOps = new AtomicOperations({
            logger: LoggerCore
        });
        atomicOps.backupDir = path.join(testDir, 'backup');
    });

    afterEach(() => {
        fs.removeSync(testDir);
    });

    describe('constructor', () => {
        it('должен создавать экземпляр с настройками по умолчанию', () => {
            const ops = new AtomicOperations();
            assert(ops instanceof AtomicOperations, 'ops не является экземпляром AtomicOperations');
            assert(ops.backupDir, 'backupDir не определён');
            assert(ops.logger, 'logger не определён');
            assert(ops.errorHandler, 'errorHandler не определён');
        });

        it('должен использовать предоставленный логгер', () => {
            const customLogger = { info: () => {}, error: () => {} };
            const ops = new AtomicOperations({ logger: customLogger });
            assert.strictEqual(ops.logger, customLogger, 'Логгер не совпадает с предоставленным');
        });
    });

    describe('ensureBackupDir', () => {
        it('должен создавать директорию для бэкапов, если она не существует', () => {
            const testPath = path.join(testDir, 'new-backup-dir');
            atomicOps.backupDir = testPath;

            atomicOps.ensureBackupDir();
            assert(fs.existsSync(testPath), 'Директория для бэкапов не была создана');
        });

        it('должен не выбрасывать ошибку, если директория уже существует', () => {
            assert.doesNotThrow(() => {
                atomicOps.ensureBackupDir();
                atomicOps.ensureBackupDir();
            }, 'Ошибка была выброшена при повторном создании директории');
        });
    });

    describe('atomicWrite', () => {
        it('должен атомарно записывать контент в файл', async () => {
            const testFile = path.join(testDir, 'test.txt');
            const content = 'test content';

            await atomicOps.atomicWrite(testFile, content);

            assert.strictEqual(
                fs.existsSync(testFile),
                true,
                'Файл не был создан'
            );
            assert.strictEqual(
                fs.readFileSync(testFile, 'utf8'),
                content,
                'Содержимое файла не совпадает'
            );
        });

        it('должен создавать бэкап при включенной опции createBackup', async () => {
            const testFile = path.join(testDir, 'test.txt');
            const originalContent = 'original content';
            const newContent = 'new content';

            await fs.writeFile(testFile, originalContent);
            await atomicOps.atomicWrite(testFile, newContent, { createBackup: true });

            const backups = await fs.readdir(atomicOps.backupDir);
            assert(backups.length > 0, 'Бэкап не был создан');
        });

        it('должен валидировать контент при предоставленной функции валидации', async () => {
            const testFile = path.join(testDir, 'test.txt');
            const content = 'test content';
            const validateContent = (content) => true;

            await atomicOps.atomicWrite(testFile, content, { validateContent });

            assert(fs.existsSync(testFile), 'Файл не был создан');
        });

        it('должен обрабатывать ошибки валидации', async () => {
            const testFile = path.join(testDir, 'test.txt');
            const content = 'invalid content';
            const validateContent = (content) => false;

            await assert.rejects(
                async () => {
                    await atomicOps.atomicWrite(testFile, content, { validateContent });
                },
                {
                    message: 'Content validation failed'
                }
            );

            assert(!fs.existsSync(testFile), 'Файл не должен был быть создан');
        });
    });
});

// Запускаем тесты
runner.run().catch(console.error);
