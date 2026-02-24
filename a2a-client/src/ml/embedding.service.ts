import { createHash } from 'crypto';
import { getEmbedding, getEmbeddings } from './plexe.client.js';
import { logger } from '../utils/logger.js';

/**
 * Embedding Service
 * Handles text embedding generation and caching
 */

export interface EmbeddingOptions {
  model?: string;
  useCache?: boolean;
  cacheTtl?: number;
}

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface EmbeddingCacheEntry {
  embedding: number[];
  model: string;
  expiresAt: number | null;
}

const embeddingCache = new Map<string, EmbeddingCacheEntry>();

function isCacheEntryValid(entry: EmbeddingCacheEntry | undefined): entry is EmbeddingCacheEntry {
  if (!entry) return false;
  if (entry.expiresAt === null) return true;
  return entry.expiresAt > Date.now();
}

function storeInCache(key: string, model: string, embedding: number[], ttlMs: number | undefined): void {
  const expiresAt = ttlMs && ttlMs > 0 ? Date.now() + ttlMs : null;
  embeddingCache.set(key, { embedding, model, expiresAt });
}

/**
 * Get embedding for text with caching
 */
export async function getTextEmbedding(
  text: string,
  options?: EmbeddingOptions
): Promise<number[]> {
  const model = options?.model ?? DEFAULT_MODEL;
  const useCache = options?.useCache ?? true;
  const cacheTtl = options?.cacheTtl ?? DEFAULT_CACHE_TTL;

  const key = getCacheKey(text, model);

  if (useCache) {
    const cached = embeddingCache.get(key);
    if (isCacheEntryValid(cached)) {
      return cached.embedding;
    }
  }

  try {
    const embedding = await getEmbedding(text, model);

    if (useCache) {
      storeInCache(key, model, embedding, cacheTtl);
    }

    return embedding;
  } catch (error) {
    logger.error('Failed to get text embedding from Plexe client, using fallback embedding.', {
      error,
    });

    const fallback = createFallbackEmbedding(text);

    if (useCache) {
      storeInCache(key, model, fallback, cacheTtl);
    }

    return fallback;
  }
}

/**
 * Get embeddings for multiple texts
 */
export async function getBatchEmbeddings(
  texts: string[],
  options?: EmbeddingOptions
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const model = options?.model ?? DEFAULT_MODEL;
  const useCache = options?.useCache ?? true;
  const cacheTtl = options?.cacheTtl ?? DEFAULT_CACHE_TTL;

  const results: number[][] = new Array(texts.length);
  const missingIndices: number[] = [];
  const missingTexts: string[] = [];

  // First pass: take from cache when возможно
  texts.forEach((text, index) => {
    const key = getCacheKey(text, model);

    if (useCache) {
      const cached = embeddingCache.get(key);
      if (isCacheEntryValid(cached)) {
        results[index] = cached.embedding;
        return;
      }
    }

    missingIndices.push(index);
    missingTexts.push(text);
  });

  if (missingTexts.length === 0) {
    return results;
  }

  try {
    const freshEmbeddings = await getEmbeddings(missingTexts, model);

    missingIndices.forEach((originalIndex, offset) => {
      const embedding = freshEmbeddings[offset] ?? createFallbackEmbedding(missingTexts[offset]);
      results[originalIndex] = embedding;

      if (useCache) {
        const key = getCacheKey(missingTexts[offset], model);
        storeInCache(key, model, embedding, cacheTtl);
      }
    });
  } catch (error) {
    logger.error('Failed to get batch embeddings from Plexe client, using fallback embeddings.', {
      error,
    });

    missingIndices.forEach((originalIndex, offset) => {
      const text = missingTexts[offset];
      const embedding = createFallbackEmbedding(text);
      results[originalIndex] = embedding;

      if (useCache) {
        const key = getCacheKey(text, model);
        storeInCache(key, model, embedding, cacheTtl);
      }
    });
  }

  return results;
}

/**
 * Get embedding for code
 */
export async function getCodeEmbedding(
  code: string,
  language?: string
): Promise<number[]> {
  const languagePrefix = language ? `language:${language}\n` : '';
  const text = `${languagePrefix}${code}`;

  return getTextEmbedding(text);
}

/**
 * Get embedding for file content
 */
export async function getFileEmbedding(
  content: string,
  filePath: string
): Promise<number[]> {
  const normalizedPath = filePath.toLowerCase();

  let language = 'text';
  if (normalizedPath.endsWith('.ts') || normalizedPath.endsWith('.tsx')) {
    language = 'typescript';
  } else if (normalizedPath.endsWith('.js') || normalizedPath.endsWith('.jsx')) {
    language = 'javascript';
  } else if (normalizedPath.endsWith('.php')) {
    language = 'php';
  } else if (normalizedPath.endsWith('.py')) {
    language = 'python';
  } else if (normalizedPath.endsWith('.vue')) {
    language = 'vue';
  } else if (normalizedPath.endsWith('.md')) {
    language = 'markdown';
  } else if (normalizedPath.endsWith('.json')) {
    language = 'json';
  }

  const text = `path:${filePath}\nlanguage:${language}\n\n${content}`;

  return getTextEmbedding(text);
}

/**
 * Chunk text for embedding
 */
export function chunkText(
  text: string,
  maxTokens: number = 512,
  overlap: number = 50
): Array<{ text: string; start: number; end: number }> {
  if (!text) {
    return [];
  }

  // В этой реализации maxTokens и overlap интерпретируем как количество символов.
  const chunks: Array<{ text: string; start: number; end: number }> = [];

  const length = text.length;
  const safeMaxTokens = Math.max(1, maxTokens);
  const safeOverlap = Math.min(Math.max(0, overlap), safeMaxTokens - 1);
  const step = safeMaxTokens - safeOverlap;

  let start = 0;

  while (start < length) {
    const end = Math.min(length, start + safeMaxTokens);
    const chunkTextValue = text.slice(start, end);

    chunks.push({
      text: chunkTextValue,
      start,
      end,
    });

    if (end >= length) {
      break;
    }

    start += step;
  }

  return chunks;
}

/**
 * Chunk code for embedding
 */
export function chunkCode(
  code: string,
  language: string,
  maxTokens: number = 512
): Array<{
  text: string;
  startLine: number;
  endLine: number;
  type: 'function' | 'class' | 'method' | 'block';
}> {
  // На данном этапе реализуем простой нарезчик по строкам.
  // maxTokens интерпретируется как максимальное количество строк в чанке.
  const lines = code.split(/\r?\n/);
  const maxLinesPerChunk = Math.max(1, maxTokens);

  const chunks: Array<{
    text: string;
    startLine: number;
    endLine: number;
    type: 'function' | 'class' | 'method' | 'block';
  }> = [];

  for (let i = 0; i < lines.length; i += maxLinesPerChunk) {
    const startLine = i + 1;
    const endLine = Math.min(lines.length, i + maxLinesPerChunk);
    const textChunk = lines.slice(i, endLine).join('\n');

    chunks.push({
      text: textChunk,
      startLine,
      endLine,
      // Пока не разбираем структуру кода, поэтому используем обобщённый тип.
      type: 'block',
    });
  }

  return chunks;
}

/**
 * Calculate cosine similarity
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find most similar embeddings
 */
export function findMostSimilar(
  query: number[],
  embeddings: Array<{ id: string; embedding: number[] }>,
  topK: number = 10
): Array<{ id: string; score: number }> {
  if (embeddings.length === 0) {
    return [];
  }

  const scored = embeddings.map(({ id, embedding }) => ({
    id,
    score: cosineSimilarity(query, embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  if (topK <= 0 || topK >= scored.length) {
    return scored;
  }

  return scored.slice(0, topK);
}

/**
 * Clear embedding cache
 */
export async function clearEmbeddingCache(pattern?: string): Promise<void> {
  if (!pattern) {
    embeddingCache.clear();
    return;
  }

  for (const key of embeddingCache.keys()) {
    if (key.includes(pattern)) {
      embeddingCache.delete(key);
    }
  }
}

/**
 * Get embedding cache key
 */
function getCacheKey(text: string, model: string): string {
  const normalized = text.normalize('NFKC');
  const hash = createHash('sha256').update(normalized).digest('hex').substring(0, 32);
  return `${model}:${hash}`;
}

function createFallbackEmbedding(text: string, dimensions: number = 64): number[] {
  const hashBuffer = createHash('sha256').update(text).digest();
  const result: number[] = new Array(dimensions);

  for (let i = 0; i < dimensions; i++) {
    const byte = hashBuffer[i % hashBuffer.length];
    // Нормализуем байт в диапазон [-1, 1]
    result[i] = (byte / 127.5) - 1;
  }

  return result;
}
