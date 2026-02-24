import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { TFIDFService, getTFIDFService } from './tfidf.service.js';

/**
 * Plexe Client
 * Integration with Plexe ML platform for embeddings and models
 * 
 * Now uses local TF-IDF/BM25 for sparse retrieval (no GPU/API required)
 */

export interface PlexeConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  useLocal?: boolean; // Use local TF-IDF instead of API
}

export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
}

export interface ClassificationRequest {
  text: string;
  model: string;
  labels?: string[];
}

export interface ClassificationResponse {
  label: string;
  confidence: number;
  scores: Record<string, number>;
}

export interface SearchResult {
  id: string;
  score: number;
}

/**
 * Plexe Client class with TF-IDF support
 */
export class PlexeClient {
  private tfidf: TFIDFService;
  private config: PlexeConfig;
  private initialized: boolean = false;

  constructor(config?: PlexeConfig) {
    this.config = config || { useLocal: true };
    this.tfidf = getTFIDFService();
  }

  /**
   * Initialize the client
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    logger.info('Initializing PlexeClient with TF-IDF backend');
    this.initialized = true;
  }

  /**
   * Get embedding for text (TF-IDF vector)
   */
  async embed(text: string): Promise<number[]> {
    if (!this.initialized) await this.initialize();
    
    const tokens = this.tfidf.tokenize(text);
    const tfidf = this.tfidf.getTFIDF(tokens);
    return Array.from(tfidf.values());
  }

  /**
   * Get embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.initialized) await this.initialize();
    
    const embeddings: number[][] = [];
    for (const text of texts) {
      embeddings.push(await this.embed(text));
    }
    return embeddings;
  }

  /**
   * Search for similar documents
   */
  async search(query: string, topK: number = 10): Promise<SearchResult[]> {
    if (!this.initialized) await this.initialize();
    
    return this.tfidf.search(query, topK);
  }

  /**
   * Index code document
   */
  async indexCode(id: string, code: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    this.tfidf.addDocument(id, code);
    logger.debug(`Indexed code document: ${id}`);
  }

  /**
   * Remove document from index
   */
  async removeDocument(id: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    return this.tfidf.removeDocument(id);
  }

  /**
   * Clear all indexed documents
   */
  async clearIndex(): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    this.tfidf.clear();
    logger.info('Cleared all indexed documents');
  }

  /**
   * Get document count
   */
  getDocumentCount(): number {
    return this.tfidf.getDocumentCount();
  }

  /**
   * Get vocabulary size
   */
  getVocabularySize(): number {
    return this.tfidf.getVocabularySize();
  }

  /**
   * Export index for persistence
   */
  exportIndex(): {
    documents: Array<[string, string[]]>;
    documentCount: number;
  } {
    return this.tfidf.exportIndex();
  }

  /**
   * Import index from exported data
   */
  async importIndex(data: {
    documents: Array<[string, string[]]>;
    documentCount: number;
  }): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    this.tfidf.importIndex(data);
    logger.info(`Imported ${data.documentCount} documents`);
  }
}

// Singleton instance
let plexeClient: PlexeClient | null = null;

/**
 * Initialize Plexe client
 */
export function initPlexeClient(config: PlexeConfig): void {
  plexeClient = new PlexeClient(config);
  logger.info('Plexe client initialized');
}

/**
 * Get Plexe client instance
 */
export function getPlexeClient(): PlexeClient {
  if (!plexeClient) {
    plexeClient = new PlexeClient({ useLocal: true });
  }
  return plexeClient;
}

/**
 * Get embedding for text
 */
export async function getEmbedding(text: string, model?: string): Promise<number[]> {
  const client = getPlexeClient();
  return client.embed(text);
}

/**
 * Get embeddings for multiple texts
 */
export async function getEmbeddings(
  texts: string[],
  model?: string
): Promise<number[][]> {
  const client = getPlexeClient();
  return client.embedBatch(texts);
}

/**
 * Classify text with model (placeholder - uses keyword matching)
 */
export async function classifyText(
  text: string,
  model: string,
  labels?: string[]
): Promise<ClassificationResponse> {
  // Simple keyword-based classification
  // In production, this would use a trained model
  const lowerText = text.toLowerCase();
  
  const defaultLabels = ['code', 'config', 'documentation', 'test', 'other'];
  const targetLabels = labels || defaultLabels;
  
  const scores: Record<string, number> = {};
  
  // Simple heuristic scoring
  if (lowerText.includes('function') || lowerText.includes('class') || lowerText.includes('const ')) {
    scores['code'] = 0.8;
  } else if (lowerText.includes('config') || lowerText.includes('settings')) {
    scores['config'] = 0.7;
  } else if (lowerText.includes('test') || lowerText.includes('describe(') || lowerText.includes('it(')) {
    scores['test'] = 0.8;
  } else if (lowerText.includes('#') || lowerText.includes('readme') || lowerText.includes('docs')) {
    scores['documentation'] = 0.7;
  } else {
    scores['other'] = 0.5;
  }
  
  // Fill missing labels with 0
  for (const label of targetLabels) {
    if (!(label in scores)) {
      scores[label] = 0;
    }
  }
  
  // Find best label
  let bestLabel = 'other';
  let bestScore = 0;
  for (const [label, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLabel = label;
    }
  }
  
  return {
    label: bestLabel,
    confidence: bestScore,
    scores,
  };
}

/**
 * Intent classification for A2A
 */
export async function classifyIntent(text: string): Promise<{
  intent: string;
  confidence: number;
}> {
  const lowerText = text.toLowerCase();
  
  // Simple keyword-based intent detection
  if (lowerText.includes('create') || lowerText.includes('add') || lowerText.includes('new')) {
    return { intent: 'create', confidence: 0.7 };
  } else if (lowerText.includes('update') || lowerText.includes('modify') || lowerText.includes('change')) {
    return { intent: 'update', confidence: 0.7 };
  } else if (lowerText.includes('delete') || lowerText.includes('remove')) {
    return { intent: 'delete', confidence: 0.7 };
  } else if (lowerText.includes('search') || lowerText.includes('find') || lowerText.includes('query')) {
    return { intent: 'search', confidence: 0.7 };
  } else if (lowerText.includes('analyze') || lowerText.includes('explain')) {
    return { intent: 'analyze', confidence: 0.7 };
  }
  
  return { intent: 'unknown', confidence: 0.3 };
}

/**
 * Detect actions in text
 */
export async function detectActions(text: string): Promise<Array<{
  action: string;
  target?: string;
  confidence: number;
}>> {
  const actions: Array<{ action: string; target?: string; confidence: number }> = [];
  const lowerText = text.toLowerCase();
  
  // Simple pattern matching for actions
  const patterns = [
    { pattern: /create\s+(\w+)/i, action: 'create' },
    { pattern: /update\s+(\w+)/i, action: 'update' },
    { pattern: /delete\s+(\w+)/i, action: 'delete' },
    { pattern: /find\s+(\w+)/i, action: 'find' },
    { pattern: /search\s+(\w+)/i, action: 'search' },
  ];
  
  for (const { pattern, action } of patterns) {
    const match = text.match(pattern);
    if (match) {
      const result: { action: string; target?: string; confidence: number } = {
        action,
        confidence: 0.6,
      };
      if (match[1]) {
        result.target = match[1];
      }
      actions.push(result);
    }
  }
  
  return actions;
}

/**
 * Classify document type
 */
export async function classifyDocument(
  content: string,
  filename: string
): Promise<{
  type: string;
  framework?: string;
  confidence: number;
}> {
  const lowerContent = content.toLowerCase();
  const lowerFilename = filename.toLowerCase();
  
  // Detect by extension
  if (lowerFilename.endsWith('.ts') || lowerFilename.endsWith('.tsx')) {
    const result: { type: string; framework?: string; confidence: number } = {
      type: 'typescript',
      confidence: 0.9,
    };
    if (lowerContent.includes('react') || lowerContent.includes('jsx')) {
      result.framework = 'react';
    } else if (lowerContent.includes('vue')) {
      result.framework = 'vue';
    } else if (lowerContent.includes('express')) {
      result.framework = 'express';
    }
    return result;
  }
  
  if (lowerFilename.endsWith('.js') || lowerFilename.endsWith('.jsx')) {
    const result: { type: string; framework?: string; confidence: number } = {
      type: 'javascript',
      confidence: 0.9,
    };
    if (lowerContent.includes('react')) {
      result.framework = 'react';
    } else if (lowerContent.includes('vue')) {
      result.framework = 'vue';
    } else if (lowerContent.includes('express')) {
      result.framework = 'express';
    }
    return result;
  }
  
  if (lowerFilename.endsWith('.php')) {
    const result: { type: string; framework?: string; confidence: number } = {
      type: 'php',
      confidence: 0.9,
    };
    if (lowerContent.includes('laravel') || lowerContent.includes('illuminate')) {
      result.framework = 'laravel';
    }
    return result;
  }
  
  if (lowerFilename.endsWith('.py')) {
    const result: { type: string; framework?: string; confidence: number } = {
      type: 'python',
      confidence: 0.9,
    };
    if (lowerContent.includes('django')) {
      result.framework = 'django';
    } else if (lowerContent.includes('flask')) {
      result.framework = 'flask';
    } else if (lowerContent.includes('fastapi')) {
      result.framework = 'fastapi';
    }
    return result;
  }
  
  if (lowerFilename.endsWith('.vue')) {
    return { type: 'vue', framework: 'vue', confidence: 0.95 };
  }
  
  if (lowerFilename.endsWith('.md')) {
    return { type: 'markdown', confidence: 0.95 };
  }
  
  if (lowerFilename.endsWith('.json')) {
    return { type: 'json', confidence: 0.95 };
  }
  
  if (lowerFilename.endsWith('.yaml') || lowerFilename.endsWith('.yml')) {
    return { type: 'yaml', confidence: 0.95 };
  }
  
  return { type: 'unknown', confidence: 0.3 };
}

/**
 * Check Plexe API health
 */
export async function checkPlexeHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  // Local TF-IDF is always healthy
  return {
    status: 'healthy',
    latency: 0,
  };
}

/**
 * Get available models
 */
export async function getAvailableModels(): Promise<string[]> {
  return ['tfidf', 'bm25'];
}
