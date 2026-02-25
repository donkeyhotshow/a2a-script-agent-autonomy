import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import AutomationConfigManager, { AutomationConfigManager as NamedAutomationConfigManager } from '../index.js';

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

describe('AutomationConfigManager', () => {
    let testConfigPath;
    let mockConfigContent;
    let mockStatResult;
    let manager;

    beforeEach(async () => {
        testConfigPath = path.join(__dirname, 'config.json');
        manager = new NamedAutomationConfigManager();
        manager.configPath = testConfigPath;
        manager.clearCache(); // Ensure fresh state for each test

        mockConfigContent = {
            scripts: {
                script1: { id: 'script1', name: 'Script One', enabled: true },
            },
            workflows: {
                workflow1: { id: 'workflow1', name: 'Workflow One', enabled: true },
            },
            triggers: {
                webhook: {},
                schedule: {}
            },
            settings: {
                maxConcurrentJobs: 5,
                defaultTimeout: 1800,
                defaultRetries: 3,
                notificationChannels: {
                    email: { enabled: true, recipients: [] },
                    slack: { enabled: false, webhook: "" },
                    telegram: { enabled: false, botToken: "", chatId: "" }
                },
                logging: {
                    level: "info",
                    retention: "30d",
                    maxSize: "100MB"
                }
            },
            metadata: {
                created: "2023-01-01T00:00:00.000Z",
                version: "1.0.0",
                description: "Test Automation Config"
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

    it('should be an instance of AutomationConfigManager', () => {
        expect(manager).toBeInstanceOf(AutomationConfigManager);
        expect(new NamedAutomationConfigManager()).toBeInstanceOf(NamedAutomationConfigManager);
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
            const newConfig = { ...mockConfigContent, scripts: { script1: { id: 'script1', name: 'Updated Script', enabled: false } } };
            await manager.saveConfig(newConfig);
            expect(fs.writeFile).toHaveBeenCalledWith(testConfigPath, JSON.stringify(newConfig, null, 2), 'utf-8');
            expect(manager.cache).toEqual(newConfig);
        });

        it('should notify watchers on config save', async () => {
            const watcher = vi.fn();
            manager.addWatcher(watcher);
            const newConfig = { ...mockConfigContent, scripts: { script1: { id: 'script1', name: 'Watcher Script', enabled: true } } };
            await manager.saveConfig(newConfig);
            expect(watcher).toHaveBeenCalledWith(newConfig);
        });

        it('should throw an error if saving fails', async () => {
            fs.writeFile.mockRejectedValue(new Error('Write error'));
            const newConfig = { ...mockConfigContent, scripts: {} };
            await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
        });
    });

    describe('getDefaultConfig', () => {
        it('should return a default config object', () => {
            const defaultConfig = manager.getDefaultConfig();
            expect(defaultConfig).toBeInstanceOf(Object);
            expect(defaultConfig.scripts).toEqual({});
            expect(defaultConfig.workflows).toEqual({});
            expect(defaultConfig.settings.maxConcurrentJobs).toBe(5);
        });
    });

    describe('getScript', () => {
        it('should return a script by ID', async () => {
            const script = await manager.getScript('script1');
            expect(script).toEqual(mockConfigContent.scripts.script1);
        });

        it('should return null for a non-existent script', async () => {
            const script = await manager.getScript('nonExistent');
            expect(script).toBeNull();
        });
    });

    describe('addScript', () => {
        it('should add a new script', async () => {
            const newScriptConfig = { name: 'New Script', code: 'console.log(\"hello\")' };
            await manager.addScript('script2', newScriptConfig);
            const config = await manager.getConfig(true);
            expect(config.scripts.script2).toBeDefined();
            expect(config.scripts.script2.name).toBe('New Script');
            expect(config.scripts.script2.enabled).toBe(true);
        });

        it('should throw an error if script ID already exists', async () => {
            const duplicateScriptConfig = { name: 'Duplicate Script' };
            await expect(manager.addScript('script1', duplicateScriptConfig)).rejects.toThrow('Скрипт с ID script1 уже существует');
        });

        it('should throw an error if script name is missing', async () => {
            const scriptWithoutName = { code: 'console.log(\"no name\")' };
            await expect(manager.addScript('scriptWithNoName', scriptWithoutName)).rejects.toThrow('Скрипт должен иметь имя');
        });
    });

    describe('removeScript', () => {
        it('should remove an existing script', async () => {
            await manager.removeScript('script1');
            const config = await manager.getConfig(true);
            expect(config.scripts.script1).toBeUndefined();
        });

        it('should do nothing if script does not exist', async () => {
            const initialConfig = await manager.getConfig();
            await manager.removeScript('nonExistentScript');
            const finalConfig = await manager.getConfig(true);
            expect(finalConfig.scripts).toEqual(initialConfig.scripts);
        });
    });

    describe('getWorkflow', () => {
        it('should return a workflow by ID', async () => {
            const workflow = await manager.getWorkflow('workflow1');
            expect(workflow).toEqual(mockConfigContent.workflows.workflow1);
        });

        it('should return null for a non-existent workflow', async () => {
            const workflow = await manager.getWorkflow('nonExistentWorkflow');
            expect(workflow).toBeNull();
        });
    });

    describe('addWorkflow', () => {
        it('should add a new workflow', async () => {
            const newWorkflowConfig = { name: 'New Workflow', steps: ['step1', 'step2'] };
            await manager.addWorkflow('workflow2', newWorkflowConfig);
            const config = await manager.getConfig(true);
            expect(config.workflows.workflow2).toBeDefined();
            expect(config.workflows.workflow2.name).toBe('New Workflow');
            expect(config.workflows.workflow2.enabled).toBe(true);
        });
    });

    describe('getEnabledScripts', () => {
        it('should return only enabled scripts', async () => {
            const newScript = { id: 'script2', name: 'Disabled Script', enabled: false };
            await manager.addScript('script2', newScript);
            const enabledScripts = await manager.getEnabledScripts();
            expect(enabledScripts.length).toBe(1);
            expect(enabledScripts[0].id).toBe('script1');
        });
    });

    describe('getEnabledWorkflows', () => {
        it('should return only enabled workflows', async () => {
            const newWorkflow = { id: 'workflow2', name: 'Disabled Workflow', enabled: false };
            await manager.addWorkflow('workflow2', newWorkflow);
            const enabledWorkflows = await manager.getEnabledWorkflows();
            expect(enabledWorkflows.length).toBe(1);
            expect(enabledWorkflows[0].id).toBe('workflow1');
        });
    });

    describe('updateSettings', () => {
        it('should update automation settings', async () => {
            const newSettings = {
                maxConcurrentJobs: 10,
                notificationChannels: {
                    email: { enabled: false },
                    slack: { enabled: true, webhook: "test_webhook" }
                }
            };
            await manager.updateSettings(newSettings);
            const config = await manager.getConfig(true);
            expect(config.settings.maxConcurrentJobs).toBe(10);
            expect(config.settings.notificationChannels.email.enabled).toBe(false);
            expect(config.settings.notificationChannels.slack.enabled).toBe(true);
            expect(config.settings.notificationChannels.slack.webhook).toBe('test_webhook');
        });
    });

    describe('addWatcher and notifyWatchers', () => {
        it('should add a watcher and notify it on config changes', async () => {
            const watcher = vi.fn();
            const unwatch = manager.addWatcher(watcher);

            const newConfig = { ...mockConfigContent, settings: { defaultTimeout: 100 } };
            await manager.saveConfig(newConfig);

            expect(watcher).toHaveBeenCalledWith(newConfig);
            unwatch();

            await manager.saveConfig({ ...mockConfigContent, settings: { defaultTimeout: 200 } });
            expect(watcher).toHaveBeenCalledTimes(1);
        });

        it('should handle errors in watchers gracefully', async () => {
            const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
            const workingWatcher = vi.fn();

            manager.addWatcher(crashingWatcher);
            manager.addWatcher(workingWatcher);

            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const newConfig = { ...mockConfigContent, settings: { defaultTimeout: 300 } };
            await manager.saveConfig(newConfig);

            expect(crashingWatcher).toHaveBeenCalledWith(newConfig);
            expect(workingWatcher).toHaveBeenCalledWith(newConfig);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации автоматизации:', expect.any(Error));

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
            expect(info.name).toBe('automation');
            expect(info.path).toBe(testConfigPath);
            expect(info.hasCache).toBe(true);
            expect(info.watchersCount).toBe(0);
            expect(info.lastModified).toBeDefined();
        });
    });
});
