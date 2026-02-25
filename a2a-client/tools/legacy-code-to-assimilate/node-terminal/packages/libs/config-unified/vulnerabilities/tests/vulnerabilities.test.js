/**
 * Тесты для VulnerabilitiesConfigManager
 * Тестирует функциональность управления конфигурацией уязвимостей
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const { VulnerabilitiesConfigManager } = require('../index.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_CONFIG_PATH = path.join(__dirname, 'test-config.json');
const TEST_SCHEMA_PATH = path.join(__dirname, '../schema.json'); // Schema is in the parent directory

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
  },
  readFile: vi.fn(),
  writeFile: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

describe('VulnerabilitiesConfigManager', () => {
  let manager;
  let mockConfigContent;
  let mockSchemaContent;
  let mockStatResult;
  let originalConsoleError;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(async () => {
    originalConsoleError = console.error;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockConfigContent = {
      vulnerabilities: [
        {
          id: 'VULN-001',
          title: 'SQL Injection Vulnerability',
          description: 'Potential SQL injection in user input processing.',
          severity: 'High',
          status: 'Open',
          foundDate: '2023-01-15T10:00:00.000Z',
          assignedTo: 'devteam',
          references: ['CVE-2023-1234']
        },
        {
          id: 'VULN-002',
          title: 'XSS in User Profile',
          description: 'Cross-site scripting vulnerability in user profile display.',
          severity: 'Medium',
          status: 'InProgress',
          foundDate: '2023-02-20T14:30:00.000Z',
          assignedTo: 'frontend-team'
        }
      ],
      metadata: {
        created: '2023-01-01T00:00:00.000Z',
        version: '1.0.0',
        description: 'Test Vulnerabilities Configuration'
      }
    };

    // Using the schema from the vulnerabilities directory
    mockSchemaContent = {
      type: "object",
      properties: {
        vulnerabilities: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              severity: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
              status: { type: "string", enum: ["Open", "InProgress", "Resolved", "Closed"] },
              foundDate: { type: "string", format: "date-time" },
              resolvedDate: { type: "string", format: "date-time" },
              assignedTo: { type: "string" },
              references: { type: "array", items: { type: "string" } }
            },
            required: ["id", "title", "description", "severity", "status", "foundDate"],
            additionalProperties: false
          }
        },
        metadata: {
          type: "object",
          properties: {
            created: { type: "string", format: "date-time" },
            version: { type: "string" },
            description: { type: "string" }
          },
          required: ["created", "version", "description"],
          additionalProperties: false
        }
      },
      required: ["vulnerabilities", "metadata"],
      additionalProperties: false
    };

    mockStatResult = {
      mtime: {
        getTime: () => Date.now(),
      },
    };

    readFileSync.mockImplementation((filePath, encoding) => {
        if (filePath === TEST_SCHEMA_PATH) {
            return JSON.stringify(mockSchemaContent);
        }
        return '{}';
    });

    fs.readFile.mockResolvedValue(JSON.stringify(mockConfigContent));
    fs.writeFile.mockResolvedValue(undefined);
    fs.stat.mockResolvedValue(mockStatResult);

    manager = new VulnerabilitiesConfigManager();
    manager.configPath = TEST_CONFIG_PATH;
    manager.schemaPath = TEST_SCHEMA_PATH;
    manager.clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
    console.error = originalConsoleError;
    console.warn.mockRestore();
  });

  it('должен корректно инициализироваться', () => {
    expect(manager).toBeInstanceOf(VulnerabilitiesConfigManager);
    expect(manager.configPath).toBe(TEST_CONFIG_PATH);
    expect(manager.schemaPath).toBe(TEST_SCHEMA_PATH);
    expect(manager.validate).toBeDefined();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('должен выводить ошибку, если схема не загружена или не скомпилирована', () => {
    vi.clearAllMocks();
    readFileSync.mockImplementation(() => { throw new Error('Schema file not found'); });

    const brokenManager = new VulnerabilitiesConfigManager();
    expect(brokenManager.validate).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load or compile schema for vulnerabilities config: Schema file not found'));
  });

  describe('getConfig', () => {
    it('должен загружать конфигурацию из файла, если кэш пуст', async () => {
      const config = await manager.getConfig();
      expect(config).toEqual(mockConfigContent);
      expect(fs.readFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, 'utf-8');
    });

    it('должен использовать кэш, если доступен и не принудительная перезагрузка', async () => {
      manager.cache = mockConfigContent;
      manager.lastModified = mockStatResult.mtime.getTime();
      const config = await manager.getConfig(false);
      expect(config).toEqual(mockConfigContent);
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('должен перезагружать конфигурацию, если forceReload истинно', async () => {
      manager.cache = { someOtherData: true };
      const config = await manager.getConfig(true);
      expect(config).toEqual(mockConfigContent);
      expect(fs.readFile).toHaveBeenCalled();
    });

    it('должен возвращать конфигурацию по умолчанию при ошибке загрузки', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      const config = await manager.getConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(fs.readFile).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка получения конфигурации уязвимостей:', expect.any(Error));
    });
  });

  describe('loadConfig', () => {
    it('должен загружать конфигурацию из файла', async () => {
      const config = await manager.loadConfig();
      expect(config).toEqual(mockConfigContent);
      expect(fs.readFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, 'utf-8');
    });

    it('должен возвращать конфигурацию по умолчанию, если файл не найден', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию уязвимостей, используется по умолчанию');
    });

    it('должен обрабатывать невалидный JSON, возвращая конфигурацию по умолчанию', async () => {
      fs.readFile.mockResolvedValue('invalid json');
      const config = await manager.loadConfig();
      expect(config).toEqual(manager.getDefaultConfig());
      expect(consoleWarnSpy).toHaveBeenCalledWith('Не удалось загрузить конфигурацию уязвимостей, используется по умолчанию');
    });

    it('должен выводить ошибку и использовать конфигурацию, если валидация не пройдена', async () => {
      const invalidConfig = { ...mockConfigContent, vulnerabilities: [{ ...mockConfigContent.vulnerabilities[0], severity: 'Invalid' }] };
      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const config = await manager.loadConfig();
      expect(config).toEqual(invalidConfig);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("Vulnerabilities Configuration failed validation: data/vulnerabilities/0/severity must be equal to one of the allowed values"));
    });
  });

  describe('saveConfig', () => {
    it('должен сохранять конфигурацию в файл и обновлять кэш', async () => {
      const newConfig = { ...mockConfigContent, vulnerabilities: [] };
      await manager.saveConfig(newConfig);
      expect(fs.writeFile).toHaveBeenCalledWith(TEST_CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
      expect(manager.cache).toEqual(newConfig);
    });

    it('должен уведомлять наблюдателей при сохранении конфигурации', async () => {
      const watcher = vi.fn();
      manager.addWatcher(watcher);
      const newConfig = { ...mockConfigContent, vulnerabilities: [{ id: 'NEW-VULN', title: 'New Vulnerability', description: 'New', severity: 'Low', status: 'Open', foundDate: '2023-03-01T00:00:00.000Z' }] };
      await manager.saveConfig(newConfig);
      expect(watcher).toHaveBeenCalledWith(newConfig);
    });

    it('должен выбрасывать ошибку, если сохранение не удалось', async () => {
      fs.writeFile.mockRejectedValue(new Error('Write error'));
      const newConfig = { ...mockConfigContent, vulnerabilities: [] };
      await expect(manager.saveConfig(newConfig)).rejects.toThrow('Write error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка сохранения конфигурации уязвимостей:', expect.any(Error));
    });
  });

  describe('getDefaultConfig', () => {
    it('должен возвращать объект конфигурации по умолчанию', () => {
      const defaultConfig = manager.getDefaultConfig();
      expect(defaultConfig).toBeInstanceOf(Object);
      expect(defaultConfig.vulnerabilities).toEqual([]);
      expect(defaultConfig.metadata).toBeDefined();
    });
  });

  describe('getVulnerabilities', () => {
    it('должен возвращать все уязвимости', async () => {
      const vulnerabilities = await manager.getVulnerabilities();
      expect(vulnerabilities).toEqual(mockConfigContent.vulnerabilities);
    });
  });

  describe('getVulnerability', () => {
    it('должен возвращать уязвимость по ID', async () => {
      const vuln = await manager.getVulnerability('VULN-001');
      expect(vuln).toEqual(mockConfigContent.vulnerabilities[0]);
    });

    it('должен возвращать null для несуществующей уязвимости', async () => {
      const nonExistentVuln = await manager.getVulnerability('NON-EXISTENT');
      expect(nonExistentVuln).toBeNull();
    });
  });

  describe('addVulnerability', () => {
    it('должен добавлять новую уязвимость', async () => {
      const newVuln = {
        id: 'VULN-003',
        title: 'New Vulnerability',
        description: 'A newly discovered vulnerability.',
        severity: 'Low',
        status: 'Open',
        foundDate: '2023-03-01T00:00:00.000Z'
      };
      await manager.addVulnerability(newVuln);
      const config = await manager.getConfig(true);
      expect(config.vulnerabilities).toContainEqual(newVuln);
    });

    it('должен выбрасывать ошибку, если новая уязвимость не имеет необходимых полей', async () => {
      const invalidVuln = { id: 'VULN-004', title: 'Missing Severity' };
      await expect(manager.addVulnerability(invalidVuln)).rejects.toThrow('Уязвимость должна иметь ID, заголовок и уровень серьезности');
    });
  });

  describe('updateVulnerability', () => {
    it('должен обновлять существующую уязвимость', async () => {
      const updates = { status: 'Resolved', resolvedDate: '2023-03-10T10:00:00.000Z' };
      await manager.updateVulnerability('VULN-001', updates);
      const updatedConfig = await manager.getConfig(true);
      expect(updatedConfig.vulnerabilities[0].status).toBe('Resolved');
      expect(updatedConfig.vulnerabilities[0].resolvedDate).toBe('2023-03-10T10:00:00.000Z');
    });

    it('должен выбрасывать ошибку, если уязвимость для обновления не найдена', async () => {
      const updates = { status: 'Resolved' };
      await expect(manager.updateVulnerability('NON-EXISTENT', updates)).rejects.toThrow('Уязвимость с ID NON-EXISTENT не найдена');
    });
  });

  describe('addWatcher и notifyWatchers', () => {
    it('должен добавлять наблюдателя и уведомлять его об изменениях конфигурации', async () => {
      const watcher = vi.fn();
      const unwatch = manager.addWatcher(watcher);

      const newVuln = {
        id: 'VULN-003',
        title: 'New Vulnerability',
        description: 'A newly discovered vulnerability.',
        severity: 'Low',
        status: 'Open',
        foundDate: '2023-03-01T00:00:00.000Z'
      };
      await manager.addVulnerability(newVuln);

      expect(watcher).toHaveBeenCalledWith(expect.objectContaining({
        vulnerabilities: expect.arrayContaining([expect.objectContaining({ id: 'VULN-003' })])
      }));
      unwatch();

      await manager.addVulnerability({
        id: 'VULN-004',
        title: 'Another Vulnerability',
        description: 'Another new vulnerability.',
        severity: 'High',
        status: 'Open',
        foundDate: '2023-03-02T00:00:00.000Z'
      });
      expect(watcher).toHaveBeenCalledTimes(1);
    });

    it('должен корректно обрабатывать ошибки в наблюдателях', async () => {
      const crashingWatcher = vi.fn(() => { throw new Error('Watcher error'); });
      const workingWatcher = vi.fn();

      manager.addWatcher(crashingWatcher);
      manager.addWatcher(workingWatcher);

      const newVuln = {
        id: 'VULN-003',
        title: 'New Vulnerability',
        description: 'A newly discovered vulnerability.',
        severity: 'Low',
        status: 'Open',
        foundDate: '2023-03-01T00:00:00.000Z'
      };
      await manager.addVulnerability(newVuln);

      expect(crashingWatcher).toHaveBeenCalledWith(expect.any(Object));
      expect(workingWatcher).toHaveBeenCalledWith(expect.any(Object));
      expect(consoleErrorSpy).toHaveBeenCalledWith('Ошибка в наблюдателе конфигурации уязвимостей:', expect.any(Error));
    });
  });

  describe('clearCache', () => {
    it('должен очищать кэш', async () => {
      await manager.getConfig();
      expect(manager.cache).toBeDefined();
      expect(manager.lastModified).toBeDefined();

      manager.clearCache();
      expect(manager.cache).toBeNull();
      expect(manager.lastModified).toBeNull();
    });
  });

  describe('getInfo', () => {
    it('должен возвращать информацию о менеджере', async () => {
      await manager.getConfig();
      const info = manager.getInfo();
      expect(info.name).toBe('vulnerabilities');
      expect(info.path).toBe(TEST_CONFIG_PATH);
      expect(info.hasCache).toBe(true);
      expect(info.watchersCount).toBe(0);
      expect(info.lastModified).toBeDefined();
    });
  });
});
