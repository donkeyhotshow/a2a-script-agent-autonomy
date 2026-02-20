/**
 * Тесты для GlobMatcher
 */

const GlobMatcher = require('../src/glob-matcher');

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

function assertEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

console.log('=== GlobMatcher Tests ===\n');

// Тесты для простых паттернов
test('Simple extension pattern *.php', () => {
  const matcher = new GlobMatcher('*.php');
  assertEqual(matcher.match('test.php'), true, 'Should match test.php');
  assertEqual(matcher.match('file.txt'), false, 'Should not match file.txt');
});

// Тесты для **/*.ext паттернов
test('Recursive pattern **/*.php', () => {
  const matcher = new GlobMatcher('**/*.php');
  assertEqual(matcher.match('app.php'), true, 'Should match app.php in root');
  assertEqual(matcher.match('bootstrap/app.php'), true, 'Should match bootstrap/app.php');
  assertEqual(matcher.match('features/business/auth/app/Http/Controllers/AuthController.php'), true, 'Should match deep path');
  assertEqual(matcher.match('app.js'), false, 'Should not match .js file');
});

// Тесты для **/dir/** паттернов
test('Directory pattern node_modules/**', () => {
  const matcher = new GlobMatcher('node_modules/**');
  assertEqual(matcher.match('node_modules/package/index.js'), true, 'Should match node_modules files');
  assertEqual(matcher.match('node_modules/package/sub/file.js'), true, 'Should match nested node_modules files');
  assertEqual(matcher.match('packages/agent/node_modules/test.js'), false, 'Should not match if node_modules is not at root');
});

// Тесты для множественных паттернов
test('Multiple patterns', () => {
  const matcher = new GlobMatcher(['**/*.php', '**/*.js']);
  assertEqual(matcher.match('app.php'), true, 'Should match .php');
  assertEqual(matcher.match('app.js'), true, 'Should match .js');
  assertEqual(matcher.match('app.ts'), false, 'Should not match .ts');
});

// Тесты для Windows путей
test('Windows path handling', () => {
  const matcher = new GlobMatcher('**/*.php');
  assertEqual(matcher.match('features\\business\\auth\\app.php'), true, 'Should match Windows path');
  assertEqual(matcher.match('bootstrap\\app.php'), true, 'Should match Windows path in subdirectory');
});

// Тесты для предустановленных паттернов
test('Preset patterns - CODE', () => {
  const matcher = new GlobMatcher(GlobMatcher.PATTERNS.CODE);
  assertEqual(matcher.match('app.php'), true, 'Should match .php');
  assertEqual(matcher.match('app.js'), true, 'Should match .js');
  assertEqual(matcher.match('app.ts'), true, 'Should match .ts');
  assertEqual(matcher.match('app.vue'), true, 'Should match .vue');
  assertEqual(matcher.match('app.json'), false, 'Should not match .json');
});

test('Preset patterns - EXCLUDE', () => {
  const matcher = new GlobMatcher(GlobMatcher.PATTERNS.EXCLUDE);
  assertEqual(matcher.match('node_modules/package/index.js'), true, 'Should match node_modules');
  assertEqual(matcher.match('vendor/autoload.php'), true, 'Should match vendor');
  assertEqual(matcher.match('.git/config'), true, 'Should match .git');
  assertEqual(matcher.match('app/Controllers/UserController.php'), false, 'Should not match regular file');
});

// Тесты для edge cases
test('Empty pattern', () => {
  const matcher = new GlobMatcher('');
  assertEqual(matcher.match(''), true, 'Empty pattern should match empty string');
  assertEqual(matcher.match('test.php'), false, 'Empty pattern should not match non-empty string');
});

test('Pattern with dots in filename', () => {
  const matcher = new GlobMatcher('**/*.min.js');
  assertEqual(matcher.match('app.min.js'), true, 'Should match .min.js');
  assertEqual(matcher.match('app.js'), false, 'Should not match regular .js');
});

// Статический метод
test('Static match method', () => {
  assertEqual(GlobMatcher.match('**/*.php', 'test.php'), true, 'Static match should work');
  assertEqual(GlobMatcher.match('**/*.php', 'test.js'), false, 'Static match should return false for non-matching');
});

// Итоги
console.log('\n=== Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
