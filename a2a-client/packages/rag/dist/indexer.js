"use strict";
/**
 * RAG Indexer - Local project indexing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : {"default": mod};
};
Object.defineProperty(exports, "__esModule", {value: true});
exports.RAGIndexer = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const fs_utils_1 = require("@a2a/fs-utils");
const chunk_manager_js_1 = require("./chunk-manager.js");
const DEFAULT_EXCLUDE = [
    '.a2a/', '.a2a/index/**', '.a2a/index/rag-files.json', '.amazonq/**', '.cursor/**',
    '.idea/**', '.vscode/**', 'node_modules/**', 'node_modules/', 'vendor/**', 'storage/**',
    '.git/**', 'dist/**', 'build/**', 'package-lock.json',
];

class RAGIndexer {
    constructor(config) {
        this.ignoreDetector = null;
        this.index = null;
        this.projectPath = config.projectPath;
        this.indexPath = path_1.default.join(this.projectPath, '.a2a', 'index');
        this.includePatterns = config.includePatterns ?? ['**/*.php', '**/*.js', '**/*.vue', '**/*.ts', '**/*.json', '**/*.md'];
        this.excludePatterns = config.excludePatterns ?? DEFAULT_EXCLUDE;
        this.chunkManager = new chunk_manager_js_1.ChunkManager(config);
        this._initIgnoreDetectorPromise = this._initIgnoreDetector(config);
    }

    async _initIgnoreDetector(config) {
        try {
            this.ignoreDetector = new fs_utils_1.IgnoreDetector({
                projectPath: this.projectPath,
                customIgnoreFiles: config.customIgnoreFiles ?? [],
            });
            await this.ignoreDetector.initialize();
        } catch {
            // ignore
        }
    }

    async _ensureIgnoreDetector() {
        await this._initIgnoreDetectorPromise;
    }

    async indexProject(force = false) {
        await promises_1.default.mkdir(this.indexPath, {recursive: true});
        await this._ensureIgnoreDetector();
        const files = await this.walkDirectory(this.projectPath);
        const index = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            projectPath: this.projectPath,
            files: [],
            chunks: [],
        };
        for (const filePath of files) {
            try {
                const fileInfo = await this.indexFile(filePath);
                if (fileInfo) {
                    index.files.push(fileInfo.file);
                    index.chunks.push(...fileInfo.chunks);
                }
            } catch {
                // skip failed files
            }
        }
        const indexFilePath = path_1.default.join(this.indexPath, 'rag-files.json');
        try {
            await promises_1.default.unlink(indexFilePath);
        } catch {
            // ignore
        }
        await promises_1.default.writeFile(indexFilePath, JSON.stringify(index, null, 2));
        this.index = index;
        return index;
    }

    async indexFile(filePath) {
        const relativePath = path_1.default.relative(this.projectPath, filePath).replace(/\\/g, '/');
        const ext = path_1.default.extname(filePath);
        const content = await promises_1.default.readFile(filePath, 'utf-8');
        const stats = await promises_1.default.stat(filePath);
        const file = {
            path: relativePath,
            ext,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            hash: this.chunkManager.hashContent(content),
            language: this.detectLanguage(ext),
        };
        const chunks = this.chunkManager.chunkFile(relativePath, content, ext);
        return {file, chunks};
    }

    async walkDirectory(dir, files = []) {
        const entries = await promises_1.default.readdir(dir, {withFileTypes: true});
        for (const entry of entries) {
            const fullPath = path_1.default.join(dir, entry.name);
            const relativePath = path_1.default.relative(this.projectPath, fullPath).replace(/\\/g, '/');
            if (entry.isDirectory()) {
                if (this.shouldExcludeDir(relativePath + '/'))
                    continue;
                if (this.ignoreDetector?.shouldIgnore(relativePath))
                    continue;
                if (this.ignoreDetector?.shouldSkipDirectory(entry.name, path_1.default.relative(this.projectPath, dir)))
                    continue;
                await this.walkDirectory(fullPath, files);
            } else if (entry.isFile()) {
                if (this.shouldExcludeFile(relativePath))
                    continue;
                if (this.ignoreDetector?.shouldIgnore(relativePath))
                    continue;
                files.push(fullPath);
            }
        }
        return files;
    }

    shouldExcludeDir(relativePath) {
        return this.excludePatterns.some((p) => this.matchPattern(relativePath, p));
    }

    shouldExcludeFile(relativePath) {
        if (this.excludePatterns.some((p) => this.matchPattern(relativePath, p)))
            return true;
        if (this.includePatterns.length > 0) {
            const included = this.includePatterns.some((p) => this.matchPattern(relativePath, p));
            return !included;
        }
        return false;
    }

    matchPattern(filePath, pattern) {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const isDirPattern = pattern.endsWith('/');
        if (!pattern.includes('**')) {
            const searchName = isDirPattern ? pattern.slice(0, -1) : pattern;
            const pathParts = normalizedPath.split('/');
            for (const part of pathParts) {
                if (isDirPattern) {
                    if (part === searchName)
                        return true;
                } else {
                    if (this.matchFileName(part, searchName))
                        return true;
                }
            }
            return false;
        }
        const regexPattern = pattern
            .replace(/\*\*\//g, '{{GLOBSTAR_SLASH}}')
            .replace(/\*\*/g, '{{GLOBSTAR}}')
            .replace(/\*/g, '{{STAR}}')
            .replace(/\./g, '\\.')
            .replace(/{{GLOBSTAR_SLASH}}/g, '(.*\\/)?')
            .replace(/{{GLOBSTAR}}/g, '.*')
            .replace(/{{STAR}}/g, '[^/]*');
        return new RegExp('^' + regexPattern + '$').test(normalizedPath);
    }

    matchFileName(fileName, pattern) {
        if (fileName === pattern)
            return true;
        if (pattern.includes('*')) {
            const re = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return re.test(fileName);
        }
        return false;
    }

    detectLanguage(ext) {
        const map = {
            '.php': 'php', '.js': 'javascript', '.ts': 'typescript', '.vue': 'vue',
            '.md': 'markdown', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
        };
        return map[ext] ?? 'text';
    }

    async indexChunk(chunk) {
        if (!this.index)
            return;
        if (!this.index.chunks.some((c) => c.id === chunk.id)) {
            this.index.chunks.push(chunk);
        }
    }

    async removeFile(filePath) {
        if (!this.index)
            return;
        const relativePath = filePath.replace(this.projectPath, '').replace(/^[\\/]/, '');
        this.index.files = this.index.files.filter((f) => f.path !== relativePath);
        this.index.chunks = this.index.chunks.filter((c) => c.filePath !== relativePath);
    }

    async removeDirectory(dirPath) {
        if (!this.index)
            return;
        const relativePath = dirPath.replace(this.projectPath, '').replace(/^[\\/]/, '');
        this.index.files = this.index.files.filter((f) => !f.path.startsWith(relativePath));
        this.index.chunks = this.index.chunks.filter((c) => !c.filePath.startsWith(relativePath));
    }

    getIndexedFilesCount() {
        return this.index?.files?.length ?? 0;
    }

    getIndexedChunksCount() {
        return this.index?.chunks?.length ?? 0;
    }

    dispose() {
        this.index = null;
    }
}

exports.RAGIndexer = RAGIndexer;
