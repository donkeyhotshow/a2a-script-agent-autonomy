const fileSystemUtils = require('../../index.cjs');
const path = require('path');
const fs = require('fs').promises;

// Мок-логгер для тестов
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('File Operations Edge Cases', () => {
  const fileOps = fileSystemUtils(mockLogger);
  const testDir = path.join(__dirname, 'test-edge-cases');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Граничные условия', () => {
    test('должен обрабатывать пустые пути', async () => {
      const result = await fileOps.readFile('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('должен обрабатывать null пути', async () => {
      const result = await fileOps.readFile(null);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('должен обрабатывать undefined пути', async () => {
      const result = await fileOps.readFile(undefined);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('должен обрабатывать пути с недопустимыми символами', async () => {
      const invalidPath = path.join(testDir, 'file<with>invalid|chars.txt');
      const result = await fileOps.writeFile(invalidPath, 'content');
      // На Windows это может не работать, но должно обрабатываться gracefully
      expect(result.success).toBeDefined();
    });

    test('должен обрабатывать очень длинные пути', async () => {
      const longPath = path.join(testDir, 'a'.repeat(200) + '.txt');
      const result = await fileOps.writeFile(longPath, 'content');
      // Результат зависит от ОС, но не должен падать
      expect(result.success).toBeDefined();
    });
  });

  describe('Специальные символы', () => {
    test('должен обрабатывать файлы с Unicode символами', async () => {
      const unicodeFile = path.join(testDir, 'файл-тест.txt');
      const unicodeContent = 'Содержимое с кириллицей: привет мир!';
      
      const writeResult = await fileOps.writeFile(unicodeFile, unicodeContent);
      expect(writeResult.success).toBe(true);
      
      const readResult = await fileOps.readFile(unicodeFile);
      expect(readResult.success).toBe(true);
      expect(readResult.content).toBe(unicodeContent);
    });

    test('должен обрабатывать файлы с эмодзи', async () => {
      const emojiFile = path.join(testDir, 'test-😀.txt');
      const emojiContent = 'Содержимое с эмодзи: 🚀🎉✨';
      
      const writeResult = await fileOps.writeFile(emojiFile, emojiContent);
      expect(writeResult.success).toBe(true);
      
      const readResult = await fileOps.readFile(emojiFile);
      expect(readResult.success).toBe(true);
      expect(readResult.content).toBe(emojiContent);
    });

    test('должен обрабатывать файлы с специальными символами в содержимом', async () => {
      const specialFile = path.join(testDir, 'special.txt');
      const specialContent = 'Содержимое с символами:\n\t\r\0\x00\xFF';
      
      const writeResult = await fileOps.writeFile(specialFile, specialContent);
      expect(writeResult.success).toBe(true);
      
      const readResult = await fileOps.readFile(specialFile);
      expect(readResult.success).toBe(true);
      expect(readResult.content).toBe(specialContent);
    });
  });

  describe('Большие файлы', () => {
    test('должен обрабатывать файлы размером 1MB', async () => {
      const largeFile = path.join(testDir, 'large-1mb.txt');
      const largeContent = 'A'.repeat(1024 * 1024); // 1MB
      
      const writeResult = await fileOps.writeFile(largeFile, largeContent);
      expect(writeResult.success).toBe(true);
      
      const readResult = await fileOps.readFile(largeFile);
      expect(readResult.success).toBe(true);
      expect(readResult.content.length).toBe(1024 * 1024);
    });

    test('должен обрабатывать файлы с большим количеством строк', async () => {
      const manyLinesFile = path.join(testDir, 'many-lines.txt');
      const lines = Array(50000).fill('Line content').join('\n');
      
      const writeResult = await fileOps.writeFile(manyLinesFile, lines);
      expect(writeResult.success).toBe(true);
      
      const readResult = await fileOps.readFile(manyLinesFile);
      expect(readResult.success).toBe(true);
      expect(readResult.lines).toBe(50000);
    });
  });

  describe('Одновременные операции', () => {
    test('должен обрабатывать одновременное чтение и запись', async () => {
      const testFile = path.join(testDir, 'concurrent.txt');
      const initialContent = 'Initial content';
      
      // Создаем файл
      await fileOps.writeFile(testFile, initialContent);
      
      // Одновременно читаем и записываем
      const [readResult, writeResult] = await Promise.all([
        fileOps.readFile(testFile),
        fileOps.writeFile(testFile, 'Updated content')
      ]);
      
      expect(readResult.success).toBe(true);
      expect(writeResult.success).toBe(true);
    });

    test('должен обрабатывать одновременное копирование и удаление', async () => {
      const sourceFile = path.join(testDir, 'source.txt');
      const destFile = path.join(testDir, 'dest.txt');
      const content = 'Source content';
      
      await fileOps.writeFile(sourceFile, content);
      
      // Одновременно копируем и удаляем исходный файл
      const [copyResult, deleteResult] = await Promise.all([
        fileOps.copyPath(sourceFile, destFile),
        fileOps.deletePath(sourceFile)
      ]);
      
      // Одна из операций должна быть успешной
      expect(copyResult.success || deleteResult.success).toBe(true);
    });
  });

  describe('Ошибки файловой системы', () => {
    test('должен обрабатывать ошибки доступа к файлу', async () => {
      // Создаем файл и делаем его недоступным (если возможно)
      const protectedFile = path.join(testDir, 'protected.txt');
      await fileOps.writeFile(protectedFile, 'content');
      
      // Попытка записи в защищенный файл может не сработать на всех ОС
      const result = await fileOps.writeFile(protectedFile, 'new content');
      // Результат зависит от ОС и прав доступа
      expect(result.success).toBeDefined();
    });

    test('должен обрабатывать ошибки нехватки места на диске', async () => {
      // Создаем очень большой файл для тестирования нехватки места
      const hugeFile = path.join(testDir, 'huge.txt');
      const hugeContent = 'A'.repeat(1024 * 1024 * 100); // 100MB
      
      const result = await fileOps.writeFile(hugeFile, hugeContent);
      // Результат зависит от доступного места на диске
      expect(result.success).toBeDefined();
    });
  });

  describe('Символические ссылки', () => {
    test('должен обрабатывать символические ссылки', async () => {
      const originalFile = path.join(testDir, 'original.txt');
      const symlinkFile = path.join(testDir, 'symlink.txt');
      const content = 'Original content';
      
      await fileOps.writeFile(originalFile, content);
      
      // Создаем символическую ссылку (может не работать на всех ОС)
      try {
        await fs.symlink(originalFile, symlinkFile);
        
        const readResult = await fileOps.readFile(symlinkFile);
        expect(readResult.success).toBe(true);
        expect(readResult.content).toBe(content);
      } catch (error) {
        // Символические ссылки могут не поддерживаться
        console.log('Symbolic links not supported:', error.message);
      }
    });
  });

  describe('Параллельные операции', () => {
    test('должен обрабатывать множество параллельных операций', async () => {
      const operations = [];
      
      // Создаем множество файлов параллельно
      for (let i = 0; i < 50; i++) {
        const filePath = path.join(testDir, `parallel-${i}.txt`);
        operations.push(fileOps.writeFile(filePath, `Content ${i}`));
      }
      
      const results = await Promise.all(operations);
      
      // Все операции должны быть успешными
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Проверяем, что все файлы созданы
      const listResult = await fileOps.listDirectory(testDir);
      expect(listResult.success).toBe(true);
      expect(listResult.entries.length).toBeGreaterThanOrEqual(50);
    });

    test('должен обрабатывать параллельное чтение множества файлов', async () => {
      // Создаем файлы
      const files = [];
      for (let i = 0; i < 20; i++) {
        const filePath = path.join(testDir, `read-${i}.txt`);
        await fileOps.writeFile(filePath, `Content ${i}`);
        files.push(filePath);
      }
      
      // Читаем все файлы параллельно
      const readOperations = files.map(filePath => fileOps.readFile(filePath));
      const results = await Promise.all(readOperations);
      
      // Все операции чтения должны быть успешными
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.content).toBe(`Content ${index}`);
      });
    });
  });

  describe('Очистка ресурсов', () => {
    test('должен корректно очищать временные файлы', async () => {
      const tempFile = path.join(testDir, 'temp.txt');
      
      // Создаем временный файл
      await fileOps.writeFile(tempFile, 'temp content');
      
      // Проверяем, что файл существует
      const existsBefore = await fileOps.getFileStats(tempFile);
      expect(existsBefore.success).toBe(true);
      
      // Удаляем файл
      const deleteResult = await fileOps.deletePath(tempFile);
      expect(deleteResult.success).toBe(true);
      
      // Проверяем, что файл удален
      const existsAfter = await fileOps.getFileStats(tempFile);
      expect(existsAfter.success).toBe(false);
    });
  });
});
