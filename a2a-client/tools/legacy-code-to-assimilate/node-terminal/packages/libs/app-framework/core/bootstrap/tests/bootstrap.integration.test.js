const Bootstrap = require('../index.js');
const LoggerCore = require('../../../logging-reporting/core-logger/index.js'); // Updated path after libs reorganization
const ErrorHandler = require('../../error-handler/index.js');
const FileUtils = require('../../file-utils/index.js');
const path = require('path');
const fs = require('fs-extra');

describe('Bootstrap интеграционные тесты', () => {
  let bootstrap;
  let logger;
  let errorHandler;
  const testDir = path.join(__dirname, 'temp-bootstrap-test');
  const aliasesFilePath = path.join(testDir, 'aliases.json');
  const modulesPath = path.join(testDir, 'modules');
  const logFilePath = path.join(__dirname, '..\..\..\logging-reporting\core-logger\logs', 'bootstrap-integration.log'); // Updated path after libs reorganization

  beforeAll(async () => {
    // Создаем временную директорию для тестов
    await fs.ensureDir(testDir);
    await fs.ensureDir(modulesPath);

    logger = new LoggerCore({
      appName: 'BootstrapIntegrationTests',
      logLevel: 'debug',
      logFile: 'bootstrap-integration.log'
    });
    errorHandler = new ErrorHandler({ logger });

    // Создаем временный файл алиасов для тестов
    const testAliases = {
      '@testCore': path.join(testDir, 'testCore'),
      '@testUtils': path.join(testDir, 'testUtils')
    };
    await fs.writeJson(aliasesFilePath, testAliases);

    // Создаем моковые модули
    await fs.ensureDir(path.join(modulesPath, 'test-module-1'));
    await fs.writeFile(path.join(modulesPath, 'test-module-1', 'index.js'), 'export { name: \'test-module-1\' };');
    await fs.writeJson(path.join(modulesPath, 'test-module-1', 'package.json'), { name: 'test-module-1', version: '1.0.0' });

    await fs.ensureDir(path.join(modulesPath, 'test-module-2'));
    await fs.writeFile(path.join(modulesPath, 'test-module-2', 'index.js'), 'export { name: \'test-module-2\' };');

    bootstrap = new Bootstrap({
      logger,
      errorHandler,
      config: {
        aliasesPath: aliasesFilePath,
        modulesPath: modulesPath,
        autoLoad: true
      }
    });
  });

  afterAll(async () => {
    // Очищаем временную директорию и лог файл
    await fs.remove(testDir);
    await FileUtils.deleteFile(logFilePath);
  });

  test('должен успешно инициализировать Bootstrap, загружая алиасы и модули из реальной файловой системы', async () => {
    expect(bootstrap.isReady()).toBe(true);
    
    const aliases = bootstrap.getAliases();
    expect(aliases['@testCore']).toBe(path.join(testDir, 'testCore'));
    expect(aliases['@testUtils']).toBe(path.join(testDir, 'testUtils'));

    const modules = bootstrap.getModules();
    expect(modules['test-module-1']).toBeDefined();
    expect(modules['test-module-1'].name).toBe('test-module-1');
    expect(modules['test-module-1'].version).toBe('1.0.0');
    expect(modules['test-module-2']).toBeDefined();
    expect(modules['test-module-2'].name).toBe('test-module-2');
    
    // Проверяем логирование
    const logContent = await FileUtils.readFile(logFilePath);
    expect(logContent).toContain('Bootstrap система успешно инициализирована');
    expect(logContent).toContain('Aliases загружены из файла конфигурации');
    expect(logContent).toContain('Автоматическая загрузка модулей завершена');
  });

  test('должен корректно обрабатывать отсутствие файла алиасов, используя алиасы по умолчанию', async () => {
    await fs.remove(aliasesFilePath); // Удаляем тестовый файл алиасов

    const newBootstrap = new Bootstrap({
      logger,
      errorHandler,
      config: {
        aliasesPath: aliasesFilePath, // Указываем на несуществующий файл
        modulesPath: modulesPath,
        autoLoad: false // Отключаем автозагрузку модулей, чтобы сосредоточиться на алиасах
      }
    });
    await newBootstrap.initialize();

    const aliases = newBootstrap.getAliases();
    expect(aliases['@root']).toBeDefined(); // Проверяем алиас по умолчанию
    expect(aliases['@libs']).toBeDefined();

    // Проверяем логирование
    const logContent = await FileUtils.readFile(logFilePath);
    expect(logContent).toContain('Используется конфигурация алиасов по умолчанию');
  });
});
