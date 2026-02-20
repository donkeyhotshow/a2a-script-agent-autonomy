/**
 * File Block Handler
 * Handles file block parsing and generation according to A2A protocol
 * Production-ready: validation, chunking, diff operations
 */

import { FileBlock, FileBlockRequest } from '../types/index.js';

// ============================================
// Language Detection
// ============================================

const LANGUAGE_MAP: Record<string, string> = {
  '.php': 'php',
  '.vue': 'vue',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.json': 'json',
  '.md': 'markdown',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sql': 'sql',
  '.sh': 'bash',
  '.env': 'dotenv',
  '.txt': 'plaintext',
};

const EXTENSION_ORDER = ['.blade.php', '.d.ts']; // Multi-part extensions first

/**
 * Detect file language from path
 */
export function detectLanguage(path: string): string {
  const lowerPath = path.toLowerCase();
  
  // Check multi-part extensions first
  for (const ext of EXTENSION_ORDER) {
    if (lowerPath.endsWith(ext)) {
      return LANGUAGE_MAP[ext] ?? 'plaintext';
    }
  }
  
  // Get single extension
  const lastDot = lowerPath.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) {
    return 'plaintext';
  }
  
  const ext = lowerPath.substring(lastDot);
  return LANGUAGE_MAP[ext] ?? 'plaintext';
}

// ============================================
// Validation
// ============================================

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate file block structure
 */
export function validateFileBlock(block: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!isObject(block)) {
    return { valid: false, errors: ['File block must be an object'] };
  }

  const b = block as Record<string, unknown>;

  // Check path
  if (typeof b['path'] !== 'string' || b['path'].length === 0) {
    errors.push('path is required and must be a non-empty string');
  }

  // Check content
  if (typeof b['content'] !== 'string') {
    errors.push('content is required and must be a string');
  }

  // Check optional line numbers
  if (b['startLine'] !== undefined) {
    if (typeof b['startLine'] !== 'number' || b['startLine'] < 1) {
      errors.push('startLine must be a positive number');
    }
  }

  if (b['endLine'] !== undefined) {
    if (typeof b['endLine'] !== 'number' || b['endLine'] < 1) {
      errors.push('endLine must be a positive number');
    }
  }

  // Check line range consistency
  if (b['startLine'] !== undefined && b['endLine'] !== undefined) {
    const start = b['startLine'] as number;
    const end = b['endLine'] as number;
    if (start > end) {
      errors.push('startLine cannot be greater than endLine');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Parsing
// ============================================

/**
 * Parse file block from message
 */
export function parseFileBlock(data: unknown): FileBlock {
  const { valid, errors } = validateFileBlock(data);
  
  if (!valid) {
    throw new Error(`Invalid file block: ${errors.join(', ')}`);
  }

  const b = data as Record<string, unknown>;
  
  const result: FileBlock = {
    path: b['path'] as string,
    content: b['content'] as string,
  };

  if (b['startLine'] !== undefined) {
    result.startLine = b['startLine'] as number;
  }
  if (b['endLine'] !== undefined) {
    result.endLine = b['endLine'] as number;
  }

  return result;
}

/**
 * Parse multiple file blocks
 */
export function parseFileBlocks(data: unknown[]): FileBlock[] {
  return data.map((item, index) => {
    try {
      return parseFileBlock(item);
    } catch (error) {
      throw new Error(
        `Invalid file block at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });
}

/**
 * Parse file block safely (returns null on error)
 */
export function parseFileBlockSafe(data: unknown): FileBlock | null {
  try {
    return parseFileBlock(data);
  } catch {
    return null;
  }
}

// ============================================
// Creation
// ============================================

/**
 * Create file block from file content
 */
export function createFileBlock(
  path: string,
  content: string,
  options?: {
    startLine?: number;
    endLine?: number;
  }
): FileBlock {
  const result: FileBlock = { path, content };

  if (options?.startLine !== undefined) {
    result.startLine = options.startLine;
  }
  if (options?.endLine !== undefined) {
    result.endLine = options.endLine;
  }

  return result;
}

/**
 * Create file block request
 */
export function createFileBlockRequest(
  path: string,
  startLine?: number,
  endLine?: number
): FileBlockRequest {
  const result: FileBlockRequest = { path };

  if (startLine !== undefined) {
    result.startLine = startLine;
  }
  if (endLine !== undefined) {
    result.endLine = endLine;
  }

  return result;
}

// ============================================
// Line Operations
// ============================================

/**
 * Extract specific lines from file block
 */
export function extractLines(
  block: FileBlock,
  startLine: number,
  endLine: number
): string {
  const lines = block.content.split('\n');
  const start = Math.max(0, startLine - 1);
  const end = Math.min(lines.length, endLine);
  
  return lines.slice(start, end).join('\n');
}

/**
 * Get line count from file block
 */
export function getLineCount(block: FileBlock): number {
  return block.content.split('\n').length;
}

/**
 * Get line by number (1-indexed)
 */
export function getLine(block: FileBlock, lineNumber: number): string | null {
  const lines = block.content.split('\n');
  const index = lineNumber - 1;
  
  if (index < 0 || index >= lines.length) {
    return null;
  }
  
  return lines[index] ?? null;
}

// ============================================
// Chunking
// ============================================

/**
 * Split file into chunks
 */
export function chunkFile(
  content: string,
  maxLines: number
): Array<{ startLine: number; endLine: number; content: string }> {
  const lines = content.split('\n');
  const chunks: Array<{ startLine: number; endLine: number; content: string }> = [];

  for (let i = 0; i < lines.length; i += maxLines) {
    const chunkLines = lines.slice(i, i + maxLines);
    const startLine = i + 1;
    const endLine = Math.min(i + maxLines, lines.length);
    
    chunks.push({
      startLine,
      endLine,
      content: chunkLines.join('\n'),
    });
  }

  return chunks;
}

/**
 * Split file block into chunks
 */
export function chunkFileBlock(
  block: FileBlock,
  maxLines: number
): FileBlock[] {
  const chunks = chunkFile(block.content, maxLines);
  
  return chunks.map((chunk) => ({
    path: block.path,
    content: chunk.content,
    startLine: chunk.startLine,
    endLine: chunk.endLine,
  }));
}

// ============================================
// Merge Operations
// ============================================

/**
 * Merge file blocks (for same file)
 */
export function mergeFileBlocks(blocks: FileBlock[]): FileBlock {
  if (blocks.length === 0) {
    throw new Error('Cannot merge empty array of file blocks');
  }

  if (blocks.length === 1) {
    return blocks[0]!;
  }

  // Sort by startLine
  const sorted = [...blocks].sort((a, b) => {
    const aStart = a.startLine ?? 1;
    const bStart = b.startLine ?? 1;
    return aStart - bStart;
  });

  // Merge content
  const allLines: string[] = [];
  let maxLine = 0;

  for (const block of sorted) {
    const lines = block.content.split('\n');
    const startLine = block.startLine ?? 1;
    
    // Fill gaps with empty lines
    while (allLines.length < startLine - 1) {
      allLines.push('');
    }
    
    // Add lines
    for (let i = 0; i < lines.length; i++) {
      allLines[startLine - 1 + i] = lines[i] ?? '';
    }
    
    maxLine = Math.max(maxLine, (block.endLine ?? startLine + lines.length - 1));
  }

  return {
    path: sorted[0]!.path,
    content: allLines.join('\n'),
    startLine: sorted[0]!.startLine ?? 1,
    endLine: maxLine,
  };
}

// ============================================
// Diff Operations
// ============================================

export interface DiffChange {
  line: number;
  type: 'add' | 'delete' | 'modify';
  content: string;
}

export interface DiffResult {
  additions: number;
  deletions: number;
  changes: DiffChange[];
}

/**
 * Calculate diff between file blocks
 */
export function diffFileBlocks(
  original: FileBlock,
  modified: FileBlock
): DiffResult {
  const originalLines = original.content.split('\n');
  const modifiedLines = modified.content.split('\n');
  
  const changes: DiffChange[] = [];
  let additions = 0;
  let deletions = 0;

  // Simple line-by-line diff
  const maxLines = Math.max(originalLines.length, modifiedLines.length);
  
  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i];
    const modLine = modifiedLines[i];
    
    if (origLine === undefined && modLine !== undefined) {
      // Added line
      changes.push({ line: i + 1, type: 'add', content: modLine });
      additions++;
    } else if (origLine !== undefined && modLine === undefined) {
      // Deleted line
      changes.push({ line: i + 1, type: 'delete', content: origLine });
      deletions++;
    } else if (origLine !== modLine) {
      // Modified line
      changes.push({ line: i + 1, type: 'modify', content: modLine ?? '' });
      additions++;
      deletions++;
    }
  }

  return { additions, deletions, changes };
}

/**
 * Apply diff to file block
 */
export function applyDiff(
  block: FileBlock,
  diff: DiffChange[]
): FileBlock {
  const lines = block.content.split('\n');

  // Sort diff by line number descending (to apply from bottom to top)
  const sortedDiff = [...diff].sort((a, b) => b.line - a.line);

  for (const change of sortedDiff) {
    const lineIndex = change.line - 1;
    
    if (change.type === 'add') {
      lines.splice(lineIndex, 0, change.content);
    } else if (change.type === 'delete') {
      lines.splice(lineIndex, 1);
    } else if (change.type === 'modify') {
      if (lineIndex < lines.length) {
        lines[lineIndex] = change.content;
      }
    }
  }

  return {
    path: block.path,
    content: lines.join('\n'),
  };
}

// ============================================
// Serialization
// ============================================

/**
 * Serialize file block for transmission
 */
export function serializeFileBlock(block: FileBlock): string {
  return JSON.stringify(block);
}

/**
 * Deserialize file block from string
 */
export function deserializeFileBlock(data: string): FileBlock {
  try {
    const parsed = JSON.parse(data);
    return parseFileBlock(parsed);
  } catch (error) {
    throw new Error(
      `Failed to deserialize file block: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Deserialize file block safely (returns null on error)
 */
export function deserializeFileBlockSafe(data: string): FileBlock | null {
  try {
    return deserializeFileBlock(data);
  } catch {
    return null;
  }
}

// ============================================
// Utilities
// ============================================

/**
 * Get file extension from path
 */
export function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) {
    return '';
  }
  return path.substring(lastDot).toLowerCase();
}

/**
 * Get file name from path
 */
export function getFileName(path: string): string {
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return path.substring(lastSlash + 1);
}

/**
 * Get directory from path
 */
export function getDirectory(path: string): string {
  const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return path.substring(0, lastSlash);
}

/**
 * Check if file is a binary file (by extension)
 */
export function isBinaryFile(path: string): boolean {
  const binaryExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.zip', '.tar', '.gz', '.rar',
    '.exe', '.dll', '.so', '.dylib',
    '.mp3', '.mp4', '.wav', '.avi', '.mov',
    '.ttf', '.woff', '.woff2', '.eot',
  ]);
  
  const ext = getFileExtension(path);
  return binaryExtensions.has(ext);
}

/**
 * Calculate file size in bytes
 */
export function getFileSize(block: FileBlock): number {
  return Buffer.byteLength(block.content, 'utf8');
}

/**
 * Truncate file content to max size
 */
export function truncateFileBlock(
  block: FileBlock,
  maxBytes: number
): FileBlock {
  const currentSize = getFileSize(block);
  
  if (currentSize <= maxBytes) {
    return block;
  }
  
  // Truncate content
  let truncated = block.content;
  while (Buffer.byteLength(truncated, 'utf8') > maxBytes) {
    truncated = truncated.slice(0, -100);
  }
  
  return {
    ...block,
    content: truncated + '\n... [truncated]',
  };
}

/**
 * Clone file block deeply
 */
export function cloneFileBlock(block: FileBlock): FileBlock {
  return { ...block };
}
