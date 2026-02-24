import { FileBlock } from '../types/index.js';
import { createHash } from 'crypto';

/**
 * File Cache Service
 * Handles file caching for quick access during sessions
 * ВИПРАВЛЕНО: Додано валідацію шляхів для захисту від path traversal
 */

export interface CachedFile {
  path: string;
  content: string;
  hash: string;
  cachedAt: Date;
  projectId: string;
}

// Allowed directories for file storage (prevent path traversal)
const ALLOWED_DIRS = ['app', 'resources', 'config', 'routes', 'database', 'tests'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file path to prevent path traversal attacks
 */
export function validateFilePath(filePath: string): boolean {
  // Normalize path and check for traversal attempts
  const normalized = filePath.replace(/\\/g, '/');
  
  // Check for path traversal patterns
  if (normalized.includes('..') || normalized.startsWith('/')) {
    return false;
  }
  
  // Check if path is in allowed directories
  const firstDir = normalized.split('/')[0];
  if (!ALLOWED_DIRS.includes(firstDir) && !firstDir.startsWith('.')) {
    // Allow hidden files and directories starting with .
    if (!firstDir.startsWith('.')) {
      return false;
    }
  }
  
  return true;
}

/**
 * Generate content hash
 */
export function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Validate file content size
 */
export function validateFileSize(content: string): boolean {
  return Buffer.byteLength(content, 'utf8') <= MAX_FILE_SIZE;
}

// In-memory cache store (for production use Redis)
const memoryCache = new Map<string, CachedFile>();

/**
 * Cache file content
 * ВИПРАВЛЕНО: Додано валідацію шляхів та розміру
 */
export async function cacheFile(
  projectId: string,
  path: string,
  content: string
): Promise<CachedFile> {
  // Валідація шляху (path traversal protection)
  if (!validateFilePath(path)) {
    throw new Error('FILE_001: Invalid file path - path traversal detected');
  }
  
  // Валідація розміру файлу
  if (!validateFileSize(content)) {
    throw new Error('FILE_002: File too large - exceeds maximum size');
  }
  
  const hash = generateContentHash(content);
  const cacheKey = `${projectId}:${path}`;
  
  const cachedFile: CachedFile = {
    path,
    content,
    hash,
    cachedAt: new Date(),
    projectId,
  };
  
  // Store in memory cache (в production використовувати Redis)
  memoryCache.set(cacheKey, cachedFile);
  
  return cachedFile;
}

/**
 * Get cached file
 * ВИПРАВЛЕНО: Реалізовано отримання файлу з кешу
 */
export async function getCachedFile(
  projectId: string,
  path: string
): Promise<CachedFile | null> {
  // Валідація шляху
  if (!validateFilePath(path)) {
    return null;
  }
  
  const cacheKey = `${projectId}:${path}`;
  return memoryCache.get(cacheKey) ?? null;
}

/**
 * Get multiple cached files
 */
export async function getCachedFiles(
  projectId: string,
  paths: string[]
): Promise<Map<string, CachedFile>> {
  const result = new Map<string, CachedFile>();

  for (const path of paths) {
    if (!validateFilePath(path)) {
      continue;
    }

    const cacheKey = `${projectId}:${path}`;
    const cached = memoryCache.get(cacheKey);

    if (cached) {
      result.set(path, cached);
    }
  }

  return result;
}

/**
 * Invalidate file cache
 */
export async function invalidateFile(
  projectId: string,
  path: string
): Promise<void> {
  if (!validateFilePath(path)) {
    return;
  }

  const cacheKey = `${projectId}:${path}`;
  memoryCache.delete(cacheKey);
}

/**
 * Invalidate all project files
 */
export async function invalidateProjectCache(projectId: string): Promise<void> {
  const prefix = `${projectId}:`;

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

/**
 * Check if file is cached
 * ВИПРАВЛЕНО: Реалізовано перевірку кешу
 */
export async function isFileCached(
  projectId: string,
  path: string
): Promise<boolean> {
  // Валідація шляху
  if (!validateFilePath(path)) {
    return false;
  }
  
  const cacheKey = `${projectId}:${path}`;
  return memoryCache.has(cacheKey);
}

/**
 * Get cache statistics
 */
export async function getCacheStats(projectId: string): Promise<{
  totalFiles: number;
  totalSize: number;
  oldestCache: Date | null;
  newestCache: Date | null;
}> {
  const prefix = `${projectId}:`;

  let totalFiles = 0;
  let totalSize = 0;
  let oldestCache: Date | null = null;
  let newestCache: Date | null = null;

  for (const [key, cached] of memoryCache.entries()) {
    if (!key.startsWith(prefix)) {
      continue;
    }

    totalFiles += 1;
    totalSize += Buffer.byteLength(cached.content, 'utf8');

    if (!oldestCache || cached.cachedAt < oldestCache) {
      oldestCache = cached.cachedAt;
    }

    if (!newestCache || cached.cachedAt > newestCache) {
      newestCache = cached.cachedAt;
    }
  }

  return {
    totalFiles,
    totalSize,
    oldestCache,
    newestCache,
  };
}

/**
 * Convert FileBlock to CachedFile
 */
export function fileBlockToCached(
  projectId: string,
  block: FileBlock
): CachedFile {
  const { path, content } = block;

  const hash = generateContentHash(content);

  return {
    path,
    content,
    hash,
    cachedAt: new Date(),
    projectId,
  };
}
