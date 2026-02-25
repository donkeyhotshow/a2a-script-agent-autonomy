# MCP Utils File Operations

Библиотека для операций с файлами - чтение, запись, редактирование, мониторинг.

## Возможности

- **Чтение и запись файлов** - безопасные операции с поддержкой резервных копий
- **Редактирование файлов** - система диффов с предварительным просмотром изменений
- **Операции с путями** - копирование, перемещение, удаление файлов и директорий
- **Резервные копии** - автоматическое создание и управление бэкапами
- **Мониторинг файлов** - отслеживание изменений в реальном времени
- **Буфер редактирования** - временное хранение изменений с TTL

## Установка

```bash
npm install mcp-utils-file-operations
```

## Использование

### Основные операции с файлами

```javascript
const fileOps = require('mcp-utils-file-operations');

// Чтение файла
const result = await fileOps.readFile('path/to/file.txt');
if (result.success) {
  console.log('Содержимое:', result.content);
  console.log('Размер:', result.size, 'байт');
  console.log('Строк:', result.lines);
}

// Запись файла
const writeResult = await fileOps.writeFile('path/to/file.txt', 'Новое содержимое');
if (writeResult.success) {
  console.log('Записано байт:', writeResult.bytesWritten);
}

// Чтение диапазона строк
const linesResult = await fileOps.readFile('path/to/file.txt', {
  startLine: 5,
  endLine: 10
});
```

### Операции с путями

```javascript
// Копирование файла
await fileOps.copyPath('source.txt', 'destination.txt', {
  overwrite: true,
  createBackup: true
});

// Перемещение файла
await fileOps.movePath('old-location.txt', 'new-location.txt');

// Удаление файла
await fileOps.deletePath('file-to-delete.txt', {
  createBackup: true
});

// Список файлов в директории
const dirResult = await fileOps.listDirectory('path/to/directory', {
  recursive: true,
  filter: (entry) => entry.name.endsWith('.js')
});
```

### Система редактирования с диффами

```javascript
// Подготовка изменений
const editResult = await fileOps.prepareEdit('file.txt', 'Новое содержимое файла');
if (editResult.success) {
  console.log('Ключ редактирования:', editResult.editKey);
  console.log('Предварительный просмотр изменений:');
  console.log(editResult.diffPreview);
}

// Применение изменений
const applyResult = await fileOps.applyEdit(editResult.editKey);
if (applyResult.success) {
  console.log('Изменения применены');
  console.log('Резервная копия:', applyResult.backupPath);
}

// Отмена изменений
fileOps.discardEdit(editResult.editKey);
```

### Резервные копии

```javascript
// Создание резервной копии
const backupResult = await fileOps.createBackup('important-file.txt');
if (backupResult.success) {
  console.log('Резервная копия создана:', backupResult.backupPath);
}

// Очистка старых резервных копий
const cleanupResult = await fileOps.cleanupBackups('important-file.txt');
console.log('Удалено копий:', cleanupResult.deleted);
```

### Мониторинг файлов

```javascript
// Создание мониторинга
const watcher = fileOps.createFileWatcher(['path/to/watch'], {
  ignored: /node_modules/,
  persistent: true
});

// Обработка событий
watcher.on('change', (path) => {
  console.log('Файл изменен:', path);
});

watcher.on('add', (path) => {
  console.log('Файл добавлен:', path);
});

watcher.on('unlink', (path) => {
  console.log('Файл удален:', path);
});

// Закрытие мониторинга
watcher.close();
```

### Создание экземпляра с настройками

```javascript
const FileOperations = require('mcp-utils-file-operations');

const fileOps = new FileOperations({
  defaultEncoding: 'utf8',
  backupEnabled: true,
  backupSuffix: '.backup',
  maxBackups: 10,
  maxBufferSize: 200,
  diffLifetime: 2 * 60 * 60 * 1000 // 2 часа
});
```

## API

### Основные методы

#### `readFile(filePath, options)`
Читает содержимое файла.

**Параметры:**
- `filePath` (string) - путь к файлу
- `options` (object) - опции чтения
  - `encoding` (string) - кодировка (по умолчанию 'utf8')
  - `startLine` (number) - начальная строка (1-based)
  - `endLine` (number) - конечная строка (1-based)
  - `createBackup` (boolean) - создавать резервную копию

**Возвращает:** `Promise<Object>` - результат чтения

#### `writeFile(filePath, content, options)`
Записывает содержимое в файл.

**Параметры:**
- `filePath` (string) - путь к файлу
- `content` (string) - содержимое для записи
- `options` (object) - опции записи
  - `encoding` (string) - кодировка
  - `mode` (string) - режим записи ('overwrite' или 'append')
  - `createBackup` (boolean) - создавать резервную копию
  - `ensureDir` (boolean) - создавать директории

**Возвращает:** `Promise<Object>` - результат записи

#### `copyPath(sourcePath, destinationPath, options)`
Копирует файл или директорию.

**Параметры:**
- `sourcePath` (string) - исходный путь
- `destinationPath` (string) - путь назначения
- `options` (object) - опции копирования
  - `overwrite` (boolean) - перезаписывать существующие файлы
  - `createBackup` (boolean) - создавать резервную копию
  - `ensureDir` (boolean) - создавать директории

**Возвращает:** `Promise<Object>` - результат копирования

#### `movePath(sourcePath, destinationPath, options)`
Перемещает файл или директорию.

**Параметры:**
- `sourcePath` (string) - исходный путь
- `destinationPath` (string) - путь назначения
- `options` (object) - опции перемещения

**Возвращает:** `Promise<Object>` - результат перемещения

#### `deletePath(targetPath, options)`
Удаляет файл или директорию.

**Параметры:**
- `targetPath` (string) - путь для удаления
- `options` (object) - опции удаления
  - `recursive` (boolean) - рекурсивное удаление директорий
  - `createBackup` (boolean) - создавать резервную копию

**Возвращает:** `Promise<Object>` - результат удаления

### Методы редактирования

#### `prepareEdit(filePath, newContent)`
Подготавливает дифф для файла.

**Параметры:**
- `filePath` (string) - путь к файлу
- `newContent` (string) - новое содержимое

**Возвращает:** `Promise<Object>` - результат подготовки

#### `applyEdit(editKey)`
Применяет сохраненный дифф к файлу.

**Параметры:**
- `editKey` (string) - ключ дифф

**Возвращает:** `Promise<Object>` - результат применения

#### `discardEdit(editKey)`
Отменяет сохраненный дифф.

**Параметры:**
- `editKey` (string) - ключ дифф

**Возвращает:** `Object` - результат отмены

### Методы резервных копий

#### `createBackup(filePath)`
Создает резервную копию файла.

**Параметры:**
- `filePath` (string) - путь к файлу

**Возвращает:** `Promise<Object>` - результат создания копии

#### `cleanupBackups(filePath)`
Очищает старые резервные копии.

**Параметры:**
- `filePath` (string) - путь к файлу

**Возвращает:** `Promise<Object>` - результат очистки

### Методы мониторинга

#### `createFileWatcher(paths, options)`
Создает мониторинг файлов.

**Параметры:**
- `paths` (string|Array) - пути для мониторинга
- `options` (object) - опции мониторинга

**Возвращает:** `Object` - экземпляр мониторинга

## Опции конструктора

```javascript
const options = {
  defaultEncoding: 'utf8',        // Кодировка по умолчанию
  backupEnabled: true,            // Включить резервные копии
  backupSuffix: '.backup',        // Суффикс резервных копий
  maxBackups: 5,                  // Максимум резервных копий
  maxBufferSize: 100,             // Максимум файлов в буфере
  diffLifetime: 60 * 60 * 1000   // Время жизни диффов (1 час)
};
```

## Обработка ошибок

Все методы возвращают объект с полем `success`:

```javascript
const result = await fileOps.readFile('nonexistent.txt');
if (!result.success) {
  console.error('Ошибка:', result.error);
} else {
  console.log('Содержимое:', result.content);
}
```

## Тестирование

```bash
npm test
```

## Лицензия

MIT
