/**
 * Query Planner - Планирование запросов
 * Отвечает за анализ запроса, извлечение ключевых слов, планирование стратегии поиска
 */

import {QueryUnderstandingEngine, INTENT_TYPES} from '../query-understanding.js';
import type {SearchOptions} from './types.js';
import type { ExtractedKeywords } from './types.js';

export { INTENT_TYPES };
export type { ExtractedKeywords };

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
    'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    // Russian stop words
    'добавь', 'создай', 'удали', 'измени', 'покажи', 'найди',
]);

/**
 * Извлечение ключевых слов из запроса
 */
export function extractKeywords(query: string): ExtractedKeywords {
    const words = query
        .toLowerCase()
        .replace(/[^\w\sа-яё]/gi, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    
    // Technical terms (camelCase)
    const techTerms = query.match(/[A-Z][a-z]+[A-Z][a-z]+/g) ?? [];
    // Class names
    const classNames = query.match(/\b[A-Z][a-zA-Z]+\b/g) ?? [];
    // Method names
    const methodNames = (query.match(/\b[a-z][a-zA-Z]+\(\)/g) ?? []).map((m) => m.replace('()', ''));
    
    return {
        words,
        techTerms: [...techTerms, ...classNames],
        methodNames
    };
}

/**
 * Анализ запроса - определяет тип и сущности
 */
export function analyzeQueryIntent(
    query: string,
    queryUnderstanding: QueryUnderstandingEngine
): ReturnType<QueryUnderstandingEngine['analyze']> {
    return queryUnderstanding.analyze(query);
}

/**
 * Определение расширенных опций поиска на основе анализа запроса
 */
export function planSearchStrategy(
    query: string,
    baseOptions: SearchOptions,
    intent: ReturnType<QueryUnderstandingEngine['analyze']>
): SearchOptions {
    const options = { ...baseOptions };
    
    // Auto-enable BM25 for non-semantic searches
    if (intent.type !== INTENT_TYPES.SEMANTIC) {
        if (options.useBM25 === undefined) {
            options.useBM25 = true;
        }
    }
    
    // Enable code similarity for symbol/exact name searches
    if (intent.type === INTENT_TYPES.SYMBOL || intent.type === INTENT_TYPES.EXACT_NAME) {
        if (options.useCodeSimilarity === undefined) {
            options.useCodeSimilarity = true;
        }
    }
    
    // Apply file type filters from intent
    if (intent.entities.fileTypes && intent.entities.fileTypes.length > 0) {
        const currentFilters = options.filters || {};
        const exts = intent.entities.fileTypes.map(f => f.startsWith('.') ? f : `.${f}`);
        
        options.filters = {
            ...currentFilters,
            extensions: (currentFilters.extensions || []).concat(exts)
        };
    }
    
    return options;
}

/**
 * Получение предпочтительных типов файлов из запроса
 */
export function getPreferredFileTypes(
    intent: ReturnType<QueryUnderstandingEngine['analyze']>
): string[] {
    return intent.entities.fileTypes || [];
}

/**
 * Вычисление boost для типа файла на основе анализа запроса
 */
export function calculateFileTypeBoost(
    filePath: string,
    intent: ReturnType<QueryUnderstandingEngine['analyze']>
): number {
    const preferredFileTypes = getPreferredFileTypes(intent);
    
    if (preferredFileTypes.length === 0) {
        return 1.0;
    }
    
    // Get file extension
    const lastDot = filePath.lastIndexOf('.');
    const ext = lastDot > 0 ? filePath.substring(lastDot + 1).toLowerCase() : null;
    
    // Check if this chunk's file type is preferred
    if (ext && preferredFileTypes.includes(ext)) {
        // Exact match - boost significantly
        return 1.5;
    } else if (ext && !preferredFileTypes.includes(ext)) {
        // Not in preferred list - slight penalty
        return 0.7;
    } else {
        // No extension detected - neutral
        return 0.8;
    }
}