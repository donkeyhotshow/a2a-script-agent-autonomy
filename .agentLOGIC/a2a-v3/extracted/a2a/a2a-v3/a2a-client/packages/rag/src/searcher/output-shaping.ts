/**
 * Output Shaping - Форматирование вывода
 * Отвечает за преобразование результатов в протокольный формат, пагинацию, сниппеты
 */

import { toRagSearchResult } from '../protocol-rag-search.js';
import type { SearchResult } from './types.js';
import type { RagSearchProtocolResult } from '../protocol-rag-search.js';

/**
 * Опции для форматирования вывода
 */
export interface OutputOptions {
    maxFiles?: number;
    allowedDirs?: string[];
    allowedExtensions?: string[];
    maxResults?: number;
    page?: number;
    pageSize?: number;
}

/**
 * Преобразование сырых результатов поиска в протокольный формат
 */
export function shapeOutput(
    rawResults: SearchResult[],
    options: OutputOptions & { query: string }
): RagSearchProtocolResult {
    // Transform raw search results to protocol format
    const formattedResults = rawResults.map(result => ({
        chunk: {
            filePath: result.chunk.filePath,
            content: result.chunk.content,
            startLine: result.chunk.startLine,
            endLine: result.chunk.endLine
        },
        score: result.score,
        highlights: result.highlights
    }));

    return toRagSearchResult(formattedResults, {
        query: options.query,
        maxFiles: options.maxFiles,
        allowedDirs: options.allowedDirs,
        allowedExtensions: options.allowedExtensions,
        maxResults: options.maxResults,
        page: options.page,
        pageSize: options.pageSize
    });
}

/**
 * Применение пагинации к результатам
 */
export function paginateResults(
    results: SearchResult[],
    page: number = 1,
    pageSize: number = 10
): {
    results: SearchResult[];
    totalPages: number;
    currentPage: number;
    totalResults: number;
} {
    const totalResults = results.length;
    const totalPages = Math.ceil(totalResults / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
        results: results.slice(startIndex, endIndex),
        totalPages,
        currentPage: page,
        totalResults
    };
}

/**
 * Фильтрация результатов по директориям
 */
export function filterByDirectories(
    results: SearchResult[],
    allowedDirs: string[]
): SearchResult[] {
    if (!allowedDirs || allowedDirs.length === 0) {
        return results;
    }
    
    return results.filter(result => {
        const filePath = result.chunk.filePath;
        return allowedDirs.some(dir => filePath.startsWith(dir.replace(/^\//, '')));
    });
}

/**
 * Фильтрация результатов по расширениям файлов
 */
export function filterByExtensions(
    results: SearchResult[],
    allowedExtensions: string[]
): SearchResult[] {
    if (!allowedExtensions || allowedExtensions.length === 0) {
        return results;
    }
    
    const normalizedExts = allowedExtensions.map(e => 
        e.startsWith('.') ? e.substring(1).toLowerCase() : e.toLowerCase()
    );
    
    return results.filter(result => {
        const ext = result.chunk.filePath.split('.').pop()?.toLowerCase();
        return ext ? normalizedExts.includes(ext) : false;
    });
}

/**
 * Ограничение количества файлов (один результат на файл)
 */
export function limitFiles(
    results: SearchResult[],
    maxFiles: number
): SearchResult[] {
    if (!maxFiles || maxFiles <= 0) {
        return results;
    }
    
    const fileSeen = new Set<string>();
    const limited: SearchResult[] = [];
    
    for (const result of results) {
        const filePath = result.chunk.filePath;
        if (!fileSeen.has(filePath)) {
            fileSeen.add(filePath);
            limited.push(result);
            if (limited.length >= maxFiles) break;
        }
    }
    
    return limited;
}

/**
 * Создание сниппетов из результатов
 */
export function createSnippets(
    results: SearchResult[],
    maxLength: number = 200,
    contextLines: number = 2
): Array<{
    filePath: string;
    snippet: string;
    startLine: number;
    endLine?: number;
}> {
    return results.map(result => {
        const content = result.chunk.content;
        const lines = content.split('\n');
        
        // Get a slice of lines centered around the chunk
        const startLine = result.chunk.startLine;
        let snippet: string;
        
        if (lines.length <= maxLength / 40) {
            // Small chunk - use as is
            snippet = content;
        } else {
            // Large chunk - create focused snippet
            const center = Math.floor(lines.length / 2);
            const halfContext = Math.floor(contextLines / 2);
            const start = Math.max(0, center - halfContext);
            const end = Math.min(lines.length, center + halfContext + 1);
            snippet = lines.slice(start, end).join('\n');
        }
        
        // Truncate if too long
        if (snippet.length > maxLength) {
            snippet = snippet.substring(0, maxLength - 3) + '...';
        }
        
        return {
            filePath: result.chunk.filePath,
            snippet,
            startLine,
            endLine: result.chunk.endLine
        };
    });
}

/**
 * Форматирование результатов для отображения
 */
export function formatForDisplay(
    results: SearchResult[],
    options: {
        showScores?: boolean;
        showHighlights?: boolean;
        maxHighlightLength?: number;
    } = {}
): Array<{
    filePath: string;
    preview: string;
    score?: number;
    highlights?: string[];
}> {
    const { showScores = true, showHighlights = true, maxHighlightLength = 100 } = options;
    
    return results.map(result => {
        const preview = result.chunk.content.substring(0, 200).replace(/\n/g, ' ');
        
        const formatted: any = {
            filePath: result.chunk.filePath,
            preview: preview + (result.chunk.content.length > 200 ? '...' : '')
        };
        
        if (showScores) {
            formatted.score = Math.round(result.score * 100) / 100;
        }
        
        if (showHighlights && result.highlights?.length) {
            formatted.highlights = result.highlights
                .slice(0, 3)
                .map((h: string) => h.length > maxHighlightLength 
                    ? h.substring(0, maxHighlightLength - 3) + '...' 
                    : h);
        }
        
        return formatted;
    });
}

/**
 * Упрощённая обёртка для searchWithProtocol совместимости
 */
export function transformToProtocol(
    searchResults: SearchResult[],
    query: string,
    options: OutputOptions
): RagSearchProtocolResult {
    return shapeOutput(searchResults, { query, ...options });
}