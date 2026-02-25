/**
 * Тесты для NotificationsConfigManager
 * Тестирует функциональность управления конфигурацией уведомлений
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import notificationsConfigManager, { NotificationsConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('NotificationsConfigManager', () => {
    let testConfigPath;
    let originalConfigPath;

    beforeEach(async () => {
        originalConfigPath = notificationsConfigManager.configPath;
        testConfigPath = path.join(__dirname, 'test-notifications-config.json');
        
        const testConfig = {
            channels: {
                email: { enabled: true, recipients: ['test@example.com'], template: 'default' },
                slack: { enabled: false, webhookUrl: '' }
            },
            templates: {
                default: {
                    subject: 'Test Subject',
                    body: 'Test Body: {event}'
                }
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Test configuration'
            }
        };
        
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
        
        notificationsConfigManager.configPath = testConfigPath;
        notificationsConfigManager.clearCache();
    });

    afterEach(async () => {
        notificationsConfigManager.configPath = originalConfigPath;
        notificationsConfigManager.clearCache();
        try {
            await fs.unlink(testConfigPath);
        } catch (error) {}
    });

    describe('getConfig', () => {
        it('должен загружать конфигурацию уведомлений', async () => {
            const config = await notificationsConfigManager.getConfig();
            expect(config).toBeDefined();
            expect(config.channels.email.enabled).toBe(true);
            expect(config.templates.default).toBeDefined();
        });
    });

    describe('getChannelConfig', () => {
        it('должен возвращать конфигурацию канала по имени', async () => {
            const emailConfig = await notificationsConfigManager.getChannelConfig('email');
            expect(emailConfig).toBeDefined();
            expect(emailConfig.enabled).toBe(true);
        });

        it('должен возвращать null для несуществующего канала', async () => {
            const nonExistentChannel = await notificationsConfigManager.getChannelConfig('sms');
            expect(nonExistentChannel).toBeNull();
        });
    });

    describe('updateChannelConfig', () => {
        it('должен обновлять конфигурацию канала', async () => {
            await notificationsConfigManager.updateChannelConfig('email', { enabled: false });
            const emailConfig = await notificationsConfigManager.getChannelConfig('email');
            expect(emailConfig.enabled).toBe(false);
        });

        it('должен выбрасывать ошибку при обновлении несуществующего канала', async () => {
            await expect(notificationsConfigManager.updateChannelConfig('sms', { enabled: true }))
                .rejects.toThrow('Канал уведомлений sms не найден');
        });
    });

    describe('getTemplate', () => {
        it('должен возвращать шаблон по имени', async () => {
            const defaultTemplate = await notificationsConfigManager.getTemplate('default');
            expect(defaultTemplate).toBeDefined();
            expect(defaultTemplate.subject).toBe('Test Subject');
        });

        it('должен возвращать null для несуществующего шаблона', async () => {
            const nonExistentTemplate = await notificationsConfigManager.getTemplate('custom');
            expect(nonExistentTemplate).toBeNull();
        });
    });

    describe('addTemplate', () => {
        it('должен добавлять новый шаблон', async () => {
            const newTemplate = { subject: 'New Subject', body: 'New Body' };
            await notificationsConfigManager.addTemplate('newTemplate', newTemplate);
            const addedTemplate = await notificationsConfigManager.getTemplate('newTemplate');
            expect(addedTemplate).toBeDefined();
            expect(addedTemplate.subject).toBe('New Subject');
        });

        it('должен выбрасывать ошибку при добавлении существующего шаблона', async () => {
            const duplicateTemplate = { subject: 'Duplicate Subject', body: 'Duplicate Body' };
            await expect(notificationsConfigManager.addTemplate('default', duplicateTemplate))
                .rejects.toThrow('Шаблон default уже существует');
        });
    });

    describe('addWatcher', () => {
        it('должен вызывать наблюдателя при изменениях', async () => {
            let watcherCalled = false;
            const unwatch = notificationsConfigManager.addWatcher(() => { watcherCalled = true; });
            await notificationsConfigManager.updateChannelConfig('email', { recipients: ['new@example.com'] });
            expect(watcherCalled).toBe(true);
            unwatch();
        });
    });

    describe('getInfo', () => {
        it('должен возвращать информацию о менеджере', () => {
            const info = notificationsConfigManager.getInfo();
            expect(info).toBeDefined();
            expect(info.name).toBe('notifications');
            expect(typeof info.hasCache).toBe('boolean');
        });
    });
});
