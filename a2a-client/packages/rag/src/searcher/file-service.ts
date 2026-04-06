/**
 * File Service - Handles file-related operations
 */

import fs from 'fs/promises';
import path from 'path';
import type { IndexFileInfo } from '../indexer.js';
import type { Chunk } from '../chunk-manager.js';
import type { RAGIndexData } from '../indexer.js';
import { matchPattern } from './chunk-pipeline.js';

export class FileService {
    private projectPath: string;

    constructor(projectPath: string) {
        this.projectPath = projectPath;
    }

    async searchFiles(pattern: string, index: RAGIndexData): Promise<IndexFileInfo[]> {
        return index.files.filter((file) => matchPattern(file.path, pattern));
    }

    async getFileContent(relativePath: string): Promise<string> {
        const fullPath = path.join(this.projectPath, relativePath);
        return fs.readFile(fullPath, 'utf-8');
    }

    async getFileChunks(relativePath: string, index: RAGIndexData): Promise<Chunk[]> {
        return index.chunks.filter((c) => c.filePath === relativePath);
    }
}