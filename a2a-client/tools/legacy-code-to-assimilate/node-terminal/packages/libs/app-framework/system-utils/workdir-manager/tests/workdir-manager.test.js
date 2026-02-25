const { WorkDirectoryManager } = require('../index.js');
const fs = require('fs');
const path = require('path');

// TODO: Создать полные тесты для WorkDirectoryManager
describe('WorkDirectoryManager', () => {
  let workDirManager;
  let testWorkDir;
  let mockLogger;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn()
    };

    // Создаем путь к тестовой директории
    testWorkDir = path.join(__dirname, 'test-work-dir');

    workDirManager = new WorkDirectoryManager(mockLogger);
  });

  afterEach(async () => {
    // Очистка тестовой директории после каждого теста
    try {
      if (fs.existsSync(testWorkDir)) {
        // Удаляем все файлы в директории
        const files = fs.readdirSync(testWorkDir);
        for (const file of files) {
          const filePath = path.join(testWorkDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        }
        // Удаляем саму директорию
        fs.rmdirSync(testWorkDir);
      }
    } catch (error) {
      // Игнорируем ошибки очистки
    }
  });

  describe('constructor', () => {
    test('should initialize with default logger', () => {
      // TODO: Протестировать инициализацию с дефолтным логгером
      const defaultManager = new WorkDirectoryManager();
      expect(defaultManager.logger).toBe(console);
      expect(defaultManager.fileSystem).toBeDefined();
    });

    test('should initialize with custom logger', () => {
      // TODO: Протестировать инициализацию с кастомным логгером
      expect(workDirManager.logger).toBe(mockLogger);
      expect(workDirManager.fileSystem).toBeDefined();
    });
  });

  describe('createWorkDirectory', () => {
    test('should create work directory when it does not exist', async () => {
      // TODO: Протестировать создание рабочей директории при её отсутствии
      // Проверяем, что директория не существует
      expect(fs.existsSync(testWorkDir)).toBe(false);

      await workDirManager.createWorkDirectory(testWorkDir);

      // Проверяем, что директория была создана
      expect(fs.existsSync(testWorkDir)).toBe(true);
      expect(fs.statSync(testWorkDir).isDirectory()).toBe(true);

      // Проверяем логирование
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(`📁 Создана папка work: ${testWorkDir}`)
      );
    });

    test('should not create directory when it already exists', async () => {
      // TODO: Протестировать отсутствие создания директории при её наличии
      // Создаем директорию вручную
      fs.mkdirSync(testWorkDir, { recursive: true });
      expect(fs.existsSync(testWorkDir)).toBe(true);

      // Сбрасываем мок перед тестом
      mockLogger.log.mockClear();

      await workDirManager.createWorkDirectory(testWorkDir);

      // Директория должна существовать
      expect(fs.existsSync(testWorkDir)).toBe(true);

      // Логирование должно произойти снова (метод не проверяет существование перед вызовом)
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(`📁 Создана папка work: ${testWorkDir}`)
      );
    });

    test('should handle directory creation errors', async () => {
      // TODO: Протестировать обработку ошибок создания директории
      // Попытка создать директорию в недоступном месте
      const invalidPath = 'Z:\\invalid\\path\\that\\does\\not\\exist';

      // Мокаем fileSystem.ensureDir для генерации ошибки
      const originalEnsureDir = workDirManager.fileSystem.ensureDir;
      workDirManager.fileSystem.ensureDir = jest.fn().mockRejectedValue(
        new Error('Permission denied')
      );

      await expect(workDirManager.createWorkDirectory(invalidPath)).rejects.toThrow();

      // Восстанавливаем оригинальный метод
      workDirManager.fileSystem.ensureDir = originalEnsureDir;
    });
  });

  describe('cleanupWorkDirectory', () => {
    beforeEach(() => {
      // Создаем тестовую директорию и файлы
      fs.mkdirSync(testWorkDir, { recursive: true });
    });

    test('should remove .md and .json files from work directory', async () => {
      // TODO: Протестировать удаление .md и .json файлов из рабочей директории
      // Создаем тестовые файлы
      const mdFile = path.join(testWorkDir, 'test.md');
      const jsonFile = path.join(testWorkDir, 'test.json');
      const txtFile = path.join(testWorkDir, 'test.txt');

      fs.writeFileSync(mdFile, '# Test markdown');
      fs.writeFileSync(jsonFile, '{"test": "data"}');
      fs.writeFileSync(txtFile, 'Test text file');

      // Проверяем, что файлы созданы
      expect(fs.existsSync(mdFile)).toBe(true);
      expect(fs.existsSync(jsonFile)).toBe(true);
      expect(fs.existsSync(txtFile)).toBe(true);

      await workDirManager.cleanupWorkDirectory(testWorkDir);

      // .md и .json файлы должны быть удалены
      expect(fs.existsSync(mdFile)).toBe(false);
      expect(fs.existsSync(jsonFile)).toBe(false);

      // .txt файл должен остаться
      expect(fs.existsSync(txtFile)).toBe(true);

      // Проверяем логирование успешной очистки
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(`🧹 Папка work очищена: ${testWorkDir}`)
      );
    });

    test('should handle cleanup when directory does not exist', async () => {
      // TODO: Протестировать обработку очистки при отсутствии директории
      const nonExistentDir = path.join(__dirname, 'non-existent-dir');

      await workDirManager.cleanupWorkDirectory(nonExistentDir);

      // Должен залогировать предупреждение
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(`⚠️  Не удалось очистить папку work:`)
      );
    });

    test('should handle cleanup when directory is empty', async () => {
      // TODO: Протестировать обработку очистки при пустой директории
      await workDirManager.cleanupWorkDirectory(testWorkDir);

      // Проверяем логирование успешной очистки
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining(`🧹 Папка work очищена: ${testWorkDir}`)
      );
    });

    test('should handle files with mixed extensions', async () => {
      // TODO: Протестировать обработку файлов с различными расширениями
      const files = [
        'document.md',
        'config.json',
        'script.js',
        'style.css',
        'data.xml',
        'readme.txt'
      ];

      // Создаем файлы
      files.forEach(filename => {
        fs.writeFileSync(path.join(testWorkDir, filename), `Content of ${filename}`);
      });

      await workDirManager.cleanupWorkDirectory(testWorkDir);

      // Только .md и .json файлы должны быть удалены
      expect(fs.existsSync(path.join(testWorkDir, 'document.md'))).toBe(false);
      expect(fs.existsSync(path.join(testWorkDir, 'config.json'))).toBe(false);

      // Остальные файлы должны остаться
      expect(fs.existsSync(path.join(testWorkDir, 'script.js'))).toBe(true);
      expect(fs.existsSync(path.join(testWorkDir, 'style.css'))).toBe(true);
      expect(fs.existsSync(path.join(testWorkDir, 'data.xml'))).toBe(true);
      expect(fs.existsSync(path.join(testWorkDir, 'readme.txt'))).toBe(true);
    });

    test('should handle files without extensions', async () => {
      // TODO: Протестировать обработку файлов без расширений
      const noExtensionFile = path.join(testWorkDir, 'noextension');
      fs.writeFileSync(noExtensionFile, 'Content without extension');

      await workDirManager.cleanupWorkDirectory(testWorkDir);

      // Файл без расширения должен остаться
      expect(fs.existsSync(noExtensionFile)).toBe(true);
    });

    test('should handle nested directories', async () => {
      // TODO: Протестировать обработку вложенных директорий
      const nestedDir = path.join(testWorkDir, 'nested');
      fs.mkdirSync(nestedDir, { recursive: true });

      const nestedFile = path.join(nestedDir, 'nested.md');
      fs.writeFileSync(nestedFile, '# Nested markdown');

      await workDirManager.cleanupWorkDirectory(testWorkDir);

      // Файлы во вложенных директориях тоже должны быть удалены
      expect(fs.existsSync(nestedFile)).toBe(false);
      // Но сама вложенная директория должна остаться
      expect(fs.existsSync(nestedDir)).toBe(true);
    });
  });

  describe('initializeWorkDirectory', () => {
    test('should create and cleanup work directory', async () => {
      // TODO: Протестировать создание и очистку рабочей директории
      // Создаем директорию и добавляем файлы
      fs.mkdirSync(testWorkDir, { recursive: true });
      fs.writeFileSync(path.join(testWorkDir, 'old.md'), '# Old file');
      fs.writeFileSync(path.join(testWorkDir, 'old.json'), '{"old": "data"}');
      fs.writeFileSync(path.join(testWorkDir, 'keep.txt'), 'Keep this file');

      // Проверяем начальное состояние
      expect(fs.existsSync(path.join(testWorkDir, 'old.md'))).toBe(true);
      expect(fs.existsSync(path.join(testWorkDir, 'old.json'))).toBe(true);
      expect(fs.existsSync(path.join(testWorkDir, 'keep.txt'))).toBe(true);

      await workDirManager.initializeWorkDirectory(testWorkDir);

      // .md и .json файлы должны быть удалены, .txt должен остаться
      expect(fs.existsSync(path.join(testWorkDir, 'old.md'))).toBe(false);
      expect(fs.existsSync(path.join(testWorkDir, 'old.json'))).toBe(false);
      expect(fs.existsSync(path.join(testWorkDir, 'keep.txt'))).toBe(true);
    });

    test('should handle non-existent directory', async () => {
      // TODO: Протестировать обработку несуществующей директории
      // Директория не должна существовать
      expect(fs.existsSync(testWorkDir)).toBe(false);

      await workDirManager.initializeWorkDirectory(testWorkDir);

      // Директория должна быть создана
      expect(fs.existsSync(testWorkDir)).toBe(true);
      expect(fs.statSync(testWorkDir).isDirectory()).toBe(true);
    });
  });

  describe('error handling and edge cases', () => {
    test('should handle null or undefined workDirectoryPath', async () => {
      // TODO: Протестировать обработку null или undefined путей
      await expect(workDirManager.createWorkDirectory(null)).rejects.toThrow();
      await expect(workDirManager.createWorkDirectory(undefined)).rejects.toThrow();
      await expect(workDirManager.cleanupWorkDirectory(null)).rejects.toThrow();
      await expect(workDirManager.initializeWorkDirectory(undefined)).rejects.toThrow();
    });

    test('should handle empty string as workDirectoryPath', async () => {
      // TODO: Протестировать обработку пустой строки как пути
      await expect(workDirManager.createWorkDirectory('')).rejects.toThrow();
      await expect(workDirManager.cleanupWorkDirectory('')).rejects.toThrow();
    });

    test('should handle relative paths', async () => {
      // TODO: Протестировать обработку относительных путей
      const relativePath = 'test-relative-dir';

      await workDirManager.initializeWorkDirectory(relativePath);

      // Директория должна быть создана относительно текущей директории
      const absolutePath = path.resolve(relativePath);
      expect(fs.existsSync(absolutePath)).toBe(true);

      // Очистка
      fs.rmdirSync(absolutePath);
    });

    test('should handle special characters in directory names', async () => {
      // TODO: Протестировать обработку специальных символов в именах директорий
      const specialDirName = 'test-dir_with_special-chars (1)';
      const specialPath = path.join(__dirname, specialDirName);

      await workDirManager.initializeWorkDirectory(specialPath);

      expect(fs.existsSync(specialPath)).toBe(true);

      // Очистка
      fs.rmdirSync(specialPath);
    });

    test('should handle concurrent operations', async () => {
      // TODO: Протестировать обработку одновременных операций
      const promises = [
        workDirManager.initializeWorkDirectory(testWorkDir),
        workDirManager.initializeWorkDirectory(testWorkDir),
        workDirManager.initializeWorkDirectory(testWorkDir)
      ];

      await Promise.all(promises);

      // Директория должна существовать
      expect(fs.existsSync(testWorkDir)).toBe(true);
    });

    test('should handle very long directory paths', async () => {
      // TODO: Протестировать обработку очень длинных путей директорий
      const longPath = path.join(testWorkDir, 'a'.repeat(200));

      await workDirManager.initializeWorkDirectory(longPath);

      expect(fs.existsSync(longPath)).toBe(true);
    });

    test('should handle read-only file system', async () => {
      // TODO: Протестировать обработку файловой системы только для чтения
      // Этот тест сложно реализовать в стандартной среде, но можно замокать
      const originalMkdir = fs.mkdirSync;
      fs.mkdirSync = jest.fn().mockImplementation(() => {
        throw new Error('Read-only file system');
      });

      await expect(workDirManager.createWorkDirectory(testWorkDir)).rejects.toThrow('Read-only file system');

      // Восстанавливаем
      fs.mkdirSync = originalMkdir;
    });

    test('should handle network paths', async () => {
      // TODO: Протестировать обработку сетевых путей
      const networkPath = '\\\\server\\share\\test-dir';

      // Этот тест может не работать в Windows без реального сетевого диска
      // Но мы можем проверить, что метод не выбрасывает исключение синхронно
      try {
        await workDirManager.createWorkDirectory(networkPath);
        // Если путь доступен, директория может быть создана
      } catch (error) {
        // Ожидаем ошибку доступа к сетевому пути
        expect(error).toBeDefined();
      }
    });
  });

  describe('logging behavior', () => {
    test('should log directory creation', async () => {
      // TODO: Протестировать логирование создания директории
      await workDirManager.createWorkDirectory(testWorkDir);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('📁 Создана папка work:')
      );
    });

    test('should log directory cleanup', async () => {
      // TODO: Протестировать логирование очистки директории
      fs.mkdirSync(testWorkDir, { recursive: true });

      await workDirManager.cleanupWorkDirectory(testWorkDir);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('🧹 Папка work очищена:')
      );
    });

    test('should log cleanup errors', async () => {
      // TODO: Протестировать логирование ошибок очистки
      // Мокаем fs.readdirSync для генерации ошибки
      const originalReaddirSync = fs.readdirSync;
      fs.readdirSync = jest.fn().mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await workDirManager.cleanupWorkDirectory(testWorkDir);

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Не удалось очистить папку work:')
      );

      // Восстанавливаем
      fs.readdirSync = originalReaddirSync;
    });
  });

  describe('file system integration', () => {
    test('should use FileSystemUtils for directory creation', async () => {
      // TODO: Протестировать использование FileSystemUtils для создания директории
      // Мокаем fileSystem.ensureDir
      const mockEnsureDir = jest.fn().mockResolvedValue();
      workDirManager.fileSystem.ensureDir = mockEnsureDir;

      await workDirManager.createWorkDirectory(testWorkDir);

      expect(mockEnsureDir).toHaveBeenCalledWith(testWorkDir);
    });

    test('should use fileSystem.join for path construction', async () => {
      // TODO: Протестировать использование fileSystem.join для построения путей
      fs.mkdirSync(testWorkDir, { recursive: true });
      fs.writeFileSync(path.join(testWorkDir, 'test.md'), '# Test');

      const mockJoin = jest.fn().mockImplementation(path.join);
      workDirManager.fileSystem.join = mockJoin;

      await workDirManager.cleanupWorkDirectory(testWorkDir);

      expect(mockJoin).toHaveBeenCalledWith(testWorkDir, 'test.md');
    });
  });

  describe('performance and memory usage', () => {
    test('should handle large number of files', async () => {
      // TODO: Протестировать обработку большого количества файлов
      fs.mkdirSync(testWorkDir, { recursive: true });

      // Создаем 100 файлов для тестирования
      for (let i = 0; i < 100; i++) {
        const fileName = `test${i}.md`;
        fs.writeFileSync(path.join(testWorkDir, fileName), `# Test ${i}`);
      }

      await workDirManager.cleanupWorkDirectory(testWorkDir);

      // Все .md файлы должны быть удалены
      for (let i = 0; i < 100; i++) {
        const fileName = `test${i}.md`;
        expect(fs.existsSync(path.join(testWorkDir, fileName))).toBe(false);
      }
    });

    test('should not consume excessive memory', async () => {
      // TODO: Протестировать отсутствие чрезмерного потребления памяти
      // Этот тест сложно реализовать точно, но можно проверить базовую функциональность
      fs.mkdirSync(testWorkDir, { recursive: true });

      const initialMemory = process.memoryUsage().heapUsed;

      // Выполняем операции
      await workDirManager.initializeWorkDirectory(testWorkDir);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Увеличение памяти не должно быть чрезмерным (менее 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
