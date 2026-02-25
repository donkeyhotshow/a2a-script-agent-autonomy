const workdirUtils = require('../index.js');
const path = require('path');
const fs = require('fs').promises;

describe('Workdir Utils - Integration Tests', () => {
  const originalCwd = process.cwd();
  const tempTestDir = path.join(__dirname, 'temp-integration-test');
  const projectRoot = path.join(tempTestDir, 'project-root');
  const nestedDir = path.join(projectRoot, 'src', 'components');

  beforeEach(async () => {
    // Создаем структуру проекта
    await fs.mkdir(nestedDir, { recursive: true });
    
    // Создаем маркеры проекта в корне
    await fs.writeFile(path.join(projectRoot, '.git'), '');
    await fs.writeFile(path.join(projectRoot, 'package.json'), '{"name": "test-project"}');
    
    // Создаем файлы в поддиректориях
    await fs.writeFile(path.join(nestedDir, 'test.js'), 'console.log("test");');
    
    process.chdir(nestedDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempTestDir, { recursive: true, force: true });
  });

  test('should find project root from nested directory', async () => {
    const root = await workdirUtils.getProjectRoot();
    expect(root).toBe(projectRoot);
  });

  test('should handle path expansion with real paths', () => {
    const testPath = path.join('~', 'test-project');
    const expanded = workdirUtils.expandPath(testPath);
    expect(expanded).toContain(require('os').homedir());
    expect(expanded).toContain('test-project');
  });

  test('should change directory and maintain state', async () => {
    const newDir = path.join(projectRoot, 'new-dir');
    await fs.mkdir(newDir);
    
    const result = await workdirUtils.setCurrentDir(newDir);
    expect(result.ok).toBe(true);
    expect(result.path).toBe(newDir);
    
    const current = await workdirUtils.getCurrentDir();
    expect(current).toBe(newDir);
  });

  test('should handle relative paths', async () => {
    const result = await workdirUtils.setCurrentDir('../..');
    expect(result.ok).toBe(true);
    
    const current = await workdirUtils.getCurrentDir();
    expect(current).toBe(projectRoot);
  });

  test('should handle absolute paths', async () => {
    const result = await workdirUtils.setCurrentDir(projectRoot);
    expect(result.ok).toBe(true);
    expect(result.path).toBe(projectRoot);
  });

  test('should handle non-existent paths gracefully', async () => {
    const result = await workdirUtils.setCurrentDir('/non/existent/path');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should maintain project root after directory changes', async () => {
    const root1 = await workdirUtils.getProjectRoot();
    expect(root1).toBe(projectRoot);
    
    // Меняем директорию
    await workdirUtils.setCurrentDir(path.join(projectRoot, 'src'));
    
    const root2 = await workdirUtils.getProjectRoot();
    expect(root2).toBe(projectRoot);
  });
});
