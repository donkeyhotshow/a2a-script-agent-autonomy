const path = require('path');
const fs = require('fs').promises; // Используем нативный fs.promises
const { FileSystemUtils } = require('@libs/system/file-operations'); // Добавлен импорт

class TestFileAnalyzer {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.workingDir = options.workingDir || process.cwd();
    this.fileSystemUtils = options.fileSystemUtils || new FileSystemUtils(this.logger);
  }

  async findTestFiles() {
    this.logger.info('Поиск тестовых файлов...');
    const testFiles = [];

    const searchDirs = [
      path.join(this.workingDir, 'tests'),
      path.join(this.workingDir, 'src', '__tests__'),
      path.join(this.workingDir, '__tests__'),
      path.join(this.workingDir, 'libs')
    ];

    for (const dir of searchDirs) {
      if (await this.fileSystemUtils.exists(dir)) {
        const files = await this.recursiveFindFiles(dir, /\.test\.(js|ts)$/);
        testFiles.push(...files);
      }
    }

    this.logger.info(`Найдено ${testFiles.length} тестовых файлов`);
    return testFiles;
  }

  async recursiveFindFiles(dir, pattern) {
    const files = [];
    const items = await this.fileSystemUtils.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);

      if (item.isDirectory()) {
        if (!['node_modules', '.git', '.jest-cache', 'coverage'].includes(item.name)) {
          const subFiles = await this.recursiveFindFiles(fullPath, pattern);
          files.push(...subFiles);
        }
      } else if (pattern.test(item.name)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  async extractTestDependencies(testFile) {
    try {
      const content = await this.fileSystemUtils.readFile(testFile, 'utf8');
      const dependencies = [];

      const requireMatches = content.match(/require\(['"`]([^'"`]+)['"`]\)/g);
      const importMatches = content.match(/from\s+['"`]([^'"`]+)['"`]/g);

      if (requireMatches) {
        for (const match of requireMatches) {
          const module = match.match(/require\(['"`]([^'"`]+)['"`]\)/)[1];
          if (module.startsWith('./') || module.startsWith('../')) {
            dependencies.push(path.resolve(path.dirname(testFile), module));
          }
        }
      }

      if (importMatches) {
        for (const match of importMatches) {
          const module = match.match(/from\s+['"`]([^'"`]+)['"`]/)[1];
          if (module.startsWith('./') || module.startsWith('../')) {
            dependencies.push(path.resolve(path.dirname(testFile), module));
          }
        }
      }

      return dependencies;
    } catch (error) {
      this.logger.error(`Ошибка анализа зависимостей для ${testFile}:`, error.message);
      return [];
    }
  }

  hasDependencyChanges(testFile, fileChanges, dependencies) {
    const deps = dependencies.get(testFile) || [];
    return deps.some(dep => fileChanges.has(dep));
  }
}

export { TestFileAnalyzer };
