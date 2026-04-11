/**
 * Session Storage Module
 * 
 * This module provides session storage functionality with support for multiple storage backends.
 * 
 * Usage:
 * ```typescript
 * import { SessionStorage, FileStorageBackend } from './index.js';
 * 
 * const backend = new FileStorageBackend('/path/to/sessions');
 * const storage = new SessionStorage(backend);
 * await storage.initialize();
 * ```
 */

// Re-export types
export * from './types.js';

// Re-export storage interface and implementations
export { StorageBackend } from './storage-interface.js';
export { FileStorageBackend, MemoryStorageBackend, HybridStorageBackend } from './storage-backends.js';

// Re-export session manager
export { SessionManager } from './session-manager.js';

/**
 * SessionStorage - Main class for backward compatibility
 * 
 * This is a convenience class that combines the FileStorageBackend and SessionManager.
 */
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileStorageBackend } from './storage-backends.js';
import { SessionManager } from './session-manager.js';
import { checkPathAccess } from '../../../execution/src/fs-access.js';
import type { 
  SessionMetadata, 
  SessionData, 
  PlanEntry, 
  TaskEntry, 
  ExecutionLogEntry,
  ExchangeLogEntry,
  MessageEntry 
} from './types.js';

export class SessionStorage {
  private basePath: string;
  private sessionsDir: string;
  private manager: SessionManager;

  constructor(projectPath: string) {
    this.basePath = path.join(projectPath, '.a2a-sessions');
    this.sessionsDir = path.join(this.basePath, 'sessions');
    
    const backend = new FileStorageBackend(this.sessionsDir);
    this.manager = new SessionManager(backend);
  }

   async initialize(): Promise<void> {
     try {
       const hasAccess = await checkPathAccess(this.basePath);
       if (!hasAccess) {
         await fs.mkdir(this.basePath, { recursive: true });
         await fs.mkdir(this.sessionsDir, { recursive: true });
       }
     } catch {
       await fs.mkdir(this.basePath, { recursive: true });
       await fs.mkdir(this.sessionsDir, { recursive: true });
     }
     await this.manager.initialize();
   }

  async createSession(name: string, description?: string, tags: string[] = []): Promise<SessionMetadata> {
    return this.manager.createSession(name, description, tags, this.basePath);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.manager.getSession(sessionId);
  }

  async listSessions(): Promise<SessionMetadata[]> {
    return this.manager.listSessions();
  }

  async updateSession(sessionId: string, updates: Partial<SessionMetadata>): Promise<boolean> {
    return this.manager.updateSession(sessionId, updates);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.manager.deleteSession(sessionId);
  }

  async createPlan(sessionId: string, planData: Omit<PlanEntry, 'id' | 'createdAt' | 'updatedAt' | 'relatedTasks'>): Promise<PlanEntry> {
    const result = await this.manager.createPlan(sessionId, planData);
    if (!result) throw new Error('Failed to create plan');
    return result;
  }

  async updatePlan(sessionId: string, planId: string, updates: Partial<PlanEntry>): Promise<boolean> {
    return this.manager.updatePlan(sessionId, planId, updates);
  }

  async createTask(sessionId: string, taskData: Omit<TaskEntry, 'id' | 'createdAt' | 'updatedAt' | 'executionLog'>): Promise<TaskEntry> {
    const result = await this.manager.createTask(sessionId, taskData);
    if (!result) throw new Error('Failed to create task');
    return result;
  }

  async updateTask(sessionId: string, taskId: string, updates: Partial<TaskEntry>): Promise<boolean> {
    return this.manager.updateTask(sessionId, taskId, updates);
  }

  async addExecutionLog(sessionId: string, taskId: string, logEntry: Omit<ExecutionLogEntry, 'id' | 'timestamp'>): Promise<boolean> {
    return this.manager.addExecutionLog(sessionId, taskId, logEntry);
  }

  async getContext(sessionId: string): Promise<Record<string, any>> {
    return this.manager.getContext(sessionId);
  }

  async updateContext(sessionId: string, updates: Record<string, any>): Promise<boolean> {
    return this.manager.updateContext(sessionId, updates);
  }

  async addExchangeLog(sessionId: string, type: 'request' | 'response' | 'error', content: Record<string, any>, metadata?: Record<string, any>): Promise<boolean> {
    return this.manager.addExchangeLog(sessionId, type, content, metadata);
  }

  async addMessage(sessionId: string, content: string, role: 'user' | 'assistant' | 'system' = 'assistant', metadata?: Record<string, any>): Promise<boolean> {
    return this.manager.addMessage(sessionId, content, role, metadata);
  }

  async getExchangeLog(sessionId: string): Promise<ExchangeLogEntry[]> {
    const session = await this.getSession(sessionId);
    return session?.context.exchangeLog || [];
  }

  async getMessages(sessionId: string): Promise<MessageEntry[]> {
    const session = await this.getSession(sessionId);
    return session?.context.messages || [];
  }

  async reconstructMessagesFromLog(sessionId: string): Promise<MessageEntry[]> {
    const exchangeLog = await this.getExchangeLog(sessionId);
    const messages: MessageEntry[] = [];

    for (const logEntry of exchangeLog) {
      if (logEntry.type === 'request' && logEntry.content?.result) {
        const userMessage = this.extractUserMessageFromRequest(logEntry.content.result);
        if (userMessage) {
          messages.push({
            id: `msg_${logEntry.id}_user`,
            content: userMessage,
            role: 'user',
            timestamp: logEntry.timestamp,
            metadata: { source: 'exchange_log', logId: logEntry.id }
          });
        }
      } else if (logEntry.type === 'response' && logEntry.content?.execute) {
        const assistantMessage = this.extractAssistantMessageFromResponse(logEntry.content);
        if (assistantMessage) {
          messages.push({
            id: `msg_${logEntry.id}_assistant`,
            content: assistantMessage,
            role: 'assistant',
            timestamp: logEntry.timestamp,
            metadata: { source: 'exchange_log', logId: logEntry.id }
          });
        }
      } else if (logEntry.type === 'error') {
        messages.push({
          id: `msg_${logEntry.id}_system`,
          content: `Error: ${logEntry.content?.message || 'Unknown error'}`,
          role: 'system',
          timestamp: logEntry.timestamp,
          metadata: { source: 'exchange_log', logId: logEntry.id, error: true }
        });
      }
    }

    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async getSessionSummary(sessionId: string): Promise<{
    session: SessionData | null;
    messageCount: number;
    exchangeLogCount: number;
    recentMessages: MessageEntry[];
    recentExchangeLog: ExchangeLogEntry[];
  }> {
    return this.manager.getSessionSummary(sessionId);
  }

  async getActiveSession(): Promise<SessionData | null> {
    return this.manager.getActiveSession();
  }

  async archiveSession(sessionId: string): Promise<boolean> {
    return this.manager.archiveSession(sessionId);
  }

  private extractUserMessageFromRequest(result: any): string | null {
    if (result?.form?.choice) {
      return `User selected: ${result.form.choice}`;
    }
    if (result?.content) {
      return result.content;
    }
    if (result?.message) {
      return result.message;
    }
    return null;
  }

  private extractAssistantMessageFromResponse(response: any): string | null {
    if (response?.execute?.form?.title) {
      return `Assistant: ${response.execute.form.title}`;
    }
    if (response?.execute?.message) {
      return `Assistant: ${response.execute.message}`;
    }
    if (response?.message) {
      return response.message;
    }
    return null;
  }
}

export default SessionStorage;
