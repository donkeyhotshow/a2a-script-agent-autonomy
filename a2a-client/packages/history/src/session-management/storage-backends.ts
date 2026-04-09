/**
 * Storage Backends
 * 
 * This module provides different storage implementations for session data.
 */

import fs from 'fs/promises';
import path from 'path';
import type { SessionData } from './types.js';

/**
 * File System Storage Backend
 * Stores session data as JSON files on disk
 */
export class FileStorageBackend {
  private sessionsDir: string;

  constructor(sessionsDir: string) {
    this.sessionsDir = sessionsDir;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.sessionsDir, { recursive: true });
  }

  async load(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionFile = path.join(this.sessionsDir, sessionId, 'session.json');
      const data = await fs.readFile(sessionFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async save(sessionId: string, data: SessionData): Promise<void> {
    const sessionDir = path.join(this.sessionsDir, sessionId);
    await fs.mkdir(sessionDir, { recursive: true });
    const sessionFile = path.join(sessionDir, 'session.json');
    await fs.writeFile(sessionFile, JSON.stringify(data, null, 2));
  }

  async delete(sessionId: string): Promise<boolean> {
    try {
      const sessionDir = path.join(this.sessionsDir, sessionId);
      await fs.rm(sessionDir, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.sessionsDir);
      return entries;
    } catch {
      return [];
    }
  }

  async exists(sessionId: string): Promise<boolean> {
    try {
      const sessionFile = path.join(this.sessionsDir, sessionId, 'session.json');
      await fs.access(sessionFile);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Memory Storage Backend
 * Stores session data in memory (for testing or temporary storage)
 */
export class MemoryStorageBackend {
  private sessions: Map<string, SessionData> = new Map();

  async initialize(): Promise<void> {
    // No initialization needed for memory storage
  }

  async load(sessionId: string): Promise<SessionData | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async save(sessionId: string, data: SessionData): Promise<void> {
    this.sessions.set(sessionId, data);
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.sessions.keys());
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  /**
   * Clear all sessions (useful for testing)
   */
  clear(): void {
    this.sessions.clear();
  }

  /**
   * Get the number of stored sessions
   */
  size(): number {
    return this.sessions.size;
  }
}

/**
 * Hybrid Storage Backend
 * Uses memory cache with file system persistence
 */
export class HybridStorageBackend {
  private memoryCache: Map<string, SessionData> = new Map();
  private fileBackend: FileStorageBackend;
  private useCache: boolean = true;

  constructor(sessionsDir: string) {
    this.fileBackend = new FileStorageBackend(sessionsDir);
  }

  async initialize(): Promise<void> {
    await this.fileBackend.initialize();
  }

  async load(sessionId: string): Promise<SessionData | null> {
    // Check memory cache first
    if (this.useCache && this.memoryCache.has(sessionId)) {
      return this.memoryCache.get(sessionId)!;
    }

    // Load from file system
    const data = await this.fileBackend.load(sessionId);
    if (data && this.useCache) {
      this.memoryCache.set(sessionId, data);
    }
    return data;
  }

  async save(sessionId: string, data: SessionData): Promise<void> {
    // Save to memory cache
    if (this.useCache) {
      this.memoryCache.set(sessionId, data);
    }

    // Save to file system
    await this.fileBackend.save(sessionId, data);
  }

  async delete(sessionId: string): Promise<boolean> {
    // Remove from memory cache
    this.memoryCache.delete(sessionId);

    // Delete from file system
    return this.fileBackend.delete(sessionId);
  }

  async list(): Promise<string[]> {
    return this.fileBackend.list();
  }

  async exists(sessionId: string): Promise<boolean> {
    // Check memory cache first
    if (this.memoryCache.has(sessionId)) {
      return true;
    }
    return this.fileBackend.exists(sessionId);
  }

  /**
   * Clear memory cache
   */
  clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Enable/disable memory caching
   */
  setCaching(enabled: boolean): void {
    this.useCache = enabled;
    if (!enabled) {
      this.clearCache();
    }
  }
}
