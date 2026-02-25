/**
 * Тесты для PackageTestingConfigManager
 * Тестирует функциональность управления конфигурацией тестирования пакетов
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs').promises;
const path = require('path');
const packageTestingConfigManager = require('../index.js');

const currentFile = __filename;
const currentDir = __dirname;

describe('PackageTestingConfigManager', () => {
    let testConfigPath;
    let originalConfigPath;

    beforeEach(async () => {
        originalConfigPath = packageTestingConfigManager.configPath;
        testConfigPath = path.join(currentDir, 'test-package-testing-config.json');
        
        const testConfig = {
            packages: {
                'test-package-1': { version: '1.0.0', dependencies: ['dep1'] }
            },
            scripts: {
                'test-script-1': 'echo "Test 1"'
            },
            dependencies: {
                'dep1': '^1.0.0'
            },
            devDependencies: {
                'dev-dep1': '^2.0.0'
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Test configuration'
            }
        };
        
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
        
        packageTestingConfigManager.configPath = testConfigPath;
        packageTestingConfigManager.clearCache();
    });

    afterEach(async () => {
        packageTestingConfigManager.configPath = originalConfigPath;
        packageTestingConfigManager.clearCache();
        try {
            await fs.unlink(testConfigPath);
        } catch (error) {}
    });

    describe('getConfig', () => {
        it('должен загружать конфигурацию тестирования пакетов', async () => {
            const config = await packageTestingConfigManager.getConfig();
            expect(config).toBeDefined();
            expect(config.packages['test-package-1']).toBeDefined();
            expect(config.scripts['test-script-1']).toBeDefined();
        });
    });

    describe('getPackageConfig', () => {
        it('должен возвращать конфигурацию пакета по имени', async () => {
            const packageConfig = await packageTestingConfigManager.getPackageConfig('test-package-1');
            expect(packageConfig).toBeDefined();
            expect(packageConfig.version).toBe('1.0.0');
        });

        it('должен возвращать null для несуществующего пакета', async () => {
            const nonExistentPackage = await packageTestingConfigManager.getPackageConfig('non-existent');
            expect(nonExistentPackage).toBeNull();
        });
    });

    describe('getScript', () => {
        it('должен возвращать скрипт по имени', async () => {
            const script = await packageTestingConfigManager.getScript('test-script-1');
            expect(script).toBeDefined();
            expect(script).toBe('echo "Test 1"');
        });

        it('должен возвращать null для несуществующего скрипта', async () => {
            const nonExistentScript = await packageTestingConfigManager.getScript('non-existent-script');
            expect(nonExistentScript).toBeNull();
        });
    });

    describe('addPackage', () => {
        it('должен добавлять новый пакет', async () => {
            const newPackage = { version: '1.1.0', dependencies: ['dep2'] };
            await packageTestingConfigManager.addPackage('new-package', newPackage);
            const addedPackage = await packageTestingConfigManager.getPackageConfig('new-package');
            expect(addedPackage).toBeDefined();
            expect(addedPackage.version).toBe('1.1.0');
        });

        it('должен выбрасывать ошибку при добавлении существующего пакета', async () => {
            const duplicatePackage = { version: '1.0.0' };
            await expect(packageTestingConfigManager.addPackage('test-package-1', duplicatePackage))
                .rejects.toThrow('Пакет test-package-1 уже существует');
        });
    });

    describe('updateScript', () => {
        it('должен обновлять скрипт', async () => {
            await packageTestingConfigManager.updateScript('test-script-1', 'echo "Updated Test 1"');
            const script = await packageTestingConfigManager.getScript('test-script-1');
            expect(script).toBe('echo "Updated Test 1"');
        });
    });

    describe('addWatcher', () => {
        it('должен вызывать наблюдателя при изменениях', async () => {
            let watcherCalled = false;
            const unwatch = packageTestingConfigManager.addWatcher(() => { watcherCalled = true; });
            await packageTestingConfigManager.updateScript('test-script-1', 'echo "Watcher Test"');
            expect(watcherCalled).toBe(true);
            unwatch();
        });
    });

    describe('getInfo', () => {
        it('должен возвращать информацию о менеджере', () => {
            const info = packageTestingConfigManager.getInfo();
            expect(info).toBeDefined();
            expect(info.name).toBe('package-testing');
            expect(typeof info.hasCache).toBe('boolean');
        });
    });
});
