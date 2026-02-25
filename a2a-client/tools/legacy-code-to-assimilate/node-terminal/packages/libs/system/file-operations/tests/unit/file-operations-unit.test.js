const { FileSystemBasicOperations } = require('../../src/FileSystemBasicOperations.cjs');
const { FileSystemAdvancedOperations } = require('../../src/FileSystemAdvancedOperations.cjs');
const { FileSystemPathUtils } = require('../../src/FileSystemPathUtils.cjs');
const { FileSystemWatcher } = require('../../src/FileSystemWatcher.cjs');
const path = require('path');
const fs = require('fs').promises;

// Мок-логгер для тестов
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('FileSystemBasicOperations', () => {
  let basicOps;
  const testDir = path.join(__dirname, 'test-basic-ops');
  const testFile = path.join(testDir, 'test.txt');
  const testContent = 'Test content';

  beforeEach(async () => {
    basicOps = new FileSystemBasicOperations(mockLogger);
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFile, testContent);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('exists', () => {
    test('должен возвращать true для существующего файла', async () => {
      const result = await basicOps.exists(testFile);
      expect(result).toBe(true);
    });

    test('должен возвращать false для несуществующего файла', async () => {
      const result = await basicOps.exists('non-existent.txt');
      expect(result).toBe(false);
    });

    test('должен возвращать true для существующей директории', async () => {
      const result = await basicOps.exists(testDir);
      expect(result).toBe(true);
    });
  });

  describe('readFile', () => {
    test('должен читать текстовый файл', async () => {
      const content = await basicOps.readFile(testFile, 'utf8');
      expect(content).toBe(testContent);
    });

    test('должен читать бинарный файл', async () => {
      const binaryContent = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const binaryFile = path.join(testDir, 'binary.bin');
      await fs.writeFile(binaryFile, binaryContent);
      
      const content = await basicOps.readFile(binaryFile, null);
      expect(Buffer.isBuffer(content)).toBe(true);
      expect(content.toString()).toBe('Hello');
    });

    test('должен обрабатывать ошибки при чтении несуществующего файла', async () => {
      await expect(basicOps.readFile('non-existent.txt')).rejects.toThrow();
    });
  });

  describe('writeFile', () => {
    test('должен записывать текстовый файл', async () => {
      const newContent = 'New content';
      await basicOps.writeFile(testFile, newContent, { encoding: 'utf8' });
      
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe(newContent);
    });

    test('должен записывать бинарный файл', async () => {
      const binaryContent = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      const binaryFile = path.join(testDir, 'binary-output.bin');
      
      await basicOps.writeFile(binaryFile, binaryContent);
      
      const content = await fs.readFile(binaryFile);
      expect(Buffer.isBuffer(content)).toBe(true);
      expect(content.toString()).toBe('Hello');
    });
  });

  describe('isFile', () => {
    test('должен возвращать true для файла', async () => {
      const result = await basicOps.isFile(testFile);
      expect(result).toBe(true);
    });

    test('должен возвращать false для директории', async () => {
      const result = await basicOps.isFile(testDir);
      expect(result).toBe(false);
    });

    test('должен возвращать false для несуществующего пути', async () => {
      const result = await basicOps.isFile('non-existent.txt');
      expect(result).toBe(false);
    });
  });

  describe('isDirectory', () => {
    test('должен возвращать true для директории', async () => {
      const result = await basicOps.isDirectory(testDir);
      expect(result).toBe(true);
    });

    test('должен возвращать false для файла', async () => {
      const result = await basicOps.isDirectory(testFile);
      expect(result).toBe(false);
    });

    test('должен возвращать false для несуществующего пути', async () => {
      const result = await basicOps.isDirectory('non-existent-dir');
      expect(result).toBe(false);
    });
  });
});

describe('FileSystemAdvancedOperations', () => {
  let advancedOps;
  const testDir = path.join(__dirname, 'test-advanced-ops');
  const testFile = path.join(testDir, 'test.txt');
  const testContent = 'Test content';

  beforeEach(async () => {
    advancedOps = new FileSystemAdvancedOperations(mockLogger);
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFile, testContent);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('copyFile', () => {
    test('должен копировать файл', async () => {
      const destFile = path.join(testDir, 'copy.txt');
      await advancedOps.copyFile(testFile, destFile);
      
      const content = await fs.readFile(destFile, 'utf8');
      expect(content).toBe(testContent);
    });

    test('должен обрабатывать ошибки при копировании несуществующего файла', async () => {
      await expect(advancedOps.copyFile('non-existent.txt', 'dest.txt')).rejects.toThrow();
    });
  });

  describe('moveItem', () => {
    test('должен перемещать файл', async () => {
      const destFile = path.join(testDir, 'moved.txt');
      await advancedOps.moveItem(testFile, destFile);
      
      // Исходный файл не должен существовать
      await expect(fs.access(testFile)).rejects.toThrow();
      
      // Перемещенный файл должен существовать
      const content = await fs.readFile(destFile, 'utf8');
      expect(content).toBe(testContent);
    });

    test('должен обрабатывать ошибки при перемещении несуществующего файла', async () => {
      await expect(advancedOps.moveItem('non-existent.txt', 'dest.txt')).rejects.toThrow();
    });
  });

  describe('compareFiles', () => {
    test('должен возвращать true для идентичных файлов', async () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');
      
      await fs.writeFile(file1, testContent);
      await fs.writeFile(file2, testContent);
      
      const result = await advancedOps.compareFiles(file1, file2);
      expect(result).toBe(true);
    });

    test('должен возвращать false для разных файлов', async () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');
      
      await fs.writeFile(file1, testContent);
      await fs.writeFile(file2, 'Different content');
      
      const result = await advancedOps.compareFiles(file1, file2);
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    test('должен возвращать статистику файла', async () => {
      const stats = await advancedOps.getStats(testFile);
      
      expect(stats.isFile()).toBe(true);
      expect(stats.isDirectory()).toBe(false);
      expect(stats.size).toBe(testContent.length);
    });

    test('должен возвращать статистику директории', async () => {
      const stats = await advancedOps.getStats(testDir);
      
      expect(stats.isFile()).toBe(false);
      expect(stats.isDirectory()).toBe(true);
    });

    test('должен обрабатывать ошибки для несуществующего пути', async () => {
      await expect(advancedOps.getStats('non-existent.txt')).rejects.toThrow();
    });
  });

  describe('checkAccess', () => {
    test('должен возвращать true для доступного файла', async () => {
      const result = await advancedOps.checkAccess(testFile);
      expect(result).toBe(true);
    });

    test('должен возвращать false для несуществующего файла', async () => {
      const result = await advancedOps.checkAccess('non-existent.txt');
      expect(result).toBe(false);
    });
  });

  describe('createTempFile', () => {
    test('должен создавать временный файл', async () => {
      const tempFile = await advancedOps.createTempFile('test-', '.tmp');
      
      expect(tempFile).toMatch(/test-.*\.tmp$/);
      
      // Проверяем, что файл существует
      const exists = await fs.access(tempFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      // Удаляем временный файл
      await fs.unlink(tempFile);
    });
  });
});

describe('FileSystemPathUtils', () => {
  let pathUtils;

  beforeEach(() => {
    pathUtils = new FileSystemPathUtils(mockLogger);
  });

  describe('normalizePath', () => {
    test('должен нормализовать путь', () => {
      const result = pathUtils.normalizePath('path/to/../file.txt');
      // На Windows пути используют обратные слеши
      expect(result).toMatch(/path[\\\/]file\.txt$/);
    });
  });

  describe('resolvePath', () => {
    test('должен разрешать относительный путь', () => {
      const result = pathUtils.resolvePath('/base', 'file.txt');
      // На Windows пути могут быть абсолютными
      expect(result).toMatch(/[\\\/]base[\\\/]file\.txt$/);
    });
  });

  describe('relativePath', () => {
    test('должен возвращать относительный путь', () => {
      const result = pathUtils.relativePath('/base', '/base/file.txt');
      expect(result).toBe('file.txt');
    });
  });

  describe('basename', () => {
    test('должен возвращать базовое имя файла', () => {
      const result = pathUtils.basename('/path/to/file.txt');
      expect(result).toBe('file.txt');
    });

    test('должен удалять расширение', () => {
      const result = pathUtils.basename('/path/to/file.txt', '.txt');
      expect(result).toBe('file');
    });
  });

  describe('extname', () => {
    test('должен возвращать расширение файла', () => {
      const result = pathUtils.extname('/path/to/file.txt');
      expect(result).toBe('.txt');
    });

    test('должен возвращать пустую строку для файла без расширения', () => {
      const result = pathUtils.extname('/path/to/file');
      expect(result).toBe('');
    });
  });

  describe('dirname', () => {
    test('должен возвращать имя директории', () => {
      const result = pathUtils.dirname('/path/to/file.txt');
      expect(result).toBe('/path/to');
    });
  });

  describe('isAbsolutePath', () => {
    test('должен возвращать true для абсолютного пути', () => {
      const result = pathUtils.isAbsolutePath('/path/to/file.txt');
      expect(result).toBe(true);
    });

    test('должен возвращать false для относительного пути', () => {
      const result = pathUtils.isAbsolutePath('path/to/file.txt');
      expect(result).toBe(false);
    });
  });

  describe('joinPath', () => {
    test('должен объединять сегменты пути', () => {
      const result = pathUtils.joinPath('/path', 'to', 'file.txt');
      // На Windows пути используют обратные слеши
      expect(result).toMatch(/[\\\/]path[\\\/]to[\\\/]file\.txt$/);
    });
  });

  describe('changeExtension', () => {
    test('должен изменять расширение файла', () => {
      const result = pathUtils.changeExtension('/path/to/file.txt', '.js');
      expect(result).toBe('/path/to/file.js');
    });
  });
});

describe('FileSystemWatcher', () => {
  let watcher;
  const testDir = path.join(__dirname, 'test-watcher');
  const testFile = path.join(testDir, 'test.txt');

  beforeEach(async () => {
    watcher = new FileSystemWatcher(mockLogger);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    watcher.unwatchAll();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('watch', () => {
    test('должен начинать наблюдение за файлом', async () => {
      // Создаем файл перед наблюдением
      await fs.writeFile(testFile, 'test content');
      watcher.watch(testFile);
      expect(watcher.isWatching(testFile)).toBe(true);
    });

    test('должен начинать наблюдение за директорией', () => {
      watcher.watch(testDir);
      expect(watcher.isWatching(testDir)).toBe(true);
    });

    test('должен обрабатывать повторное наблюдение за тем же путем', async () => {
      // Создаем файл перед наблюдением
      await fs.writeFile(testFile, 'test content');
      watcher.watch(testFile);
      watcher.watch(testFile); // Повторное наблюдение
      expect(watcher.isWatching(testFile)).toBe(true);
    });
  });

  describe('unwatch', () => {
    test('должен останавливать наблюдение за файлом', async () => {
      // Создаем файл перед наблюдением
      await fs.writeFile(testFile, 'test content');
      watcher.watch(testFile);
      expect(watcher.isWatching(testFile)).toBe(true);
      
      watcher.unwatch(testFile);
      expect(watcher.isWatching(testFile)).toBe(false);
    });

    test('должен обрабатывать остановку наблюдения за несуществующим путем', () => {
      watcher.unwatch('non-existent.txt'); // Не должно вызывать ошибку
    });
  });

  describe('unwatchAll', () => {
    test('должен останавливать все наблюдения', async () => {
      // Создаем файл перед наблюдением
      await fs.writeFile(testFile, 'test content');
      watcher.watch(testFile);
      watcher.watch(testDir);
      
      expect(watcher.isWatching(testFile)).toBe(true);
      expect(watcher.isWatching(testDir)).toBe(true);
      
      watcher.unwatchAll();
      
      expect(watcher.isWatching(testFile)).toBe(false);
      expect(watcher.isWatching(testDir)).toBe(false);
    });
  });

  describe('isWatching', () => {
    test('должен возвращать false для несуществующего пути', () => {
      expect(watcher.isWatching('non-existent.txt')).toBe(false);
    });
  });
});
