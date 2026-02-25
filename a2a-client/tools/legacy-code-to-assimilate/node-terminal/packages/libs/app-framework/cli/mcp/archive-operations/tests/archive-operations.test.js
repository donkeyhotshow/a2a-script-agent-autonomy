const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { LoggerCore, errorHandler } = require('./mocks');

// Утилита для запуска тестов
class TestRunner {
    constructor() {
        this.tests = [];
        this.beforeEachFns = [];
        this.afterEachFns = [];
        this.stats = { total: 0, passed: 0, failed: 0 };
    }

    describe(name, fn) {
        console.log(`\n📁 ${name}`);
        fn();
    }

    test(name, fn) {
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
            this.stats.total++;
            try {
                for (const beforeFn of this.beforeEachFns) {
                    await beforeFn();
                }

                await test.fn();
                
                for (const afterFn of this.afterEachFns) {
                    await afterFn();
                }

                console.log(`✅ ${test.name}`);
                this.stats.passed++;
            } catch (error) {
                console.error(`❌ ${test.name}\n   ${error.message}`);
                this.stats.failed++;
            }
        }

        console.log(`\n📊 Результаты:\n   Всего: ${this.stats.total}\n   Успешно: ${this.stats.passed}\n   Провалено: ${this.stats.failed}`);
    }
}

// Создаем экземпляр TestRunner
const runner = new TestRunner();

// Привязываем методы к экземпляру
const describe = runner.describe.bind(runner);
const test = runner.test.bind(runner);
const beforeEach = runner.beforeEach.bind(runner);
const afterEach = runner.afterEach.bind(runner);

// Импортируем тестируемый модуль
const ArchiveManager = require('../src/archive-manager');

// Определяем тесты
describe('Archive Operations Tests', () => {
    const testDir = path.join(__dirname, 'test-temp');
    let archiveManager;

    beforeEach(async () => {
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir);
        }
        archiveManager = new ArchiveManager({
            logger: LoggerCore
        });
        archiveManager.archiveDir = path.join(testDir, 'archives');
        archiveManager.ensureArchiveDir();
    });

    afterEach(async () => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true });
        }
    });

    test('должен создавать архивную директорию при инициализации', async () => {
        assert.strictEqual(
            fs.existsSync(archiveManager.archiveDir),
            true,
            'Архивная директория не создана'
        );
    });

    test('должен архивировать файлы', async () => {
        // Создаем тестовые файлы
        const testFiles = [
            path.join(testDir, 'test1.txt'),
            path.join(testDir, 'test2.txt')
        ];

        testFiles.forEach(file => {
            fs.writeFileSync(file, 'test content');
        });

        const archiveName = 'test-archive';
        await archiveManager.archiveFiles(testFiles, { archiveName });

        const archivePath = path.join(archiveManager.archiveDir, `${archiveName}.zip`);
        assert.strictEqual(
            fs.existsSync(archivePath),
            true,
            'Архив не создан'
        );
    });

    test('должен создавать метаданные архива', async () => {
        const testFile = path.join(testDir, 'test.txt');
        fs.writeFileSync(testFile, 'test content');

        const archiveName = 'test-archive-with-meta';
        await archiveManager.archiveFiles([testFile], {
            archiveName,
            includeMetadata: true
        });

        const metadataPath = path.join(archiveManager.archiveDir, `${archiveName}.meta.json`);
        assert.strictEqual(
            fs.existsSync(metadataPath),
            true,
            'Файл метаданных не создан'
        );

        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        assert.strictEqual(
            metadata.files.length,
            1,
            'Неверное количество файлов в метаданных'
        );
    });

    test('должен обрабатывать отсутствующие файлы при архивации', async () => {
        const nonExistentFile = path.join(testDir, 'non-existent.txt');
        
        await archiveManager.archiveFiles([nonExistentFile], {
            archiveName: 'test-missing-files'
        });

        const archivePath = path.join(
            archiveManager.archiveDir,
            'test-missing-files.zip'
        );
        assert.strictEqual(
            fs.existsSync(archivePath),
            false,
            'Архив создан для несуществующих файлов'
        );
    });
});

// Запускаем тесты
runner.run().catch(console.error);
