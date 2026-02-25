/**
 * Тесты для ComplianceConfigManager
 * Тестирует функциональность управления конфигурацией соответствия
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import complianceConfigManager, { ComplianceConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ComplianceConfigManager', () => {
    let testConfigPath;
    let originalConfigPath;

    beforeEach(async () => {
        originalConfigPath = complianceConfigManager.configPath;
        testConfigPath = path.join(__dirname, 'test-compliance-config.json');
        
        const testConfig = {
            policies: [
                {
                    id: "POLICY-001",
                    name: "Политика Паролей",
                    description: "Требования к сложности и периодичности смены паролей.",
                    category: "Authentication"
                }
            ],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Test configuration'
            }
        };
        
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
        
        complianceConfigManager.configPath = testConfigPath;
        complianceConfigManager.clearCache();
    });

    afterEach(async () => {
        complianceConfigManager.configPath = originalConfigPath;
        complianceConfigManager.clearCache();
        try {
            await fs.unlink(testConfigPath);
        } catch (error) {}
    });

    describe('getConfig', () => {
        it('должен загружать конфигурацию соответствия', async () => {
            const config = await complianceConfigManager.getConfig();
            expect(config).toBeDefined();
            expect(config.policies.length).toBe(1);
            expect(config.policies[0].id).toBe('POLICY-001');
        });
    });

    describe('getPolicies', () => {
        it('должен возвращать список политик', async () => {
            const policies = await complianceConfigManager.getPolicies();
            expect(policies).toBeDefined();
            expect(policies.length).toBe(1);
            expect(policies[0].name).toBe('Политика Паролей');
        });
    });

    describe('getPolicy', () => {
        it('должен возвращать политику по ID', async () => {
            const policy = await complianceConfigManager.getPolicy('POLICY-001');
            expect(policy).toBeDefined();
            expect(policy.name).toBe('Политика Паролей');
        });

        it('должен возвращать null для несуществующей политики', async () => {
            const policy = await complianceConfigManager.getPolicy('NON-EXISTENT');
            expect(policy).toBeNull();
        });
    });

    describe('addPolicy', () => {
        it('должен добавлять новую политику', async () => {
            const newPolicy = { id: 'POLICY-004', name: 'Новая Политика', category: 'General' };
            await complianceConfigManager.addPolicy(newPolicy);
            const policies = await complianceConfigManager.getPolicies();
            expect(policies.length).toBe(2);
            expect(policies.find(p => p.id === 'POLICY-004')).toBeDefined();
        });

        it('должен выбрасывать ошибку при добавлении политики без ID или имени', async () => {
            const invalidPolicy = { name: 'Неправильная Политика' };
            await expect(complianceConfigManager.addPolicy(invalidPolicy))
                .rejects.toThrow('Политика должна иметь ID и имя');
        });
    });

    describe('updatePolicy', () => {
        it('должен обновлять существующую политику', async () => {
            await complianceConfigManager.updatePolicy('POLICY-001', { category: 'Security' });
            const policy = await complianceConfigManager.getPolicy('POLICY-001');
            expect(policy.category).toBe('Security');
        });

        it('должен выбрасывать ошибку при обновлении несуществующей политики', async () => {
            await expect(complianceConfigManager.updatePolicy('NON-EXISTENT', { category: 'General' }))
                .rejects.toThrow('Политика с ID NON-EXISTENT не найдена');
        });
    });

    describe('addWatcher', () => {
        it('должен вызывать наблюдателя при изменениях', async () => {
            let watcherCalled = false;
            const unwatch = complianceConfigManager.addWatcher(() => { watcherCalled = true; });
            await complianceConfigManager.addPolicy({ id: 'POLICY-005', name: 'Watcher Policy', category: 'Test' });
            expect(watcherCalled).toBe(true);
            unwatch();
        });
    });

    describe('getInfo', () => {
        it('должен возвращать информацию о менеджере', () => {
            const info = complianceConfigManager.getInfo();
            expect(info).toBeDefined();
            expect(info.name).toBe('compliance');
            expect(typeof info.hasCache).toBe('boolean');
        });
    });
});
