import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import DeploymentConfigManager, { DeploymentConfigManager as NamedDeploymentConfigManager } from '../index.js';

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

describe('DeploymentConfigManager', () => {
    let testConfigPath;
    let mockConfigContent;
    let mockStatResult;
    let manager;

    beforeEach(async () => {
        testConfigPath = path.join(__dirname, 'config.json');
        manager = new NamedDeploymentConfigManager();
        manager.configPath = testConfigPath;
        manager.clearCache(); // Ensure fresh state for each test

        mockConfigContent = {
            providers: {
                aws: { region: 'us-east-1' },
            },
            policies: {
                staging: { approvalRequired: true },
            },
            environments: {
                dev: { url: 'http://dev.example.com' },
            },
            metadata: {
                created: "2023-01-01T00:00:00.000Z",
                version: "1.0.0",
                description: "Test Deployment Config"
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

    it('should be an instance of DeploymentConfigManager', () => {
        expect(manager).toBeInstanceOf(DeploymentConfigManager);
        expect(new NamedDeploymentConfigManager()).toBeInstanceOf(NamedDeploymentConfigManager);
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
            expect(fs.readFile).not.toHaveBeenCalled();
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
            const newConfig = { ...mockConfigContent, providers: { azure: { region: 'eastus' } } };
            await manager.saveConfig(newConfig);
            expect(fs.writeFile).toHaveBeenCalledWith(testConfigPath, JSON.stringify(newConfig, null, 2), 'utf-8');
            expect(manager.cache).toEqual(newConfig);
        });

        it('should notify watchers on config save', async () => {
            const watcher = vi.fn();
            manager.addWatcher(watcher);
            const newConfig = { ...mockConfigContent, providers: { google: { region: 'europe-west1' } } };
            await manager.saveConfig(newConfig);
            expect(watcher).toHaveBeenCalledWith(newConfig);
        });

        it('should throw an error if saving fails', async () => {
            fs.writeFile.mockRejectedValue(new Error('Write error'));
            const newConfig = { ...mockConfigContent, providers: {} };
            await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
        });
    });

    describe('getDefaultConfig', () => {
        it('should return a default config object', () => {
            const defaultConfig = manager.getDefaultConfig();
            expect(defaultConfig).toBeInstanceOf(Object);
            expect(defaultConfig.providers).toEqual({});
            expect(defaultConfig.policies).toEqual({});
            expect(defaultConfig.environments).toEqual({});
        });
    });

    describe('getProvider', () => {
        it('should return a provider by name', async () => {
            const provider = await manager.getProvider('aws');
            expect(provider).toEqual(mockConfigContent.providers.aws);
        });

        it('should return null for a non-existent provider', async () => {
            const provider = await manager.getProvider('azure');
            expect(provider).toBeNull();
        });
    });

    describe('addProvider', () => {
        it('should add a new provider', async () => {
            const newProvider = { region: 'eu-west-1' };
            await manager.addProvider('google', newProvider);
            const config = await manager.getConfig(true);
            expect(config.providers.google).toEqual(newProvider);
        });

        it('should throw an error if provider already exists', async () => {
            const duplicateProvider = { region: 'us-east-1' };
            await expect(manager.addProvider('aws', duplicateProvider)).rejects.toThrow('Провайдер aws уже существует');
        });
    });

    describe('getPolicy', () => {
        it('should return a policy by name', async () => {
            const policy = await manager.getPolicy('staging');
            expect(policy).toEqual(mockConfigContent.policies.staging);
        });

        it('should return null for a non-existent policy', async () => {
            const policy = await manager.getPolicy('production');
            expect(policy).toBeNull();
        });
    });

    describe('addPolicy', () => {
        it('should add a new policy', async () => {
            const newPolicy = { approvalRequired: false, autoDeploy: true };
            await manager.addPolicy('production', newPolicy);
            const config = await manager.getConfig(true);
            expect(config.policies.production).toEqual(newPolicy);
        });
    });

    describe('addWatcher and notifyWatchers', () => {
        it('should add a watcher and notify it on config changes', async () => {
            const watcher = vi.fn();
            const unwatch = manager.addWatcher(watcher);

            const newConfig = { ...mockConfigContent, providers: { digitalocean: {} } };
            await manager.saveConfig(newConfig);

            expect(watcher).toHaveBeenCalledWith(newConfig);
            unwatch();

            await manager.saveConfig({ ...mockConfigContent, providers: { linode: {} } });
            expect(watcher).toHaveBeenCalledTimes(1);
        });

        it('should handle errors in watchers gracefully', async () => {
            const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
            const workingWatcher = vi.fn();

            manager.addWatcher(crashingWatcher);
            manager.addWatcher(workingWatcher);

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const newConfig = { ...mockConfigContent, providers: { vultr: {} } };
            await manager.saveConfig(newConfig);

            expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
            expect(workingWatcher).toHaveBeenCalledWith(newConfig);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации развертывания:', expect.any(Error));

            consoleErrorSpy.mockRestore();
        });
    });

    describe('clearCache', () => {
        it('should clear the cache', async () => {
            await manager.getConfig();
            expect(manager.cache).toBeDefined();
            expect(manager.lastModified).toBeDefined();

            manager.clearCache();
            expect(manager.cache).toBeNull();
            expect(manager.lastModified).toBeNull();
        });
    });

    describe('getInfo', () => {
        it('should return manager info', async () => {
            await manager.getConfig();
            const info = manager.getInfo();
            expect(info.name).toBe('deployment');
            expect(info.path).toBe(testConfigPath);
            expect(info.hasCache).toBe(true);
            expect(info.watchersCount).toBe(0);
            expect(info.lastModified).toBeDefined();
        });
    });
});
