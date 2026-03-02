"use strict";
/**
 * RAG Integrator - Connects File Scanner with RAG System
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : {"default": mod};
};
Object.defineProperty(exports, "__esModule", {value: true});
exports.RAGIntegrator = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const fs_utils_1 = require("@a2a/fs-utils");
const indexer_js_1 = require("./indexer.js");
const chunk_manager_js_1 = require("./chunk-manager.js");
const chokidar_1 = __importDefault(require("chokidar"));

class RAGIntegrator {
    constructor(config = {}) {
        this.watcher = null;
        this.isWatching = false;
        this.fileCache = new Map();
        const projectPath = config.projectPath ?? process.cwd();
        this.config = {...config, projectPath};
        this.scanner = new fs_utils_1.FileScanner({
            rootPath: projectPath,
            includePatterns: config.includePatterns ?? [...fs_utils_1.GlobMatcher.PATTERNS.CODE],
            excludePatterns: config.excludePatterns ?? [...fs_utils_1.GlobMatcher.PATTERNS.EXCLUDE],
            maxDepth: config.maxDepth ?? 0,
            maxFiles: config.maxFiles ?? 100000,
        });
        this.indexer = new indexer_js_1.RAGIndexer({...config, projectPath});
        this.chunkManager = new chunk_manager_js_1.ChunkManager(config);
    }

    async scanAndIndex() {
        const scanResult = await this.scanner.scan();
        for (const file of scanResult.files) {
            await this.indexFile(file);
        }
        return scanResult;
    }

    async indexFile(file) {
        try {
            const content = await this.readFile(file.path);
            const chunks = this.chunkManager.chunkFile(file.path, content, file.ext);
            for (const chunk of chunks) {
                await this.indexer.indexChunk(chunk);
            }
            this.fileCache.set(file.path, content);
            return {success: true, file, chunks: chunks.length};
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {success: false, file, error: message};
        }
    }

    async readFile(filePath) {
        const cached = this.fileCache.get(filePath);
        if (cached)
            return cached;
        const content = await promises_1.default.readFile(filePath, 'utf-8');
        this.fileCache.set(filePath, content);
        return content;
    }

    startWatching() {
        if (this.isWatching)
            return;
        this.watcher = chokidar_1.default.watch(this.config.projectPath, {
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {stabilityThreshold: 2000, pollInterval: 100},
            ignored: this.scanner.excludePatterns,
        });
        this.watcher
            .on('add', (p) => this.handleFileChange('add', p))
            .on('change', (p) => this.handleFileChange('change', p))
            .on('unlink', (p) => this.handleFileChange('unlink', p))
            .on('addDir', (p) => this.handleDirectoryChange('add', p))
            .on('unlinkDir', (p) => this.handleDirectoryChange('unlink', p));
        this.isWatching = true;
    }

    async handleFileChange(event, filePath) {
        try {
            const relativePath = path_1.default.relative(this.config.projectPath, filePath);
            if (event === 'add' || event === 'change') {
                await this.indexFile({
                    path: filePath,
                    relativePath,
                    name: path_1.default.basename(filePath),
                    ext: path_1.default.extname(filePath).toLowerCase(),
                });
            } else if (event === 'unlink') {
                await this.indexer.removeFile(filePath);
            }
        } catch {
            // ignore
        }
    }

    async handleDirectoryChange(event, dirPath) {
        try {
            if (event === 'unlink') {
                await this.indexer.removeDirectory(dirPath);
            }
        } catch {
            // ignore
        }
    }

    stopWatching() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
            this.isWatching = false;
        }
    }

    getStats() {
        return {
            filesIndexed: this.indexer.getIndexedFilesCount(),
            chunksIndexed: this.indexer.getIndexedChunksCount(),
            watching: this.isWatching,
            cacheSize: this.fileCache.size,
        };
    }

    clearCache() {
        this.fileCache.clear();
    }

    dispose() {
        this.stopWatching();
        this.clearCache();
        this.indexer.dispose();
    }
}

exports.RAGIntegrator = RAGIntegrator;
