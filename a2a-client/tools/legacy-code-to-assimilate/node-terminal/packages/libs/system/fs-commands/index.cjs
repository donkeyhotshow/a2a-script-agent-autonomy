const fs = require('fs');
const path = require('path');
const { getCurrentDir, getCurrentDirSync, expandPath } = require('C:/apps/libs/system/workdir/index.cjs');
const { RuntimeModeUtils } = require('C:/apps/libs/system/runtime-mode/index.cjs');

class FsCommands {
  constructor(logger, errorHandler, pathUtils, runtimeModeUtils) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.pathUtils = pathUtils; // Для других операций с путями
    this.runtimeModeUtils = runtimeModeUtils; // Для getFsSandboxRoot, isFsReadonly

    // Привязываем методы к экземпляру
    this.listDirectory = this.listDirectory.bind(this);
    this.readFileContent = this.readFileContent.bind(this);
    this.writeFileContent = this.writeFileContent.bind(this);
    this.copyPath = this.copyPath.bind(this);
    this.movePath = this.movePath.bind(this);
    this.deletePath = this.deletePath.bind(this);
  }

  resolvePath(p) {
    // Используем импортированные функции workdir для разрешения путей
    if (typeof getCurrentDirSync !== 'function') {
      throw new Error('getCurrentDirSync is not available');
    }
    return path.resolve(getCurrentDirSync(), expandPath(p));
  }

  // Рекурсивный обход директории для получения всех файлов
  async walkDir(dirPath) {
    const results = [];
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        // Рекурсивно обходим поддиректории
        const subResults = await this.walkDir(fullPath);
        results.push(...subResults);
      } else {
        results.push(fullPath);
      }
    }

    return results;
  }

  isInside(parent, child) {
    try {
      const rel = path.relative(parent, child);
      return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
    } catch (error) { 
      return false; 
    }
  }

  ensureWritableTarget(targetPath) {
    // Проверяем, что runtimeModeUtils доступен и имеет нужные методы
    if (!this.runtimeModeUtils || typeof this.runtimeModeUtils.isReadonly !== 'function') {
      // Если runtimeModeUtils недоступен, разрешаем запись
      return { ok: true };
    }
    
    if (this.runtimeModeUtils.isReadonly()) {
      return { ok: false, error: 'FS в readonly режиме: запись запрещена' };
    }
    
    // Пока что не используем песочницу, так как getFsSandboxRoot не реализован
    return { ok: true };
  }

  // 1. listDirectory (list_dir)
  async listDirectory(targetPath = '.', recursive = false) {
    const resolvedPath = this.resolvePath(targetPath);
    try {
      let entries = [];
      if (recursive) {
        // Рекурсивный обход
        const files = await this.walkDir(resolvedPath);
        entries = files.map(file => {
          const stats = fs.statSync(file);
          return {
            name: path.relative(resolvedPath, file), // Относительный путь
            type: stats.isDirectory() ? 'dir' : 'file',
            size: stats.isFile() ? stats.size : undefined,
          };
        });
      } else {
        entries = fs.readdirSync(resolvedPath, { withFileTypes: true }).map((d) => ({
          name: d.name,
          type: d.isDirectory() ? 'dir' : 'file',
          size: d.isFile() ? fs.statSync(path.join(resolvedPath, d.name)).size : undefined,
        }));
      }
      return { success: true, path: resolvedPath, entries };
    } catch (error) {
      this.logger.error(`Error listing directory ${resolvedPath}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // 2. readFileContent (read_file)
  async readFileContent(filePath, startLine = null, endLine = null) {
    const resolvedPath = this.resolvePath(filePath);
    try {
      if (!fs.existsSync(resolvedPath)) {
        return { success: false, error: 'Файл не существует' };
      }
      if (!fs.statSync(resolvedPath).isFile()) {
        return { success: false, error: 'Не является файлом' };
      }

      const content = fs.readFileSync(resolvedPath, 'utf8');
      if (startLine !== null && endLine !== null) {
        const lines = content.split(/\r?\n/);
        if (startLine < 1 || endLine < startLine || startLine > lines.length) {
          return { success: false, error: 'Некорректный диапазон строк' };
        }
        const slice = lines.slice(startLine - 1, endLine).join('\n');
        return { success: true, content: slice, lines: endLine - startLine + 1 };
      }
      return { success: true, content: content, lines: content.split(/\r?\n/).length };
    } catch (error) {
      this.logger.error(`Error reading file ${resolvedPath}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // 3. writeFileContent
  async writeFileContent(filePath, content, mode = 'overwrite') {
    const resolvedPath = this.resolvePath(filePath);
    try {
      const writable = this.ensureWritableTarget(resolvedPath);
      if (!writable.ok) return { success: false, error: writable.error };
      const dir = path.dirname(resolvedPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let currentSize = 0;
      if (mode === 'append' && fs.existsSync(resolvedPath)) {
        currentSize = fs.statSync(resolvedPath).size;
      }

      const fileMode = mode === 'append' ? 'a' : 'w';
      fs.writeFileSync(resolvedPath, content, { encoding: 'utf8', flag: fileMode });

      const newSize = fs.statSync(resolvedPath).size;
      return { success: true, path: resolvedPath, bytesWritten: newSize - currentSize };
    } catch (error) {
      this.logger.error(`Error writing file ${resolvedPath}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // 4. copyPath
  async copyPath(sourcePath, destinationPath) {
    const resolvedSource = this.resolvePath(sourcePath);
    const resolvedDestination = this.resolvePath(destinationPath);
    try {
      const writable = this.ensureWritableTarget(resolvedDestination);
      if (!writable.ok) return { success: false, error: writable.error };
      fs.copyFileSync(resolvedSource, resolvedDestination);
      return { success: true, source: resolvedSource, destination: resolvedDestination };
    } catch (error) {
      this.logger.error(`Error copying path ${resolvedSource} to ${resolvedDestination}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // 5. movePath
  async movePath(sourcePath, destinationPath) {
    const resolvedSource = this.resolvePath(sourcePath);
    const resolvedDestination = this.resolvePath(destinationPath);
    try {
      const writable = this.ensureWritableTarget(resolvedDestination);
      if (!writable.ok) return { success: false, error: writable.error };
      fs.renameSync(resolvedSource, resolvedDestination);
      return { success: true, source: resolvedSource, destination: resolvedDestination };
    } catch (error) {
      this.logger.error(`Error moving path ${resolvedSource} to ${resolvedDestination}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // 6. deletePath
  async deletePath(targetPath, recursive = false) {
    const resolvedPath = this.resolvePath(targetPath);
    try {
      const writable = this.ensureWritableTarget(resolvedPath);
      if (!writable.ok) return { success: false, error: writable.error };
      if (!fs.existsSync(resolvedPath)) {
        return { success: false, error: 'Путь не существует' };
      }
      const stats = fs.statSync(resolvedPath);
      if (stats.isDirectory()) {
        fs.rmSync(resolvedPath, { recursive: recursive, force: true });
      } else {
        fs.unlinkSync(resolvedPath);
      }
      return { success: true, path: resolvedPath };
    } catch (error) {
      this.logger.error(`Error deleting path ${resolvedPath}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = FsCommands; // Экспортируем класс напрямую

