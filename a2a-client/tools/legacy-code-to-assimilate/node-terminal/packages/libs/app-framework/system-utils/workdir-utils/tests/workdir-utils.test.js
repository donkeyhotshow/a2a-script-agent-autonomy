jest.mock('../../shared/session-vars/src/session-vars.cjs', () => ({
  sessionVars: {
    getProjectWorkspace: jest.fn(),
    hasProjectWorkspace: jest.fn(),
    setProjectWorkspace: jest.fn(),
  },
}));

const { sessionVars } = require('../../shared/session-vars/src/session-vars.cjs');

const { getLaunchDir, getCurrentDir, setCurrentDir, expandPath, getProjectRoot, getConsumerId, resetInitialization, isProjectRoot, findProjectRoot, resolveDefaultWorkdir } = require('../src/workdir-utils');
const { PathUtils } = require('../../path-utils/src/path-utils');
const pathUtils = new PathUtils(); // Создаем экземпляр PathUtils
const path = require('path');
const fs = require('fs').promises;

describe('Workdir Utils', () => {
  const originalCwd = process.cwd();
  const originalEnv = process.env;
  const tempTestDir = path.join(__dirname, 'temp-workdir-test');
  const projectRootMarker = '.git';

  beforeEach(async () => {
    // Создаем временную директорию для тестов
    await fs.mkdir(tempTestDir, { recursive: true });
    // Создаем маркер для имитации корневой директории проекта
    await fs.writeFile(path.join(tempTestDir, projectRootMarker), '');
    
    process.chdir(originalCwd); // Убедимся, что начинаем с известной cwd перед установкой tempDir
    // Используем функцию модуля для установки cwd
    const result = await setCurrentDir(tempTestDir); 
    if (!result.ok) {
        throw new Error(`Не удалось установить текущую директорию в ${tempTestDir}: ${result.error}`);
    }

    // Сброс моков и начальных значений
    sessionVars.getProjectWorkspace.mockReturnValue(null);
    sessionVars.hasProjectWorkspace.mockReturnValue(false);
    sessionVars.setProjectWorkspace.mockClear();
    resetInitialization(); // Сброс инициализации после установки cwd
    process.env = { ...originalEnv }; // Сброс переменных окружения
  });

  afterEach(async () => {
    // Восстанавливаем оригинальную рабочую директорию и переменные окружения
    process.chdir(originalCwd);
    process.env = originalEnv;
    // Удаляем временную директорию
    await fs.rm(tempTestDir, { recursive: true, force: true });
  });

  test('expandPath should expand tilde', () => {
    const homeDir = require('os').homedir();
    expect(expandPath('~/test')).toBe(pathUtils.join(homeDir, 'test')); // Использование экземпляра
  });

  test('expandPath should expand environment variables', () => {
    process.env.TEST_VAR = 'my_value';
    expect(expandPath('%TEST_VAR%/path')).toBe('my_value/path');
    expect(expandPath('$TEST_VAR/path')).toBe('my_value/path');
  });

  test('isProjectRoot should detect project root markers', async () => {
    // tempTestDir уже содержит .git
    const isRoot = await isProjectRoot(tempTestDir);
    expect(isRoot).toBe(true);
  });

  test('findProjectRoot should find the project root', async () => {
    const nestedDir = path.join(tempTestDir, 'src', 'components');
    await fs.mkdir(nestedDir, { recursive: true });
    
    const root = await findProjectRoot(nestedDir);
    expect(root).toBe(tempTestDir);
  });

  test('getCurrentDir should return the current directory', async () => {
    const current = await getCurrentDir();
    expect(current).toBe(tempTestDir);
  });

  test('setCurrentDir should change the current directory', async () => {
    const newDir = path.join(tempTestDir, 'new-current');
    await fs.mkdir(newDir);
    const result = await setCurrentDir(newDir);
    expect(result.ok).toBe(true);
    expect(process.cwd()).toBe(newDir);
    expect(await getCurrentDir()).toBe(newDir);
  });

  test('getProjectRoot should return the project root', async () => {
    const root = await getProjectRoot();
    expect(root).toBe(tempTestDir);
  });

  test('resetInitialization should reset the initialized state', async () => {
    await getCurrentDir(); // Инициализируем
    resetInitialization();
    // После сброса, next getCurrentDir должен будет переинициализироваться
    const current = await getCurrentDir(); 
    expect(current).toBe(tempTestDir); // Должен снова разрешить в tempTestDir
  });

  test('resolveDefaultWorkdir should return session workspace if set', async () => {
    sessionVars.getProjectWorkspace.mockReturnValue('/path/from/session');
    sessionVars.hasProjectWorkspace.mockReturnValue(true);
    const defaultWorkdir = await resolveDefaultWorkdir();
    expect(defaultWorkdir).toBe(pathUtils.resolve('/path/from/session'));
  });

  test('resolveDefaultWorkdir should return env variable if set and no session', async () => {
    process.env.MCP_WORKDIR = '/path/from/env';
    sessionVars.hasProjectWorkspace.mockReturnValue(false);
    const defaultWorkdir = await resolveDefaultWorkdir();
    expect(defaultWorkdir).toBe(pathUtils.resolve('/path/from/env'));
  });
});
