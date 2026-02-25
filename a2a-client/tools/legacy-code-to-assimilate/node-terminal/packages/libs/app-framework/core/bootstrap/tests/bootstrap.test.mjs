/**
 * Тесты для Bootstrap
 * Модуль инициализации и запуска приложения
 */

import moduleAlias from 'module-alias';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rimraf } from 'rimraf';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_ROOT_DIR = path.join(__dirname, 'temp_root');
const TEST_PACKAGE_JSON_PATH = path.join(TEST_ROOT_DIR, 'package.json');

describe('module-alias-setup', () => {
  let addAliasSpy;
  let consoleErrorSpy;
  let processExitSpy;
  let fsExistsSyncSpy;

  // Временное изменение process.cwd() для имитации корневой директории проекта
  const originalCwd = process.cwd;
  beforeAll(() => {
    process.cwd = jest.fn(() => TEST_ROOT_DIR);
  });

  afterAll(() => {
    process.cwd = originalCwd;
  });

  beforeEach(async () => {
    // Очищаем моки
    jest.clearAllMocks();

    // Spy on console.error and process.exit
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Очищаем временную директорию перед каждым тестом
    await rimraf(TEST_ROOT_DIR);
    fs.mkdirSync(TEST_ROOT_DIR, { recursive: true });

    addAliasSpy = jest.spyOn(moduleAlias, 'addAlias');
    fsExistsSyncSpy = jest.spyOn(fs, 'existsSync');
  });

  afterEach(async () => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    addAliasSpy.mockRestore();
    fsExistsSyncSpy.mockRestore();
    await rimraf(TEST_ROOT_DIR);
  });

  test('should add aliases if package.json exists', async () => {
    // Создаем временный package.json
    fs.writeFileSync(TEST_PACKAGE_JSON_PATH, JSON.stringify({ name: 'test-project' }));

    // Импортируем модуль, чтобы он выполнился
    // Примечание: Для ES-модулей импорт кэшируется. Чтобы избежать этого, можно использовать динамический импорт
    // или сбрасывать кэш, но в Jest resetModules() уже выполняет эту роль.
    const { default: setupModuleAliases } = await import('../module-alias-setup.js');

    expect(fsExistsSyncSpy).toHaveBeenCalledWith(TEST_PACKAGE_JSON_PATH);
    expect(addAliasSpy).toHaveBeenCalledWith('@root', path.join(__dirname, '../../..'));
    expect(addAliasSpy).toHaveBeenCalledWith('@libs', path.join(__dirname, '..', '..'));
    expect(addAliasSpy).toHaveBeenCalledWith('@apps', path.join(__dirname, '..', '..', '..', 'apps'));
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(processExitSpy).not.toHaveBeenCalled();
  });

  test('should log an error and exit if package.json does not exist', async () => {
    // Убеждаемся, что package.json не существует
    await rimraf(TEST_PACKAGE_JSON_PATH);

    // Импортируем модуль, чтобы он выполнился
    const { default: setupModuleAliases } = await import('../module-alias-setup.js');

    expect(fsExistsSyncSpy).toHaveBeenCalledWith(TEST_PACKAGE_JSON_PATH);
    expect(addAliasSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] package.json not found at:', path.join(__dirname, '../../../../package.json'));
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
