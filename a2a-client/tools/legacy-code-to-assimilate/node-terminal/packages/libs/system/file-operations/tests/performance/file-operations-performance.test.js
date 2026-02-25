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

describe('File Operations Performance', () => {
  const fileOps = fileSystemUtils(mockLogger);
  const testDir = path.join(__dirname, 'test-performance');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Производительность чтения', () => {
    test('должен быстро читать файлы размером 10MB', async () => {
      const largeFile = path.join(testDir, 'large-10mb.txt');
      const largeContent = 'A'.repeat(10 * 1024 * 1024); // 10MB
      
      // Создаем файл
      await fileOps.writeFile(largeFile, largeContent);
      
      // Измеряем время чтения
      const startTime = Date.now();
      const result = await fileOps.readFile(largeFile);
      const readTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.content.length).toBe(10 * 1024 * 1024);
      expect(readTime).toBeLessThan(5000); // Должно читаться менее чем за 5 секунд
    });

    test('должен эффективно читать множество маленьких файлов', async () => {
      const fileCount = 1000;
      const files = [];
      
      // Создаем множество файлов
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(testDir, `small-${i}.txt`);
        await fileOps.writeFile(filePath, `Content ${i}`);
        files.push(filePath);
      }
      
      // Измеряем время чтения всех файлов
      const startTime = Date.now();
      const readPromises = files.map(filePath => fileOps.readFile(filePath));
      const results = await Promise.all(readPromises);
      const totalTime = Date.now() - startTime;
      
      // Проверяем результаты
      expect(results.every(result => result.success)).toBe(true);
      expect(totalTime).toBeLessThan(10000); // Должно читаться менее чем за 10 секунд
      
      // Проверяем содержимое
      results.forEach((result, index) => {
        expect(result.content).toBe(`Content ${index}`);
      });
    });

    test('должен эффективно читать файлы с диапазоном строк', async () => {
      const filePath = path.join(testDir, 'lines.txt');
      const lines = Array(10000).fill('Line content').join('\n');
      
      await fileOps.writeFile(filePath, lines);
      
      // Измеряем время чтения диапазона строк
      const startTime = Date.now();
      const result = await fileOps.readFile(filePath, {
        startLine: 1000,
        endLine: 2000
      });
      const readTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.lines).toBe(1001); // Включая последнюю строку
      expect(result.totalLines).toBe(10000);
      expect(readTime).toBeLessThan(1000); // Должно читаться менее чем за 1 секунду
    });
  });

  describe('Производительность записи', () => {
    test('должен быстро записывать файлы размером 5MB', async () => {
      const largeFile = path.join(testDir, 'write-5mb.txt');
      const largeContent = 'B'.repeat(5 * 1024 * 1024); // 5MB
      
      // Измеряем время записи
      const startTime = Date.now();
      const result = await fileOps.writeFile(largeFile, largeContent);
      const writeTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.bytesWritten).toBe(5 * 1024 * 1024);
      expect(writeTime).toBeLessThan(3000); // Должно записываться менее чем за 3 секунды
    });

    test('должен эффективно записывать множество файлов параллельно', async () => {
      const fileCount = 500;
      const files = [];
      
      // Подготавливаем данные для записи
      for (let i = 0; i < fileCount; i++) {
        files.push({
          path: path.join(testDir, `parallel-write-${i}.txt`),
          content: `Parallel content ${i}`
        });
      }
      
      // Измеряем время параллельной записи
      const startTime = Date.now();
      const writePromises = files.map(file => 
        fileOps.writeFile(file.path, file.content)
      );
      const results = await Promise.all(writePromises);
      const totalTime = Date.now() - startTime;
      
      // Проверяем результаты
      expect(results.every(result => result.success)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Должно записываться менее чем за 5 секунд
    });

    test('должен эффективно добавлять к файлу', async () => {
      const filePath = path.join(testDir, 'append.txt');
      const initialContent = 'Initial content\n';
      const appendContent = 'Appended content\n';
      
      // Создаем файл
      await fileOps.writeFile(filePath, initialContent);
      
      // Измеряем время добавления
      const startTime = Date.now();
      const result = await fileOps.writeFile(filePath, appendContent, {
        mode: 'append'
      });
      const appendTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(appendTime).toBeLessThan(100); // Добавление должно быть быстрым
      
      // Проверяем содержимое
      const readResult = await fileOps.readFile(filePath);
      expect(readResult.content).toBe(initialContent + appendContent);
    });
  });

  describe('Производительность копирования', () => {
    test('должен быстро копировать большие файлы', async () => {
      const sourceFile = path.join(testDir, 'source-large.txt');
      const destFile = path.join(testDir, 'dest-large.txt');
      const largeContent = 'C'.repeat(20 * 1024 * 1024); // 20MB
      
      // Создаем исходный файл
      await fileOps.writeFile(sourceFile, largeContent);
      
      // Измеряем время копирования
      const startTime = Date.now();
      const result = await fileOps.copyPath(sourceFile, destFile);
      const copyTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(copyTime).toBeLessThan(10000); // Должно копироваться менее чем за 10 секунд
      
      // Проверяем содержимое
      const readResult = await fileOps.readFile(destFile);
      expect(readResult.content).toBe(largeContent);
    });

    test('должен эффективно копировать директории с множеством файлов', async () => {
      const sourceDir = path.join(testDir, 'source-dir');
      const destDir = path.join(testDir, 'dest-dir');
      const fileCount = 100;
      
      // Создаем исходную директорию с файлами
      await fs.mkdir(sourceDir, { recursive: true });
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(sourceDir, `file-${i}.txt`);
        await fileOps.writeFile(filePath, `File content ${i}`);
      }
      
      // Измеряем время копирования директории
      const startTime = Date.now();
      const result = await fileOps.copyPath(sourceDir, destDir);
      const copyTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(copyTime).toBeLessThan(5000); // Должно копироваться менее чем за 5 секунд
      
      // Проверяем, что все файлы скопированы
      const listResult = await fileOps.listDirectory(destDir);
      expect(listResult.success).toBe(true);
      expect(listResult.entries.length).toBe(fileCount);
    });
  });

  describe('Производительность перемещения', () => {
    test('должен быстро перемещать большие файлы', async () => {
      const sourceFile = path.join(testDir, 'move-source.txt');
      const destFile = path.join(testDir, 'move-dest.txt');
      const largeContent = 'D'.repeat(15 * 1024 * 1024); // 15MB
      
      // Создаем исходный файл
      await fileOps.writeFile(sourceFile, largeContent);
      
      // Измеряем время перемещения
      const startTime = Date.now();
      const result = await fileOps.movePath(sourceFile, destFile);
      const moveTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(moveTime).toBeLessThan(2000); // Перемещение должно быть быстрым
      
      // Проверяем, что исходный файл удален
      const sourceExists = await fs.access(sourceFile).then(() => true).catch(() => false);
      expect(sourceExists).toBe(false);
      
      // Проверяем содержимое перемещенного файла
      const readResult = await fileOps.readFile(destFile);
      expect(readResult.content).toBe(largeContent);
    });
  });

  describe('Производительность листинга', () => {
    test('должен быстро листить директории с множеством файлов', async () => {
      const dirPath = path.join(testDir, 'list-dir');
      const fileCount = 2000;
      
      // Создаем директорию с множеством файлов
      await fs.mkdir(dirPath, { recursive: true });
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(dirPath, `list-file-${i}.txt`);
        await fileOps.writeFile(filePath, `List content ${i}`);
      }
      
      // Измеряем время листинга
      const startTime = Date.now();
      const result = await fileOps.listDirectory(dirPath);
      const listTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.entries.length).toBe(fileCount);
      expect(listTime).toBeLessThan(2000); // Должно листиться менее чем за 2 секунды
    });

    test('должен эффективно листить директории рекурсивно', async () => {
      const baseDir = path.join(testDir, 'recursive-dir');
      const subDirCount = 10;
      const filesPerSubDir = 50;
      
      // Создаем структуру директорий
      for (let i = 0; i < subDirCount; i++) {
        const subDir = path.join(baseDir, `subdir-${i}`);
        await fs.mkdir(subDir, { recursive: true });
        
        for (let j = 0; j < filesPerSubDir; j++) {
          const filePath = path.join(subDir, `file-${j}.txt`);
          await fileOps.writeFile(filePath, `Subdir ${i} file ${j}`);
        }
      }
      
      // Измеряем время рекурсивного листинга
      const startTime = Date.now();
      const result = await fileOps.listDirectory(baseDir, { recursive: true });
      const listTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.entries.length).toBe(subDirCount * filesPerSubDir + subDirCount); // Файлы + директории
      expect(listTime).toBeLessThan(3000); // Должно листиться менее чем за 3 секунды
    });
  });

  describe('Производительность удаления', () => {
    test('должен быстро удалять большие файлы', async () => {
      const largeFile = path.join(testDir, 'delete-large.txt');
      const largeContent = 'E'.repeat(25 * 1024 * 1024); // 25MB
      
      // Создаем файл
      await fileOps.writeFile(largeFile, largeContent);
      
      // Измеряем время удаления
      const startTime = Date.now();
      const result = await fileOps.deletePath(largeFile);
      const deleteTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(deleteTime).toBeLessThan(1000); // Удаление должно быть быстрым
      
      // Проверяем, что файл удален
      const exists = await fs.access(largeFile).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    test('должен эффективно удалять директории с множеством файлов', async () => {
      const dirPath = path.join(testDir, 'delete-dir');
      const fileCount = 1000;
      
      // Создаем директорию с множеством файлов
      await fs.mkdir(dirPath, { recursive: true });
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(dirPath, `delete-file-${i}.txt`);
        await fileOps.writeFile(filePath, `Delete content ${i}`);
      }
      
      // Измеряем время удаления директории
      const startTime = Date.now();
      const result = await fileOps.deletePath(dirPath);
      const deleteTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(deleteTime).toBeLessThan(2000); // Должно удаляться менее чем за 2 секунды
      
      // Проверяем, что директория удалена
      const exists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });
  });

  describe('Производительность статистики', () => {
    test('должен быстро получать статистику файлов', async () => {
      const filePath = path.join(testDir, 'stats.txt');
      const content = 'Stats content';
      
      await fileOps.writeFile(filePath, content);
      
      // Измеряем время получения статистики
      const startTime = Date.now();
      const result = await fileOps.getFileStats(filePath);
      const statsTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.stats.isFile()).toBe(true);
      expect(statsTime).toBeLessThan(100); // Получение статистики должно быть очень быстрым
    });

    test('должен эффективно получать статистику множества файлов', async () => {
      const fileCount = 500;
      const files = [];
      
      // Создаем множество файлов
      for (let i = 0; i < fileCount; i++) {
        const filePath = path.join(testDir, `stats-file-${i}.txt`);
        await fileOps.writeFile(filePath, `Stats content ${i}`);
        files.push(filePath);
      }
      
      // Измеряем время получения статистики всех файлов
      const startTime = Date.now();
      const statsPromises = files.map(filePath => fileOps.getFileStats(filePath));
      const results = await Promise.all(statsPromises);
      const totalTime = Date.now() - startTime;
      
      // Проверяем результаты
      expect(results.every(result => result.success)).toBe(true);
      expect(totalTime).toBeLessThan(1000); // Должно получаться менее чем за 1 секунду
    });
  });
});
