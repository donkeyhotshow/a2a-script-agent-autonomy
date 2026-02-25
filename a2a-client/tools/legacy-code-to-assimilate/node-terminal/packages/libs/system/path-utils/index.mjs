import path from 'path';
import { initializeFsModules } from './browser-stubs.mjs';
import { isBrowser, APP_ROOT } from './path-constants.mjs';
import BrowserFileOperations from './file-operations.browser.mjs'; // Import the browser stub
// import FileOperations from './file-operations.mjs'; // Removed direct import

/**
 * PathUtils - Утилиты для работы с путями и файловой системой
 * Предоставляет унифицированный интерфейс для работы с путями с поддержкой логирования
 */
class PathUtils {
    constructor(logger = console) {
        this.logger = logger;
        this.fileOpsInitialized = false;
        this.fileOpsPromise = null;
    }

    async initialize(fsPromises, fsSync) {
        if (this.fileOpsInitialized) {
            return;
        }
        this.fileOpsPromise = this.initializeFileOperations(fsPromises, fsSync, this.logger);
        this.fileOps = await this.fileOpsPromise;
        this.fileOpsInitialized = true;
    }

    async initializeFileOperations(fsPromises, fsSync, logger) {
        if (isBrowser) {
            return new BrowserFileOperations(fsPromises, fsSync, logger);
        } else {
            // In Node.js, directly import the CJS FileOperations
            const { FileOperations } = require('../../file-operations/src/file-operations.cjs');
            return new FileOperations({ fsPromises, fsSync }, logger);
        }
    }

    // Delegating methods will now await the fileOpsPromise if not yet resolved
    async getDirname(filePath) { await this.fileOpsPromise; return this.fileOps.getDirname(filePath); }
    async join(...paths) { await this.fileOpsPromise; return this.fileOps.join(...paths); }
    async resolve(...paths) { await this.fileOpsPromise; return this.fileOps.resolve(...paths); }
    async getRelativePath(from, to) { await this.fileOpsPromise; return this.fileOps.getRelativePath(from, to); }
    async isAbsolute(filePath) { await this.fileOpsPromise; return this.fileOps.isAbsolute(filePath); }
    async getExtension(filePath) { await this.fileOpsPromise; return this.fileOps.getExtension(filePath); }
    async getBasename(filePath) { await this.fileOpsPromise; return this.fileOps.getBasename(filePath); }
    async getFilename(filePath) { await this.fileOpsPromise; return this.fileOps.getFilename(filePath); }
    async readdir(dirPath) { await this.fileOpsPromise; return this.fileOps.readdir(dirPath); }
    async stat(filePath) { await this.fileOpsPromise; return this.fileOps.stat(filePath); }
    async existsSync(filePath) { await this.fileOpsPromise; return this.fileOps.existsSync(filePath); }
    async readFileSync(filePath, encoding) { await this.fileOpsPromise; return this.fileOps.readFileSync(filePath, encoding); }
    async writeFileSync(filePath, content, encoding) { await this.fileOpsPromise; return this.fileOps.writeFileSync(filePath, content, encoding); }
    async appendFileSync(filePath, content, encoding) { await this.fileOpsPromise; return this.fileOps.appendFileSync(filePath, content, encoding); }
    async statSync(filePath) { await this.fileOpsPromise; return this.fileOps.statSync(filePath); }
    async readdirSync(dirPath) { await this.fileOpsPromise; return this.fileOps.readdirSync(dirPath); }
    async ensureDirSync(dirPath, options) { await this.fileOpsPromise; return this.fileOps.ensureDirSync(dirPath, options); }
    async exists(filePath) { await this.fileOpsPromise; return this.fileOps.exists(filePath); }
    async readFile(filePath, encoding) { await this.fileOpsPromise; return this.fileOps.readFile(filePath, encoding); }
    async writeFile(filePath, content, encoding) { await this.fileOpsPromise; return this.fileOps.writeFile(filePath, content, encoding); }
    async appendFile(filePath, content, encoding) { await this.fileOpsPromise; return this.fileOps.appendFile(filePath, content, encoding); }
    async ensureDir(dirPath, options) { await this.fileOpsPromise; return this.fileOps.ensureDir(dirPath, options); }
    async mkdir(dirPath, options) { await this.fileOpsPromise; return this.fileOps.mkdir(dirPath, options); }
    async remove(filePath, options) { await this.fileOpsPromise; return this.fileOps.remove(filePath, options); }
    async copyFile(source, destination) { await this.fileOpsPromise; return this.fileOps.copyFile(source, destination); }
    async moveFile(oldPath, newPath) { await this.fileOpsPromise; return this.fileOps.moveFile(oldPath, newPath); }
    async getCurrentWorkingDir() { await this.fileOpsPromise; return this.fileOps.getCurrentWorkingDir(isBrowser, APP_ROOT); }
    async normalize(filePath) { await this.fileOpsPromise; return this.fileOps.normalize(filePath); }
}

// Асинхронная фабричная функция для создания экземпляра PathUtils
export async function createPathUtils(logger = console) {
  const { fsPromises, fsSync } = await initializeFsModules();
  const pathUtils = new PathUtils(logger);
  await pathUtils.initialize(fsPromises, fsSync);
  return pathUtils;
}
