/**
 * Chunk Pipeline - Обработка чанков
 * Отвечает за фильтрацию, скоринг и обработку отдельных чанков
 */

import path from 'path';
import type { Chunk } from '../chunk-manager.js';
import type { RAGIndexData } from '../indexer.js';
import type { SearchOptions, SearchFilters, ExtractedKeywords } from './types.js';

export { ExtractedKeywords };

// Very common programming words that should be heavily penalized
const COMMON_WORDS = new Set([
    'import', 'export', 'default', 'const', 'let', 'var',
    'function', 'return', 'if', 'else', 'for', 'while',
    'new', 'this', 'super', 'extends',
    'public', 'private', 'protected', 'static',
    'async', 'await', 'require', 'module',
    'true', 'false', 'null', 'undefined',
    'console', 'log', 'error', 'warn', 'info',
    'style', 'css', 'html', 'div', 'span', 'button'
]);

/**
 * Получение ID чанка
 */
export function getChunkId(chunk: Chunk): string {
    return chunk.id ?? `${chunk.filePath}:${chunk.startLine}`;
}

/**
 * Проверка вхождения чанка в список кандидатов
 */
export function isCandidateChunk(
    chunk: Chunk,
    candidateIds: Set<string> | null
): boolean {
    if (!candidateIds) return true;
    const chunkId = getChunkId(chunk);
    return candidateIds.has(chunkId);
}

/**
 * Проверка чанка на соответствие фильтрам
 */
export function matchesFilters(
    chunk: Chunk,
    index: RAGIndexData,
    filters: SearchFilters | undefined
): boolean {
    if (!filters) return true;
    
    // Get file info for this chunk
    const fileInfo = index.files.find(f => f.path === chunk.filePath);
    if (!fileInfo) return true; // If file not found, allow through
    
    // Extension filter
    if (filters.extensions && filters.extensions.length > 0) {
        const ext = fileInfo.ext.toLowerCase();
        const normalizedExts = filters.extensions.map(e => e.toLowerCase());
        if (!normalizedExts.includes(ext) && !normalizedExts.includes(ext.replace('.', ''))) {
            return false;
        }
    }
    
    // Folder filter
    if (filters.folders && filters.folders.length > 0) {
        const inFolder = filters.folders.some(folder => 
            chunk.filePath.startsWith(folder.replace(/^\//, ''))
        );
        if (!inFolder) return false;
    }
    
    // Date filters
    if (filters.modifiedAfter) {
        const afterDate = new Date(filters.modifiedAfter).getTime();
        const fileDate = new Date(fileInfo.modified).getTime();
        if (fileDate < afterDate) return false;
    }
    if (filters.modifiedBefore) {
        const beforeDate = new Date(filters.modifiedBefore).getTime();
        const fileDate = new Date(fileInfo.modified).getTime();
        if (fileDate > beforeDate) return false;
    }
    
    // Type filter
    if (filters.type && filters.type.length > 0) {
        if (!filters.type.includes(chunk.type)) return false;
    }
    
    // Size filters
    if (filters.minSize !== undefined && fileInfo.size < filters.minSize) return false;
    if (filters.maxSize !== undefined && fileInfo.size > filters.maxSize) return false;
    
    return true;
}

/**
 * Базовый скоринг чанка по ключевым словам
 */
export function scoreChunk(
    chunk: Chunk,
    keywords: ExtractedKeywords,
    _originalQuery: string
): number {
    let score = 0;
    const content = chunk.content.toLowerCase();
    
    // Word matching
    for (const word of keywords.words) {
        const matches = content.match(new RegExp(word, 'gi'));
        if (matches) {
            // Apply small penalty for very common words
            let wordWeight = 1;
            if (COMMON_WORDS.has(word)) {
                wordWeight = 0.5;
            }
            score += matches.length * 2 * wordWeight;
        }
    }
    
    // Technical terms
    for (const term of keywords.techTerms) {
        if (content.includes(term.toLowerCase())) score += 10;
    }
    
    // Method names
    for (const method of keywords.methodNames) {
        if (content.includes(method)) score += 15;
    }
    
    // Type-based boost
    if (chunk.type === 'class' || chunk.type === 'method') score *= 1.3;
    if (chunk.type === 'function') score *= 1.2;
    
    // Name match boost
    if (chunk.name && keywords.techTerms.some((t) => chunk.name!.toLowerCase().includes(t.toLowerCase()))) {
        score += 25;
    }
    
    // Light length normalization only for very long documents
    const docLength = chunk.content.split(/\s+/).length;
    if (docLength > 500) {
        score = score * (500 / docLength);
    }
    
    // Hierarchy boost: files closer to root are more important
    const depth = (chunk.filePath.match(/\//g) || []).length;
    const hierarchyBoost = Math.max(0.5, 1.0 - (depth * 0.1));
    score *= hierarchyBoost;
    
    return score;
}

/**
 * Создание ID кандидатов из BM25 результатов
 */
export function createCandidateSet(bm25Results: Map<string, number>): Set<string> {
    return new Set(bm25Results.keys());
}

/**
 * Поиск хайлайтов в контенте
 */
export function findHighlights(content: string, keywords: ExtractedKeywords): string[] {
    const allTerms = [...keywords.words, ...keywords.techTerms, ...keywords.methodNames];
    const highlights: string[] = [];
    
    for (const term of allTerms) {
        const regex = new RegExp(`.{0,50}${term}.{0,50}`, 'gi');
        const matches = content.match(regex);
        if (matches) highlights.push(...matches.slice(0, 2));
    }
    
    return [...new Set(highlights)].slice(0, 5);
}

/**
 * Получение расширения файла из пути
 */
export function getFileExtension(filePath: string): string | null {
    const ext = path.extname(filePath).toLowerCase();
    if (ext) {
        // Remove leading dot and return
        return ext.slice(1);
    }
    return null;
}

/**
 * Паттерн для поиска файлов
 */
export function matchPattern(filePath: string, pattern: string): boolean {
    const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '{{GLOBSTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/{{GLOBSTAR}}/g, '.*');
    return new RegExp(regexPattern).test(filePath);
}