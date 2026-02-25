"use strict";
/**
 * File System Reader - Handles file operations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystem = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_utils_1 = require("@a2a/fs-utils");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class FileSystem {
    constructor(config = {}) {
        this.projectPath = config.projectPath ?? process.cwd();
        this.ignoreDetector = null;
        this.enableIgnore = config.enableIgnore !== false;
        if (this.enableIgnore) {
            this.ignoreDetector = new fs_utils_1.IgnoreDetector({
                projectPath: this.projectPath,
                customIgnoreFiles: config.customIgnoreFiles ?? [],
            });
        }
    }
    async initialize() {
        if (this.ignoreDetector)
            await this.ignoreDetector.initialize();
    }
    async exists(filePath) {
        const fullPath = path_1.default.isAbsolute(filePath) ? filePath : path_1.default.join(this.projectPath, filePath);
        try {
            await promises_1.default.access(fullPath);
            return true;
        }
        catch {
            return false;
        }
    }
    async readFile(filePath) {
        const fullPath = path_1.default.join(this.projectPath, filePath);
        if (!(await this.exists(fullPath)))
            throw new Error(`File not found: ${filePath}`);
        const content = await promises_1.default.readFile(fullPath, 'utf-8');
        const stats = await promises_1.default.stat(fullPath);
        return { content, size: stats.size, modified: stats.mtime.toISOString(), path: filePath };
    }
    async writeFile(filePath, content, options = {}) {
        const fullPath = path_1.default.join(this.projectPath, filePath);
        if ((await this.exists(fullPath)) && !options.overwrite) {
            throw new Error(`File already exists: ${filePath}. Use overwrite: true to replace.`);
        }
        const dir = path_1.default.dirname(fullPath);
        await promises_1.default.mkdir(dir, { recursive: true });
        await promises_1.default.writeFile(fullPath, content, 'utf-8');
        return { path: filePath, size: content.length, created: true };
    }
    async deleteFile(filePath) {
        const fullPath = path_1.default.join(this.projectPath, filePath);
        if (!(await this.exists(fullPath)))
            throw new Error(`File not found: ${filePath}`);
        await promises_1.default.unlink(fullPath);
        return { path: filePath, deleted: true };
    }
    async listDirectory(dirPath = '', options = {}) {
        const fullPath = path_1.default.join(this.projectPath, dirPath);
        if (!(await this.exists(fullPath)))
            throw new Error(`Directory not found: ${dirPath}`);
        const entries = await promises_1.default.readdir(fullPath, { withFileTypes: true });
        const result = [];
        for (const entry of entries) {
            const entryPath = path_1.default.join(dirPath, entry.name);
            if (options.ignore !== false && this.ignoreDetector) {
                if (this.ignoreDetector.shouldIgnore(entryPath))
                    continue;
                if (entry.isDirectory() && this.ignoreDetector.shouldSkipDirectory(entry.name, dirPath))
                    continue;
            }
            result.push({
                name: entry.name,
                path: entryPath,
                type: entry.isDirectory() ? 'directory' : 'file',
            });
            if (options.recursive && entry.isDirectory()) {
                if (options.ignore !== false && this.ignoreDetector?.shouldSkipDirectory(entry.name, dirPath))
                    continue;
                const sub = await this.listDirectory(entryPath, options);
                result.push(...sub);
            }
        }
        return result;
    }
    async runTest(testPath) {
        const fullPath = path_1.default.join(this.projectPath, testPath);
        if (!(await this.exists(fullPath)))
            throw new Error(`Test file not found: ${testPath}`);
        const ext = path_1.default.extname(testPath);
        let command;
        if (ext === '.php')
            command = `cd ${this.projectPath} && ./vendor/bin/phpunit ${testPath}`;
        else if (ext === '.js' || ext === '.ts')
            command = `cd ${this.projectPath} && npm test -- ${testPath}`;
        else
            throw new Error(`Unsupported test file type: ${ext}`);
        try {
            const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
            return { success: true, output: stdout, errors: stderr, path: testPath };
        }
        catch (error) {
            const e = error;
            return { success: false, output: e.stdout, errors: e.stderr ?? e.message, path: testPath };
        }
    }
    async getStats(filePath) {
        const fullPath = path_1.default.join(this.projectPath, filePath);
        const stats = await promises_1.default.stat(fullPath);
        return {
            path: filePath,
            size: stats.size,
            created: stats.birthtime.toISOString(),
            modified: stats.mtime.toISOString(),
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
        };
    }
}
exports.FileSystem = FileSystem;
