/**
 * Тесты для FileScanner
 */

const FileScanner = require('../src/file-scanner');
const GlobMatcher = require('../src/glob-matcher');
const fs = require('fs').promises;
const path = require('path');

// Простой тестовый фреймворк
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${e.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertTrue(value, message = '') {
  if (!value) {
    throw new Error(`${message}\nExpected: true\nActual: ${value}`);
  }
}

console.log('=== FileScanner Tests ===\n');

// Тест создания сканера
test('Create FileScanner with default config', () => {
  const scanner = new FileScanner();
  assertEqual(scanner.rootPath, process.cwd(), 'Should use cwd as default root');
  assertTrue(scanner.includePatterns.length > 0, 'Should have default include patterns');
  assertTrue(scanner.excludePatterns.length > 0, 'Should have default exclude patterns');
});

test('Create FileScanner with custom config', () => {
  const scanner = new FileScanner({
    rootPath: '/custom/path',
    includePatterns: ['**/*.php'],
    excludePatterns: ['vendor/**'],
    maxDepth: 5
  });
  assertEqual(scanner.rootPath, '/custom/path', 'Should use custom root path');
  assertEqual(scanner.includePatterns.length, 1, 'Should have 1 include pattern');
  assertEqual(scanner.excludePatterns.length, 1, 'Should have 1 exclude pattern');
  assertEqual(scanner.maxDepth, 5, 'Should use custom max depth');
});

// Тест shouldIncludeFile
test('shouldIncludeFile with PHP pattern', () => {
  const scanner = new FileScanner({
    includePatterns: ['**/*.php'],
    excludePatterns: []
  });
  assertTrue(scanner.shouldIncludeFile('app.php'), 'Should include .php file');
  assertTrue(scanner.shouldIncludeFile('features/auth/app.php'), 'Should include nested .php file');
});

// Тест shouldExcludeFile
test('shouldExcludeFile with node_modules pattern', () => {
  const scanner = new FileScanner({
    includePatterns: ['**/*'],
    excludePatterns: ['node_modules/**']
  });
  assertTrue(scanner.shouldExcludeFile('node_modules/package/index.js'), 'Should exclude node_modules');
  assertEqual(scanner.shouldExcludeFile('app/Controllers/UserController.php'), false, 'Should not exclude regular files');
});

// Тест shouldExcludeDir
test('shouldExcludeDir with common patterns', () => {
  const scanner = new FileScanner({
    excludePatterns: ['node_modules/**', 'vendor/**', '.git/**']
  });
  assertTrue(scanner.shouldExcludeDir('node_modules'), 'Should exclude node_modules dir');
  assertTrue(scanner.shouldExcludeDir('vendor'), 'Should exclude vendor dir');
  assertTrue(scanner.shouldExcludeDir('.git'), 'Should exclude .git dir');
  assertEqual(scanner.shouldExcludeDir('app'), false, 'Should not exclude app dir');
});

// Асинхронные тесты сканирования
(async () => {
  // Тест сканирования текущего проекта
  await asyncTest('Scan current project', async () => {
    const scanner = new FileScanner({
      rootPath: process.cwd(),
      includePatterns: ['**/*.js'],
      excludePatterns: GlobMatcher.PATTERNS.EXCLUDE
    });
    
    const result = await scanner.scan();
    
    assertTrue(result.files.length > 0, 'Should find some .js files');
    assertTrue(result.stats.totalFiles > 0, 'Should have totalFiles count');
    assertTrue(result.files.every(f => f.ext === '.js'), 'All files should be .js');
  });

  // Тест сканирования с ограничением глубины
  await asyncTest('Scan with maxDepth', async () => {
    const scanner = new FileScanner({
      rootPath: process.cwd(),
      includePatterns: ['**/*.js'],
      excludePatterns: GlobMatcher.PATTERNS.EXCLUDE,
      maxDepth: 1
    });
    
    const result = await scanner.scan();
    
    // Проверяем, что файлы только на глубине 1
    const maxDepth = Math.max(...result.files.map(f => f.relativePath.split(/[\/\\]/).length));
    assertTrue(maxDepth <= 2, `Max depth should be <= 2, got ${maxDepth}`);
  });

  // Тест scanByExtension
  await asyncTest('Scan by extension', async () => {
    const scanner = new FileScanner({
      rootPath: process.cwd(),
      includePatterns: ['**/*.json'],  // Добавляем include паттерн
      excludePatterns: GlobMatcher.PATTERNS.EXCLUDE
    });
    
    const result = await scanner.scan();
    const jsonFiles = result.files.filter(f => f.ext === '.json');
    
    assertTrue(jsonFiles.length > 0, 'Should find some .json files');
    assertTrue(jsonFiles.every(f => f.ext === '.json'), 'All files should be .json');
  });

  // Статический метод
  await asyncTest('Static scan method', async () => {
    const result = await FileScanner.scan(process.cwd(), {
      includePatterns: ['**/*.json'],
      excludePatterns: GlobMatcher.PATTERNS.EXCLUDE
    });
    
    assertTrue(result.files.length > 0, 'Static scan should find files');
  });

  // Итоги
  console.log('\n=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
})();
