# @a2a/fs-utils

Общие утилиты для работы с файловой системой в экосистеме A2A.

## Установка

```bash
npm install @a2a/fs-utils
```

## Компоненты

### GlobMatcher

Утилита для матчинга glob паттернов с поддержкой Windows путей.

```javascript
const { GlobMatcher } = require('@a2a/fs-utils');

// Создание матчера
const matcher = new GlobMatcher(['**/*.php', '**/*.js']);

// Проверка соответствия
matcher.match('features/auth/app/Controllers/AuthController.php'); // true
matcher.match('vendor/some/package/file.php'); // true

// Статический метод
GlobMatcher.match('**/*.php', 'app/Controllers/UserController.php'); // true
```

#### Предустановленные паттерны

```javascript
GlobMatcher.PATTERNS = {
  PHP: ['**/*.php'],
  JS: ['**/*.js', '**/*.mjs', '**/*.cjs'],
  TS: ['**/*.ts', '**/*.tsx'],
  VUE: ['**/*.vue'],
  JSON: ['**/*.json'],
  MD: ['**/*.md'],
  CODE: ['**/*.php', '**/*.js', '**/*.ts', '**/*.tsx', '**/*.vue', '**/*.py', '**/*.java', '**/*.go'],
  CONFIG: ['**/*.json', '**/*.yaml', '**/*.yml', '**/*.toml', '**/*.ini'],
  EXCLUDE: [
    'node_modules/**',
    'vendor/**',
    '.git/**',
    'dist/**',
    'build/**',
    'storage/**',
    '.a2a/**',
    '**/*.min.js',
    '**/*.min.css'
  ]
};
```

### FileScanner

Утилита для сканирования директорий с поддержкой include/exclude паттернов.

```javascript
const { FileScanner } = require('@a2a/fs-utils');

// Создание сканера
const scanner = new FileScanner({
  rootPath: '/path/to/project',
  includePatterns: ['**/*.php', '**/*.js'],
  excludePatterns: ['node_modules/**', 'vendor/**'],
  maxDepth: 10,
  maxFiles: 100000,
  onProgress: ({ type, path, stats }) => {
    console.log(`Scanned ${stats.totalDirs} directories...`);
  }
});

// Сканирование
const result = await scanner.scan();

console.log(`Found ${result.files.length} files`);
console.log(`Stats:`, result.stats);

// Статический метод
const result = await FileScanner.scan('/path/to/project', {
  includePatterns: GlobMatcher.PATTERNS.CODE
});

// Сканирование по расширению
const phpFiles = await scanner.scanByExtension('/path/to/project', '.php');
```

### IgnoreDetector

Утилита для определения файлов и директорий, которые следует игнорировать.

```javascript
const { IgnoreDetector } = require('@a2a/fs-utils');

// Создание детектора
const detector = new IgnoreDetector({
  projectPath: '/path/to/project',
  customIgnoreFiles: ['.myignore'],
  additionalPatterns: ['custom/**']
});

// Инициализация (загружает .gitignore, .cursorignore, .a2aignore)
await detector.initialize();

// Проверка
detector.shouldIgnore('node_modules/package/index.js'); // true
detector.shouldIgnore('vendor/autoload.php'); // true
detector.shouldIgnore('app/Controllers/UserController.php'); // false

// Проверка директории
detector.shouldIgnore('node_modules', true); // true

// Получение паттернов
const patterns = detector.getPatterns();

// Добавление паттернов
detector.addPatterns(['temp/**', 'cache/**']);
```

## Использование с другими пакетами A2A

### В @a2a/fulltext

```javascript
const { FileScanner, GlobMatcher } = require('@a2a/fs-utils');

class FullTextIndexer {
  constructor(config) {
    this.scanner = new FileScanner({
      rootPath: config.projectPath,
      includePatterns: GlobMatcher.PATTERNS.CODE,
      excludePatterns: GlobMatcher.PATTERNS.EXCLUDE
    });
  }
  
  async index() {
    const { files } = await this.scanner.scan();
    // ... индексация файлов
  }
}
```

### В @a2a/rag

```javascript
const { FileScanner, IgnoreDetector } = require('@a2a/fs-utils');

class RAGIndexer {
  constructor(config) {
    this.ignoreDetector = new IgnoreDetector({
      projectPath: config.projectPath
    });
  }
  
  async index() {
    await this.ignoreDetector.initialize();
    // ... использование ignoreDetector.shouldIgnore()
  }
}
```

## API Reference

### GlobMatcher

#### `new GlobMatcher(patterns)`

- `patterns` - строка или массив glob паттернов

#### `match(filePath)` → boolean

Проверяет, соответствует ли путь хотя бы одному паттерну.

#### `getMatchingPatterns(filePath)` → string[]

Возвращает все паттерны, которым соответствует путь.

### FileScanner

#### `new FileScanner(config)`

- `rootPath` - корневая директория для сканирования
- `includePatterns` - паттерны для включения файлов
- `excludePatterns` - паттерны для исключения файлов/директорий
- `maxDepth` - максимальная глубина сканирования (0 = без ограничений)
- `maxFiles` - максимальное количество файлов
- `onProgress` - callback для прогресса

#### `scan(dir?, options?)` → Promise<{files, stats, rootPath}>

Сканирует директорию и возвращает список файлов.

#### `scanByExtension(dir, extensions)` → Promise<{files, stats, rootPath}>

Сканирует директорию и фильтрует по расширениям.

### IgnoreDetector

#### `new IgnoreDetector(config)`

- `projectPath` - путь к проекту
- `customIgnoreFiles` - дополнительные ignore файлы
- `additionalPatterns` - дополнительные паттерны

#### `initialize()` → Promise<IgnoreDetector>

Инициализирует детектор, загружает ignore файлы.

#### `shouldIgnore(filePath, isDir?)` → boolean

Проверяет, следует ли игнорировать путь.

#### `getPatterns()` → string[]

Возвращает все паттерны.

#### `addPatterns(patterns)` → void

Добавляет новые паттерны.

## Лицензия

MIT
