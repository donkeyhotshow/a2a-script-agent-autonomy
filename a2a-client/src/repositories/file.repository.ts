import { File, Embedding, ChunkType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface InMemoryFile extends File {}
interface InMemoryEmbedding extends Embedding {}

const filesById = new Map<string, InMemoryFile>();
const filesByProjectAndPath = new Map<string, string>(); // key: `${projectId}:${path}`

const embeddingsById = new Map<string, InMemoryEmbedding>();
const embeddingsByFileId = new Map<string, Set<string>>(); // fileId -> embeddingIds
const embeddingVectors = new Map<string, number[]>(); // embeddingId -> vector

function makeFileKey(projectId: string, path: string): string {
  return `${projectId}:${path}`;
}

function ensureEmbeddingSet(fileId: string): Set<string> {
  let set = embeddingsByFileId.get(fileId);
  if (!set) {
    set = new Set<string>();
    embeddingsByFileId.set(fileId, set);
  }
  return set;
}

function cosineSimilarity(a: number[], b: number[]): number {
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
 * File Repository
 * Data access layer for File and Embedding entities
 */

/**
 * Create or update file
 */
export async function upsertFile(data: {
  projectId: string;
  path: string;
  language?: string;
  linesCount: number;
  hash: string;
  lastModified: Date;
}): Promise<File> {
  const key = makeFileKey(data.projectId, data.path);
  const existingId = filesByProjectAndPath.get(key);

  if (existingId) {
    const existing = filesById.get(existingId);

    if (existing) {
      const updated: InMemoryFile = {
        ...existing,
        language: data.language ?? existing.language ?? null,
        linesCount: data.linesCount,
        hash: data.hash,
        lastModified: data.lastModified,
        indexedAt: new Date(),
      };

      filesById.set(updated.id, updated);
      return updated;
    }
  }

  const id = uuidv4();

  const file: InMemoryFile = {
    id,
    projectId: data.projectId,
    path: data.path,
    language: data.language ?? null,
    linesCount: data.linesCount,
    hash: data.hash,
    lastModified: data.lastModified,
    indexedAt: new Date(),
  } as InMemoryFile;

  filesById.set(id, file);
  filesByProjectAndPath.set(key, id);

  return file;
}

/**
 * Find file by ID
 */
export async function findFileById(id: string): Promise<File | null> {
  return filesById.get(id) ?? null;
}

/**
 * Find file by project and path
 */
export async function findFileByPath(
  projectId: string,
  path: string
): Promise<File | null> {
  const key = makeFileKey(projectId, path);
  const id = filesByProjectAndPath.get(key);
  if (!id) {
    return null;
  }

  return filesById.get(id) ?? null;
}

/**
 * List files by project
 */
export async function listFilesByProject(
  projectId: string,
  options?: {
    extension?: string[];
    limit?: number;
    offset?: number;
  }
): Promise<File[]> {
  const result: InMemoryFile[] = [];

  for (const file of filesById.values()) {
    if (file.projectId !== projectId) continue;
    result.push(file);
  }

  let filtered = result;

  if (options?.extension && options.extension.length > 0) {
    const exts = options.extension.map((ext) => (ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`));
    filtered = filtered.filter((file) => {
      const lowerPath = file.path.toLowerCase();
      return exts.some((ext) => lowerPath.endsWith(ext));
    });
  }

  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? filtered.length;

  if (offset >= filtered.length) {
    return [];
  }

  return filtered.slice(offset, offset + limit);
}

/**
 * Delete file
 */
export async function deleteFile(id: string): Promise<void> {
  const file = filesById.get(id);
  if (!file) {
    return;
  }

  filesById.delete(id);

  const key = makeFileKey(file.projectId, file.path);
  filesByProjectAndPath.delete(key);

  // Delete all embeddings for this file
  await deleteEmbeddingsByFile(id);
}

/**
 * Delete all project files
 */
export async function deleteProjectFiles(projectId: string): Promise<void> {
  const idsToDelete: string[] = [];

  for (const file of filesById.values()) {
    if (file.projectId === projectId) {
      idsToDelete.push(file.id);
    }
  }

  for (const id of idsToDelete) {
    await deleteFile(id);
  }
}

/**
 * Count files by project
 */
export async function countFilesByProject(projectId: string): Promise<number> {
  let count = 0;
  for (const file of filesById.values()) {
    if (file.projectId === projectId) {
      count += 1;
    }
  }
  return count;
}

/**
 * Create embedding
 */
export async function createEmbedding(data: {
  fileId: string;
  chunkType: ChunkType;
  lineStart: number;
  lineEnd: number;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}): Promise<Embedding> {
  const id = uuidv4();

  const embedding: InMemoryEmbedding = {
    id,
    fileId: data.fileId,
    chunkType: data.chunkType,
    lineStart: data.lineStart,
    lineEnd: data.lineEnd,
    content: data.content,
    metadata: data.metadata ?? null,
    createdAt: new Date(),
  } as InMemoryEmbedding;

  embeddingsById.set(id, embedding);
  ensureEmbeddingSet(data.fileId).add(id);

  if (data.embedding) {
    embeddingVectors.set(id, data.embedding);
  }

  return embedding;
}

/**
 * Create embeddings batch
 */
export async function createEmbeddingsBatch(
  embeddings: Array<{
    fileId: string;
    chunkType: ChunkType;
    lineStart: number;
    lineEnd: number;
    content: string;
    embedding?: number[];
    metadata?: Record<string, unknown>;
  }>
): Promise<number> {
  let created = 0;

  for (const emb of embeddings) {
    await createEmbedding(emb);
    created += 1;
  }

  return created;
}

/**
 * Delete embeddings by file
 */
export async function deleteEmbeddingsByFile(fileId: string): Promise<void> {
  const set = embeddingsByFileId.get(fileId);
  if (!set) {
    return;
  }

  for (const id of set) {
    embeddingsById.delete(id);
    embeddingVectors.delete(id);
  }

  embeddingsByFileId.delete(fileId);
}

/**
 * Get embeddings by file
 */
export async function getEmbeddingsByFile(fileId: string): Promise<Embedding[]> {
  const set = embeddingsByFileId.get(fileId);
  if (!set) {
    return [];
  }

  const result: Embedding[] = [];

  for (const id of set) {
    const embedding = embeddingsById.get(id);
    if (embedding) {
      result.push(embedding);
    }
  }

  return result;
}

/**
 * Vector similarity search
 */
export async function vectorSearch(
  projectId: string,
  queryVector: number[],
  options?: {
    limit?: number;
    minScore?: number;
    chunkTypes?: ChunkType[];
  }
): Promise<Array<{
  embedding: Embedding;
  file: File;
  score: number;
}>> {
  const results: Array<{
    embedding: Embedding;
    file: File;
    score: number;
  }> = [];

  const limit = options?.limit ?? 10;
  const minScore = options?.minScore ?? 0;
  const allowedChunkTypes = options?.chunkTypes;

  for (const embedding of embeddingsById.values()) {
    const file = filesById.get(embedding.fileId);
    if (!file || file.projectId !== projectId) continue;

    if (allowedChunkTypes && !allowedChunkTypes.includes(embedding.chunkType)) {
      continue;
    }

    const vector = embeddingVectors.get(embedding.id);
    if (!vector) continue;

    const score = cosineSimilarity(queryVector, vector);
    if (score < minScore) continue;

    results.push({
      embedding,
      file,
      score,
    });
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length <= limit) {
    return results;
  }

  return results.slice(0, limit);
}

/**
 * Full-text search
 */
export async function fullTextSearch(
  projectId: string,
  query: string,
  options?: {
    limit?: number;
  }
): Promise<Array<{
  embedding: Embedding;
  file: File;
  rank: number;
}>> {
  const results: Array<{
    embedding: Embedding;
    file: File;
    rank: number;
  }> = [];

  const limit = options?.limit ?? 20;
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length === 0) {
    return [];
  }

  for (const embedding of embeddingsById.values()) {
    const file = filesById.get(embedding.fileId);
    if (!file || file.projectId !== projectId) continue;

    const content = embedding.content.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (content.includes(term)) {
        score += 1;
      }
    }

    if (score > 0) {
      results.push({
        embedding,
        file,
        rank: score,
      });
    }
  }

  results.sort((a, b) => b.rank - a.rank);

  if (results.length <= limit) {
    return results;
  }

  return results.slice(0, limit);
}
