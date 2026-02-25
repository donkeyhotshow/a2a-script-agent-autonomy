import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import AuditConfigManager, { AuditConfigManager as NamedAuditConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock fs/promises module
vi.mock('fs/promises', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        readFile: vi.fn(),
        writeFile: vi.fn(),
        stat: vi.fn(),
        unlink: vi.fn(),
    };
});

describe('AuditConfigManager', () => {
    let testConfigPath;
    let mockConfigContent;
    let mockStatResult;
    let manager;

    beforeEach(async () => {
        testConfigPath = path.join(__dirname, 'config.json');
        manager = new NamedAuditConfigManager();
        manager.configPath = testConfigPath;
        manager.clearCache(); // Ensure fresh state for each test

        mockConfigContent = {
            users: ["admin", "editor"],
            actions: ["created", "deleted"],
            detailsTemplates: [],
            metadata: {
                created: "2023-01-01T00:00:00.000Z",
                version: "1.0.0",
                description: "Test Audit Config"
            }
        };

        mockStatResult = {
            mtime: {
                getTime: () => Date.now()
            }
        };

        fs.readFile.mockResolvedValue(JSON.stringify(mockConfigContent));
        fs.writeFile.mockResolvedValue(undefined);
        fs.stat.mockResolvedValue(mockStatResult);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should be an instance of AuditConfigManager', () => {
        expect(manager).toBeInstanceOf(AuditConfigManager);
        expect(new NamedAuditConfigManager()).toBeInstanceOf(NamedAuditConfigManager);
    });

    describe('getConfig', () => {
        it('should load config from file if cache is empty', async () => {
            const config = await manager.getConfig();
            expect(config).toEqual(mockConfigContent);
            expect(fs.readFile).toHaveBeenCalledWith(testConfigPath, 'utf-8');
        });

        it('should use cache if available and not forced reload', async () => {
            manager.cache = mockConfigContent;
            manager.lastModified = mockStatResult.mtime.getTime();
            const config = await manager.getConfig(false);
            expect(config).toEqual(mockConfigContent);
            expect(fs.readFile).not.toHaveBeenCalled(); // Should not read from file
        });

        it('should reload config if forceReload is true', async () => {
            manager.cache = { someOtherData: true };
            const config = await manager.getConfig(true);
            expect(config).toEqual(mockConfigContent);
            expect(fs.readFile).toHaveBeenCalled();
        });

        it('should return default config on error during load', async () => {
            fs.readFile.mockRejectedValue(new Error('File not found'));
            const config = await manager.getConfig();
            expect(config).toEqual(manager.getDefaultConfig());
            expect(fs.readFile).toHaveBeenCalled();
        });
    });

    describe('loadConfig', () => {
        it('should load config from file', async () => {
            const config = await manager.loadConfig();
            expect(config).toEqual(mockConfigContent);
            expect(fs.readFile).toHaveBeenCalledWith(testConfigPath, 'utf-8');
        });

        it('should return default config if file not found', async () => {
            fs.readFile.mockRejectedValue(new Error('File not found'));
            const config = await manager.loadConfig();
            expect(config).toEqual(manager.getDefaultConfig());
        });

        it('should handle invalid JSON gracefully by returning default config', async () => {
            fs.readFile.mockResolvedValue('invalid json');
            const config = await manager.loadConfig();
            expect(config).toEqual(manager.getDefaultConfig());
        });
    });

    describe('saveConfig', () => {
        it('should save config to file and update cache', async () => {
            const newConfig = { ...mockConfigContent, users: ["test"] };
            await manager.saveConfig(newConfig);
            expect(fs.writeFile).toHaveBeenCalledWith(testConfigPath, JSON.stringify(newConfig, null, 2), 'utf-8');
            expect(manager.cache).toEqual(newConfig);
        });

        it('should notify watchers on config save', async () => {
            const watcher = vi.fn();
            manager.addWatcher(watcher);
            const newConfig = { ...mockConfigContent, users: ["test"] };
            await manager.saveConfig(newConfig);
            expect(watcher).toHaveBeenCalledWith(newConfig);
        });

        it('should throw an error if saving fails', async () => {
            fs.writeFile.mockRejectedValue(new Error('Write error'));
            const newConfig = { ...mockConfigContent, users: ["test"] };
            await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
        });
    });

    describe('getDefaultConfig', () => {
        it('should return a default config object', () => {
            const defaultConfig = manager.getDefaultConfig();
            expect(defaultConfig).toBeInstanceOf(Object);
            expect(defaultConfig.users).toContain('admin');
            expect(defaultConfig.actions).toContain('создал проект');
            expect(defaultConfig.metadata).toBeDefined();
        });
    });

    describe('addUser', () => {
        it('should add a new user if not already present', async () => {
            await manager.addUser('newUser');
            const config = await manager.getConfig(true); // Force reload to get updated config
            expect(config.users).toContain('newUser');
        });

        it('should throw an error if user already exists', async () => {
            await expect(manager.addUser('admin')).rejects.toThrow('Пользователь admin уже существует');
        });
    });

    describe('removeUser', () => {
        it('should remove an existing user', async () => {
            await manager.removeUser('admin');
            const config = await manager.getConfig(true);
            expect(config.users).not.toContain('admin');
            expect(config.users).toContain('editor'); // Ensure other users are intact
        });

        it('should do nothing if user does not exist', async () => {
            const initialConfig = await manager.getConfig();
            await manager.removeUser('nonExistentUser');
            const finalConfig = await manager.getConfig(true);
            expect(finalConfig.users).toEqual(initialConfig.users); // No change
        });
    });

    describe('addAction', () => {
        it('should add a new action if not already present', async () => {
            await manager.addAction('newAction');
            const config = await manager.getConfig(true);
            expect(config.actions).toContain('newAction');
        });

        it('should not add action if it already exists', async () => {
            await manager.addAction('created');
            const config = await manager.getConfig(true);
            expect(config.actions.filter(a => a === 'created').length).toBe(1); // Should not add duplicate
        });
    });

    describe('addWatcher and notifyWatchers', () => {
        it('should add a watcher and notify it on config changes', async () => {
            const watcher = vi.fn();
            const unwatch = manager.addWatcher(watcher);

            const newConfig = { ...mockConfigContent, users: ['watcherUser'] };
            await manager.saveConfig(newConfig);

            expect(watcher).toHaveBeenCalledWith(newConfig);
            unwatch(); // Remove watcher

            await manager.saveConfig({ ...mockConfigContent, users: ['anotherUser'] });
            expect(watcher).toHaveBeenCalledTimes(1); // Should not be called again
        });

        it('should handle errors in watchers gracefully', async () => {
            const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
            const workingWatcher = vi.fn();

            manager.addWatcher(crashingWatcher);
            manager.addWatcher(workingWatcher);

            // Mock console.error to check if it's called
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const newConfig = { ...mockConfigContent, users: ['errorUser'] };
            await manager.saveConfig(newConfig);

            expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
            expect(workingWatcher).toHaveBeenCalledWith(newConfig);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации аудита:', expect.any(Error));

            consoleErrorSpy.mockRestore(); // Restore original console.error
        });
    });

    describe('clearCache', () => {
        it('should clear the cache', async () => {
            await manager.getConfig(); // Populate cache
            expect(manager.cache).toBeDefined();
            expect(manager.lastModified).toBeDefined();

            manager.clearCache();
            expect(manager.cache).toBeNull();
            expect(manager.lastModified).toBeNull();
        });
    });

    describe('getInfo', () => {
        it('should return manager info', async () => {
            await manager.getConfig(); // Populate cache for hasCache and lastModified
            const info = manager.getInfo();
            expect(info.name).toBe('audit');
            expect(info.path).toBe(testConfigPath);
            expect(info.hasCache).toBe(true);
            expect(info.watchersCount).toBe(0); // No watchers added yet
            expect(info.lastModified).toBeDefined();
        });
    });
});
