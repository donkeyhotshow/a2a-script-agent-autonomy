import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';
import { getCodeEmbedding, getTextEmbedding, chunkCode, chunkText } from './embedding.service.js';
import {
  upsertFile,
  createEmbeddingsBatch,
  deleteEmbeddingsByFile,
  findFileByPath,
  deleteProjectFiles,
  countFilesByProject,
} from '../repositories/file.repository.js';
import { ChunkType } from '@prisma/client';

/**
 * Indexer Service
 * Handles project indexing and embedding storage
 */

export interface IndexingProgress {
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

export interface FileToIndex {
  path: string;
  content: string;
  language?: string;
}

const indexingStatus = new Map<string, IndexingProgress>();

/**
 * Index project files
 */
export async function indexProject(
  projectId: string,
  files: FileToIndex[],
  onProgress?: (progress: IndexingProgress) => void
): Promise<void> {
  const progress: IndexingProgress = {
    totalFiles: files.length,
    processedFiles: 0,
    status: files.length === 0 ? 'completed' : 'in_progress',
  };

  indexingStatus.set(projectId, progress);
  if (onProgress) onProgress({ ...progress });

  for (const file of files) {
    progress.currentFile = file.path;
    indexingStatus.set(projectId, { ...progress });
    if (onProgress) onProgress({ ...progress });

    try {
      if (!shouldIndexFile(file.path)) {
        progress.processedFiles += 1;
        continue;
      }

      await indexFile(projectId, file);
      progress.processedFiles += 1;
    } catch (error) {
      logger.error('Failed to index file', {
        projectId,
        path: file.path,
        error,
      });
      progress.status = 'failed';
      progress.error = `Failed to index file: ${file.path}`;
      indexingStatus.set(projectId, { ...progress });
      if (onProgress) onProgress({ ...progress });
      throw error;
    }
  }

  delete progress.currentFile;
  if (progress.status !== 'failed') {
    progress.status = 'completed';
  }
  indexingStatus.set(projectId, { ...progress });
  if (onProgress) onProgress({ ...progress });
}

/**
 * Index single file
 */
export async function indexFile(
  projectId: string,
  file: FileToIndex
): Promise<void> {
  const language = file.language ?? detectLanguage(file.path, file.content);
  const lines = file.content.split(/\r?\n/);
  const hash = calculateFileHash(file.content);

  const fileRecord = await upsertFile({
    projectId,
    path: file.path,
    language,
    linesCount: lines.length,
    hash,
    lastModified: new Date(),
  });

  // Очистить старые эмбеддинги для файла и записать новые
  await deleteEmbeddingsByFile(fileRecord.id);
  await processChunks(fileRecord.id, file.content, language);
}

/**
 * Remove file from index
 */
export async function removeFileFromIndex(
  projectId: string,
  filePath: string
): Promise<void> {
  const file = await findFileByPath(projectId, filePath);
  if (!file) {
    return;
  }

  await deleteEmbeddingsByFile(file.id);
  // Также удаляем сам файл из репозитория
  await deleteProjectFiles(projectId);
}

/**
 * Reindex project
 */
export async function reindexProject(projectId: string): Promise<void> {
  // В in-memory реализации полная переиндексация означает очистку всех файлов и эмбеддингов проекта.
  // Фактическое повторное чтение файлов должно выполняться вызывающей стороной через indexProject.

  await deleteProjectFiles(projectId);

  const progress: IndexingProgress = {
    totalFiles: 0,
    processedFiles: 0,
    status: 'pending',
  };

  indexingStatus.set(projectId, progress);
}

/**
 * Get indexing status
 */
export async function getIndexingStatus(projectId: string): Promise<IndexingProgress> {
  const status = indexingStatus.get(projectId);
  if (status) {
    return status;
  }

  const totalFiles = await countFilesByProject(projectId);

  return {
    totalFiles,
    processedFiles: 0,
    status: 'pending',
  };
}

/**
 * Detect file language
 */
export function detectLanguage(filePath: string, content: string): string {
  const lowerPath = filePath.toLowerCase();
  const lowerContent = content.toLowerCase();

  if (lowerPath.endsWith('.ts') || lowerPath.endsWith('.tsx')) {
    return 'typescript';
  }
  if (lowerPath.endsWith('.js') || lowerPath.endsWith('.jsx')) {
    return 'javascript';
  }
  if (lowerPath.endsWith('.php')) {
    return 'php';
  }
  if (lowerPath.endsWith('.py')) {
    return 'python';
  }
  if (lowerPath.endsWith('.vue')) {
    return 'vue';
  }
  if (lowerPath.endsWith('.md')) {
    return 'markdown';
  }
  if (lowerPath.endsWith('.json')) {
    return 'json';
  }

  // Простая эвристика по содержимому
  if (lowerContent.includes('<?php')) {
    return 'php';
  }
  if (lowerContent.includes('def ') && lowerContent.includes('import ')) {
    return 'python';
  }

  return 'text';
}

/**
 * Should file be indexed
 */
export function shouldIndexFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();

  // Исключаем типичные служебные директории
  const excludedSegments = [
    '/node_modules/',
    '/vendor/',
    '/.git/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/storage/',
  ];

  if (excludedSegments.some((segment) => normalized.includes(segment))) {
    return false;
  }

  // Фильтрация по расширениям
  const allowedExts = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.php',
    '.py',
    '.vue',
    '.md',
    '.json',
  ];

  return allowedExts.some((ext) => normalized.endsWith(ext));
}

/**
 * Calculate file hash
 */
export function calculateFileHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Process file chunks
 */
async function processChunks(
  fileId: string,
  content: string,
  language: string
): Promise<void> {
  const isCodeLanguage = ['typescript', 'javascript', 'php', 'python', 'vue'].includes(
    language.toLowerCase()
  );

  if (isCodeLanguage) {
    const codeChunks = chunkCode(content, language, 200);

    const batch = await Promise.all(
      codeChunks.map(async (chunk) => {
        const embedding = await getCodeEmbedding(chunk.text, language);
        return {
          fileId,
          chunkType: ChunkType.BLOCK,
          lineStart: chunk.startLine,
          lineEnd: chunk.endLine,
          content: chunk.text,
          embedding,
          metadata: {
            language,
            kind: 'code',
          } as Record<string, unknown>,
        };
      })
    );

    if (batch.length > 0) {
      await createEmbeddingsBatch(batch);
    }

    return;
  }

  const textChunks = chunkText(content, 512, 64);

  const batch = await Promise.all(
    textChunks.map(async (chunk) => {
      const { startLine, endLine } = getLineRangeFromOffsets(content, chunk.start, chunk.end);
      const embedding = await getTextEmbedding(chunk.text);

      return {
        fileId,
        chunkType: ChunkType.SECTION,
        lineStart: startLine,
        lineEnd: endLine,
        content: chunk.text,
        embedding,
        metadata: {
          language,
          kind: 'text',
        } as Record<string, unknown>,
      };
    })
  );

  if (batch.length > 0) {
    await createEmbeddingsBatch(batch);
  }
}

function getLineRangeFromOffsets(
  content: string,
  start: number,
  end: number
): { startLine: number; endLine: number } {
  const before = content.slice(0, start);
  const segment = content.slice(start, end);

  const startLine = before.split(/\r?\n/).length;
  const endLine = startLine + segment.split(/\r?\n/).length - 1;

  return { startLine, endLine };
}
