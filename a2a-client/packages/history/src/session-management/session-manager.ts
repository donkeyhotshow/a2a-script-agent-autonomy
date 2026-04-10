/**
 * Session Manager
 * 
 * This module provides session management functionality.
 */

import { v4 as uuidv4 } from 'uuid';
import type { 
  SessionMetadata, 
  SessionData, 
  PlanEntry, 
  TaskEntry, 
  ExecutionLogEntry,
  ExchangeLogEntry,
  MessageEntry 
} from './types.js';
import type { StorageBackend } from './storage-interface.js';

/**
 * Session Manager
 * Handles session creation, retrieval, and management
 */
export class SessionManager {
  private storage: StorageBackend;

  constructor(storage: StorageBackend) {
    this.storage = storage;
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  /**
   * Create a new session
   */
  async createSession(
    name: string, 
    description?: string, 
    tags: string[] = [],
    projectPath?: string
  ): Promise<SessionMetadata> {
    const session: SessionMetadata = {
      id: uuidv4(),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      tags,
      projectPath: projectPath || ''
    };

    const sessionData: SessionData = {
      metadata: session,
      plans: [],
      tasks: [],
      context: {
        exchangeLog: [],
        messages: []
      }
    };

    await this.storage.save(session.id, sessionData);
    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.storage.load(sessionId);
  }

  /**
   * List all sessions
   */
  async listSessions(): Promise<SessionMetadata[]> {
    const sessionIds = await this.storage.list();
    const sessions: SessionMetadata[] = [];

    for (const sessionId of sessionIds) {
      const sessionData = await this.storage.load(sessionId);
      if (sessionData) {
        sessions.push(sessionData.metadata);
      }
    }

    return sessions.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Update session metadata
   */
  async updateSession(sessionId: string, updates: Partial<SessionMetadata>): Promise<boolean> {
    const sessionData = await this.storage.load(sessionId);
    if (!sessionData) return false;

    sessionData.metadata = { 
      ...sessionData.metadata, 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    
    await this.storage.save(sessionId, sessionData);
    return true;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    return this.storage.delete(sessionId);
  }

  /**
   * Archive a session
   */
  async archiveSession(sessionId: string): Promise<boolean> {
    return this.updateSession(sessionId, { status: 'archived' });
  }

  /**
   * Get active session
   */
  async getActiveSession(): Promise<SessionData | null> {
    const sessions = await this.listSessions();
    const activeSession = sessions.find(s => s.status === 'active');
    
    if (activeSession) {
      return this.getSession(activeSession.id);
    }
    return null;
  }

  /**
   * Create a plan within a session
   */
  async createPlan(
    sessionId: string, 
    planData: Omit<PlanEntry, 'id' | 'createdAt' | 'updatedAt' | 'relatedTasks'>
  ): Promise<PlanEntry | null> {
    const sessionData = await this.storage.load(sessionId);
    if (!sessionData) return null;

    const plan: PlanEntry = {
      id: uuidv4(),
      ...planData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedTasks: []
    };

    sessionData.plans.push(plan);
    await this.storage.save(sessionId, sessionData);
    return plan;
  }

  /**
   * Update a plan
   */
  async updatePlan(sessionId: string, planId: string, updates: Partial<PlanEntry>): Promise<boolean> {
    const sessionData = await this.storage.load(sessionId);
    if (!sessionData) return false;

    const planIndex = sessionData.plans.findIndex(p => p.id === planId);
    if (planIndex === -1) return false;

    sessionData.plans[planIndex] = {
      ...sessionData.plans[planIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.storage.save(sessionId, sessionData);
    return true;
  }

  /**
   * Create a task within a session
   */
  async createTask(
    sessionId: string, 
    taskData: Omit<TaskEntry, 'id' | 'createdAt' | 'updatedAt' | 'executionLog'>
  ): Promise<TaskEntry | null> {
    const sessionData = await this.storage.load(sessionId);
    if (!sessionData) return null;

    const task: TaskEntry = {
      id: uuidv4(),
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionLog: []
    };

    sessionData.tasks.push(task);

    // Update plan's related tasks if planId is provided
    if (taskData.planId) {
      const plan = sessionData.plans.find(p => p.id === taskData.planId);
      if (plan) {
        plan.relatedTasks.push(task.id);
      }
    }

    await this.storage.save(sessionId, sessionData);
    return task;
  }

  /**
   * Update a task
   */
  async updateTask(sessionId: string, taskId: string, updates: Partial<TaskEntry>): Promise<boolean> {
    const sessionData = await this.storage.load(sessionId);
    if (!sessionData) return false;

    const taskIndex = sessionData.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;

    sessionData.tasks[taskIndex] = {
      ...sessionData.tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.storage.save(sessionId, sessionData);
    return true;
  }

  /**
   * Add execution log entry to a task
   */
  async addExecutionLog(
    sessionId: string, 
    taskId: string, 
    logEntry: Omit<ExecutionLogEntry, 'id' | 'timestamp'>
  ): Promise<boolean> {
    const sessionData = await this.storage.load(sessionId);
    if (!sessionData) return false;

    const task = sessionData.tasks.find(t => t.id === taskId);
    if (!task) return false;

    const logEntryWithId: ExecutionLogEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...logEntry
    };

    task.executionLog.push(logEntryWithId);
    await this.storage.save(sessionId, sessionData);
    return true;
  }

  /**
   * Add exchange log entry
   */
  async addExchangeLog(
    sessionId: string, 
    type: 'request' | 'response' | 'error', 
    content: Record<string, any>, 
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const sessionData = await this.storage.load(sessionId);
    if (!sessionData) return false;

    if (!sessionData.context.exchangeLog) {
      sessionData.context.exchangeLog = [];
    }

    const logEntry: ExchangeLogEntry = {
      id: uuidv4(),
      type,
      content,
      timestamp: new Date().toISOString(),
      metadata
    };

    sessionData.context.exchangeLog.push(logEntry);
    await this.storage.save(sessionId, sessionData);
    return true;
  }

  /**
   * Add message entry
   */
  async addMessage(
    sessionId: string, 
    content: string, 
    role: 'user' | 'assistant' | 'system' = 'assistant',
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const sessionData = await this.storage.load(sessionId);
    if (!sessionData) return false;

    if (!sessionData.context.messages) {
      sessionData.context.messages = [];
    }

    const messageEntry: MessageEntry = {
      id: uuidv4(),
      content,
      role,
      timestamp: new Date().toISOString(),
      metadata
    };

    sessionData.context.messages.push(messageEntry);
    await this.storage.save(sessionId, sessionData);
    return true;
  }

  /**
   * Get session context
   */
  async getContext(sessionId: string): Promise<Record<string, any>> {
    const sessionData = await this.storage.load(sessionId);
    return sessionData?.context || {};
  }

  /**
   * Update session context
   */
  async updateContext(sessionId: string, updates: Record<string, any>): Promise<boolean> {
    const sessionData = await this.storage.load(sessionId);
    if (!sessionData) return false;

    sessionData.context = { ...sessionData.context, ...updates };
    await this.storage.save(sessionId, sessionData);
    return true;
  }

  /**
   * Get session summary
   */
  async getSessionSummary(sessionId: string): Promise<{
    session: SessionData | null;
    messageCount: number;
    exchangeLogCount: number;
    recentMessages: MessageEntry[];
    recentExchangeLog: ExchangeLogEntry[];
  }> {
    const sessionData = await this.storage.load(sessionId);
    if (!sessionData) {
      return {
        session: null,
        messageCount: 0,
        exchangeLogCount: 0,
        recentMessages: [],
        recentExchangeLog: []
      };
    }

    const messages = sessionData.context.messages || [];
    const exchangeLog = sessionData.context.exchangeLog || [];

    return {
      session: sessionData,
      messageCount: messages.length,
      exchangeLogCount: exchangeLog.length,
      recentMessages: messages.slice(-10).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
      recentExchangeLog: exchangeLog.slice(-10).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    };
  }
}
