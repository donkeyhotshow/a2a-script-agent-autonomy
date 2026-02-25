const fs = require('fs');
const path = require('path');
const { getCurrentDir, expandPath } = require('C:/apps/libs/system/workdir/index.cjs');
const { isReadonly } = require('C:/apps/libs/system/runtime-mode/index.cjs');

// Константы для архивной системы
const ARCHIVE_ROOT = 'C:\\apps2\\_archive';
const SOURCE_ROOT = 'C:\\apps';

// Утилитарная функция для получения абсолютного пути
function resolvePath(p) {
  return path.resolve(getCurrentDir(), expandPath(p));
}

// Проверка безопасности операций
function ensureWritableTarget(targetPath) {
  if (isReadonly()) {
    return { ok: false, error: 'FS в readonly режиме: запись запрещена' };
  }
  // Для архивных операций разрешаем запись в архивную директорию
  if (!targetPath.startsWith(ARCHIVE_ROOT)) {
    return { ok: false, error: `Запись разрешена только в архив: ${ARCHIVE_ROOT}` };
  }
  return { ok: true };
}

// Генерация уникального имени файла с номером
function generateUniqueFileName(originalPath, archivePath) {
  const dir = path.dirname(archivePath);
  const ext = path.extname(originalPath);
  const baseName = path.basename(originalPath, ext);
  
  let counter = 1;
  let newPath = archivePath;
  
  while (fs.existsSync(newPath)) {
    const numberedName = `${baseName}_${counter}${ext}`;
    newPath = path.join(dir, numberedName);
    counter++;
  }
  
  return newPath;
}

// Получение относительного пути от корня приложения
function getRelativeFromAppsRoot(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!absolutePath.startsWith(SOURCE_ROOT)) {
    throw new Error(`Файл ${filePath} не находится в директории ${SOURCE_ROOT} или её поддиректориях`);
  }
  return path.relative(SOURCE_ROOT, absolutePath);
}

// Создание архивного пути с сохранением структуры
function createArchivePath(relativePath) {
  return path.join(ARCHIVE_ROOT, relativePath);
}

// Основная функция архивирования
async function archiveFiles(filePaths) {
  const results = [];
  
  for (const filePath of filePaths) {
    try {
      const resolvedPath = resolvePath(filePath);
      
      // Проверка существования файла
      if (!fs.existsSync(resolvedPath)) {
        results.push({
          success: false,
          file: filePath,
          error: 'Файл не существует'
        });
        continue;
      }
      
      // Получение относительного пути от корня приложения
      let relativePath;
      try {
        relativePath = getRelativeFromAppsRoot(resolvedPath);
      } catch (error) {
        results.push({
          success: false,
          file: filePath,
          error: `Ошибка получения относительного пути: ${error.message}`
        });
        continue;
      }
      
      // Создание архивного пути
      const archivePath = createArchivePath(relativePath);
      
      // Проверка прав на запись
      const writable = ensureWritableTarget(archivePath);
      if (!writable.ok) {
        results.push({
          success: false,
          file: filePath,
          error: writable.error
        });
        continue;
      }
      
      // Создание директорий в архиве
      const archiveDir = path.dirname(archivePath);
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      
      // Генерация уникального имени
      const finalArchivePath = generateUniqueFileName(resolvedPath, archivePath);
      
      // Копирование файла в архив
      fs.copyFileSync(resolvedPath, finalArchivePath);
      
      // Получение информации о файле
      const stats = fs.statSync(resolvedPath);
      
      results.push({
        success: true,
        file: filePath,
        originalPath: resolvedPath,
        archivePath: finalArchivePath,
        relativePath: relativePath,
        size: stats.size,
        archivedAt: new Date().toISOString()
      });
    } catch (error) {
      results.push({
        success: false,
        file: filePath,
        error: error.message
      });
    }
  }
  
  return {
    totalFiles: filePaths.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results: results
  };
}

// Функция для получения информации об архиве
async function getArchiveInfo() {
  try {
    if (!fs.existsSync(ARCHIVE_ROOT)) {
      return {
        success: false,
        error: 'Архивная директория не существует'
      };
    }
    
    const stats = fs.statSync(ARCHIVE_ROOT);
    const files = [];
    
    function scanDirectory(dir, relativePath = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const entryRelativePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath, entryRelativePath);
        } else {
          const fileStats = fs.statSync(fullPath);
          files.push({
            name: entry.name,
            path: entryRelativePath,
            size: fileStats.size,
            modified: fileStats.mtime.toISOString()
          });
        }
      }
    }
    
    scanDirectory(ARCHIVE_ROOT);
    
    return {
      success: true,
      archiveRoot: ARCHIVE_ROOT,
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      lastModified: stats.mtime.toISOString(),
      files: files
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Функция для поиска файлов в архиве
async function searchArchive(query, options = {}) {
  try {
    if (!fs.existsSync(ARCHIVE_ROOT)) {
      return {
        success: false,
        error: 'Архивная директория не существует'
      };
    }
    
    const results = [];
    const { caseSensitive = false, maxResults = 100 } = options;
    const searchPattern = caseSensitive ? query : query.toLowerCase();
    
    function searchDirectory(dir, relativePath = '') {
      if (results.length >= maxResults) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= maxResults) break;
        
        const fullPath = path.join(dir, entry.name);
        const entryRelativePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          searchDirectory(fullPath, entryRelativePath);
        } else {
          const fileName = caseSensitive ? entry.name : entry.name.toLowerCase();
          if (fileName.includes(searchPattern)) {
            const fileStats = fs.statSync(fullPath);
            results.push({
              name: entry.name,
              path: entryRelativePath,
              size: fileStats.size,
              modified: fileStats.mtime.toISOString()
            });
          }
        }
      }
    }
    
    searchDirectory(ARCHIVE_ROOT);
    
    return {
      success: true,
      query: query,
      found: results.length,
      results: results
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  archiveFiles,
  getArchiveInfo,
  searchArchive,
  ARCHIVE_ROOT,
  SOURCE_ROOT
};

