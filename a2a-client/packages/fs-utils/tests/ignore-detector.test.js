/**
 * Тесты для IgnoreDetector
 * 
 * Проверка совместимости с packages/agent/src/ignore-detector.js
 */

const IgnoreDetector = require('../src/ignore-detector');
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

function assertFalse(value, message = '') {
  if (value) {
    throw new Error(`${message}\nExpected: false\nActual: ${value}`);
  }
}

console.log('=== IgnoreDetector Tests ===\n');

// Тест создания
test('Create IgnoreDetector with default config', () => {
  const detector = new IgnoreDetector();
  assertEqual(detector.projectPath, process.cwd(), 'Should use cwd as default');
  assertEqual(detector.customIgnoreFiles.length, 0, 'Should have empty custom ignore files');
  assertEqual(detector._initialized, false, 'Should not be initialized');
});

test('Create IgnoreDetector with custom config', () => {
  const detector = new IgnoreDetector({
    projectPath: '/custom/path',
    customIgnoreFiles: ['.myignore'],
    additionalPatterns: ['custom/**']
  });
  assertEqual(detector.projectPath, '/custom/path', 'Should use custom path');
  assertEqual(detector.customIgnoreFiles.length, 1, 'Should have 1 custom ignore file');
  assertEqual(detector.additionalPatterns.length, 1, 'Should have 1 additional pattern');
});

// Тест _isCommonIgnoredDir
test('_isCommonIgnoredDir returns true for common dirs', () => {
  const detector = new IgnoreDetector();
  assertTrue(detector._isCommonIgnoredDir('node_modules'), 'Should ignore node_modules');
  assertTrue(detector._isCommonIgnoredDir('.git'), 'Should ignore .git');
  assertTrue(detector._isCommonIgnoredDir('vendor'), 'Should ignore vendor');
  assertTrue(detector._isCommonIgnoredDir('dist'), 'Should ignore dist');
  assertTrue(detector._isCommonIgnoredDir('build'), 'Should ignore build');
  assertFalse(detector._isCommonIgnoredDir('app'), 'Should not ignore app');
  assertFalse(detector._isCommonIgnoredDir('src'), 'Should not ignore src');
});

// Тест _parseIgnoreFile
test('_parseIgnoreFile parses basic patterns', () => {
  const detector = new IgnoreDetector();
  const content = `
# Comment
node_modules
*.log
/dist/
!important.txt
`;
  const patterns = detector._parseIgnoreFile(content, '.gitignore');
  
  assertEqual(patterns.length, 4, 'Should parse 4 patterns');
  
  // node_modules
  assertEqual(patterns[0].pattern, 'node_modules', 'First pattern should be node_modules');
  assertFalse(patterns[0].isNegation, 'node_modules should not be negation');
  assertFalse(patterns[0].isDir, 'node_modules should not be dir-only');
  
  // *.log
  assertEqual(patterns[1].pattern, '*.log', 'Second pattern should be *.log');
  
  // /dist/
  assertEqual(patterns[2].pattern, 'dist', 'Third pattern should be dist');
  assertTrue(patterns[2].isRootAnchored, 'dist should be root-anchored');
  assertTrue(patterns[2].isDir, 'dist should be dir-only');
  
  // !important.txt
  assertEqual(patterns[3].pattern, 'important.txt', 'Fourth pattern should be important.txt');
  assertTrue(patterns[3].isNegation, 'important.txt should be negation');
});

// Тест _matchPattern
test('_matchPattern matches glob patterns', () => {
  const detector = new IgnoreDetector();
  
  assertTrue(detector._matchPattern('test.log', '*.log'), 'Should match *.log');
  assertTrue(detector._matchPattern('app.min.js', '*.min.js'), 'Should match *.min.js');
  assertFalse(detector._matchPattern('app.js', '*.min.js'), 'Should not match *.min.js');
  
  assertTrue(detector._matchPattern('node_modules/package', 'node_modules'), 'Should match node_modules');
  assertTrue(detector._matchPattern('node_modules', 'node_modules'), 'Should match exact node_modules');
});

// Тест _matchComponent
test('_matchComponent matches path components', () => {
  const detector = new IgnoreDetector();
  
  assertTrue(detector._matchComponent('node_modules', 'node_modules', true), 'Should match dir pattern');
  assertTrue(detector._matchComponent('test.log', '*.log', false), 'Should match extension pattern');
  assertFalse(detector._matchComponent('test.txt', '*.log', false), 'Should not match different extension');
});

// Асинхронные тесты
(async () => {
  // Тест инициализации
  await asyncTest('Initialize loads default patterns', async () => {
    const detector = new IgnoreDetector({ projectPath: process.cwd() });
    await detector.initialize();
    
    assertTrue(detector._initialized, 'Should be initialized');
    assertTrue(detector.ignorePatterns.length > 0, 'Should have patterns');
    
    // Проверяем наличие стандартных паттернов
    const patterns = detector.getPatterns();
    assertTrue(patterns.some(p => p.pattern === 'node_modules'), 'Should have node_modules pattern');
    assertTrue(patterns.some(p => p.pattern === 'vendor'), 'Should have vendor pattern');
  });

  // Тест shouldIgnore
  await asyncTest('shouldIgnore returns true for ignored paths', async () => {
    const detector = new IgnoreDetector({ projectPath: process.cwd() });
    await detector.initialize();
    
    assertTrue(detector.shouldIgnore('node_modules/package/index.js'), 'Should ignore node_modules');
    assertTrue(detector.shouldIgnore('vendor/autoload.php'), 'Should ignore vendor');
    assertTrue(detector.shouldIgnore('.git/config'), 'Should ignore .git');
    assertFalse(detector.shouldIgnore('app/Controllers/UserController.php'), 'Should not ignore app files');
  });

  // Тест getDirectoriesToSkip
  await asyncTest('getDirectoriesToSkip returns directory patterns', async () => {
    const detector = new IgnoreDetector({ projectPath: process.cwd() });
    await detector.initialize();
    
    const dirsToSkip = detector.getDirectoriesToSkip();
    assertTrue(dirsToSkip.includes('node_modules'), 'Should include node_modules');
    assertTrue(dirsToSkip.includes('vendor'), 'Should include vendor');
  });

  // Тест filterEntries
  await asyncTest('filterEntries filters ignored entries', async () => {
    const detector = new IgnoreDetector({ projectPath: process.cwd() });
    await detector.initialize();
    
    const entries = [
      { name: 'app.php', path: 'app/app.php', type: 'file' },
      { name: 'index.js', path: 'node_modules/package/index.js', type: 'file' },
      { name: 'UserController.php', path: 'app/Controllers/UserController.php', type: 'file' },
    ];
    
    const filtered = detector.filterEntries(entries);
    assertEqual(filtered.length, 2, 'Should have 2 entries after filtering');
    assertTrue(filtered.every(e => !e.path.includes('node_modules')), 'Should not include node_modules');
  });

  // Тест shouldSkipDirectory
  await asyncTest('shouldSkipDirectory returns true for common dirs', async () => {
    const detector = new IgnoreDetector({ projectPath: process.cwd() });
    await detector.initialize();
    
    assertTrue(detector.shouldSkipDirectory('node_modules'), 'Should skip node_modules');
    assertTrue(detector.shouldSkipDirectory('.git'), 'Should skip .git');
    assertTrue(detector.shouldSkipDirectory('vendor'), 'Should skip vendor');
    assertFalse(detector.shouldSkipDirectory('app'), 'Should not skip app');
    assertFalse(detector.shouldSkipDirectory('src'), 'Should not skip src');
  });

  // Тест addPatterns
  await asyncTest('addPatterns adds patterns programmatically', async () => {
    const detector = new IgnoreDetector({ projectPath: process.cwd() });
    await detector.initialize();
    
    const initialCount = detector.ignorePatterns.length;
    detector.addPatterns(['custom/**', 'temp/**']);
    
    assertEqual(detector.ignorePatterns.length, initialCount + 2, 'Should have 2 more patterns');
  });

  // Тест getIgnoreFiles
  await asyncTest('getIgnoreFiles returns found ignore files', async () => {
    const detector = new IgnoreDetector({ projectPath: process.cwd() });
    await detector.initialize();
    
    const ignoreFiles = detector.getIgnoreFiles();
    assertTrue(Array.isArray(ignoreFiles), 'Should return array');
    // Может быть пустым если нет ignore файлов
  });

  // Итоги
  console.log('\n=== Results ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
})();
