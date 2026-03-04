import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface SessionMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'archived';
  tags: string[];
  projectPath: string;
}

export interface ExchangeLogEntry {
  id: string;
  type: 'request' | 'response' | 'error';
  content: Record<string, any>;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface MessageEntry {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SessionContext {
  execute?: {
    action: string;
    input: Record<string, any>;
    output?: Record<string, any>;
    status: string;
    progress?: number;
    timestamp: string;
  };
  exchangeLog: ExchangeLogEntry[];
  messages: MessageEntry[];
  [key: string]: any;
}

export interface SessionData {
  metadata: SessionMetadata;
  plans: PlanEntry[];
  tasks: TaskEntry[];
  context: SessionContext;
}

export interface PlanEntry {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  content: string;
  relatedTasks: string[];
}

export interface TaskEntry {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  content: string;
  planId?: string;
  executionLog: ExecutionLogEntry[];
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: Record<string, any>;
  status: 'success' | 'error' | 'warning';
}

export class SessionStorage {
  private basePath: string;
  private sessionsDir: string;

  constructor(projectPath: string) {
    this.basePath = path.join(projectPath, '.a2a-sessions');
    this.sessionsDir = path.join(this.basePath, 'sessions');
  }

  async initialize(): Promise<void> {
    try {
      await fs.access(this.basePath);
    } catch {
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(this.sessionsDir, { recursive: true });
    }
  }

  async createSession(name: string, description?: string, tags: string[] = []): Promise<SessionMetadata> {
    const session: SessionMetadata = {
      id: uuidv4(),
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      tags,
      projectPath: this.basePath
    };

    const sessionDir = path.join(this.sessionsDir, session.id);
    await fs.mkdir(sessionDir, { recursive: true });

    const sessionData: SessionData = {
      metadata: session,
      plans: [],
      tasks: [],
      context: {}
    };

    await this.saveSessionData(session.id, sessionData);
    return session;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      return sessionData;
    } catch {
      return null;
    }
  }

  async listSessions(): Promise<SessionMetadata[]> {
    try {
      const entries = await fs.readdir(this.sessionsDir);
      const sessions: SessionMetadata[] = [];

      for (const entry of entries) {
        try {
          const sessionData = await this.loadSessionData(entry);
          sessions.push(sessionData.metadata);
        } catch {
          // Skip invalid sessions
        }
      }

      return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch {
      return [];
    }
  }

  async updateSession(sessionId: string, updates: Partial<SessionMetadata>): Promise<boolean> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      sessionData.metadata = { ...sessionData.metadata, ...updates, updatedAt: new Date().toISOString() };
      await this.saveSessionData(sessionId, sessionData);
      return true;
    } catch {
      return false;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessionDir = path.join(this.sessionsDir, sessionId);
      await fs.rm(sessionDir, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }

  async createPlan(sessionId: string, planData: Omit<PlanEntry, 'id' | 'createdAt' | 'updatedAt' | 'relatedTasks'>): Promise<PlanEntry> {
    const plan: PlanEntry = {
      id: uuidv4(),
      ...planData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedTasks: []
    };

    const sessionData = await this.loadSessionData(sessionId);
    sessionData.plans.push(plan);
    await this.saveSessionData(sessionId, sessionData);

    return plan;
  }

  async updatePlan(sessionId: string, planId: string, updates: Partial<PlanEntry>): Promise<boolean> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      const planIndex = sessionData.plans.findIndex(p => p.id === planId);

      if (planIndex === -1) {
        return false;
      }

      sessionData.plans[planIndex] = {
        ...sessionData.plans[planIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.saveSessionData(sessionId, sessionData);
      return true;
    } catch {
      return false;
    }
  }

  async createTask(sessionId: string, taskData: Omit<TaskEntry, 'id' | 'createdAt' | 'updatedAt' | 'executionLog'>): Promise<TaskEntry> {
    const task: TaskEntry = {
      id: uuidv4(),
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionLog: []
    };

    const sessionData = await this.loadSessionData(sessionId);
    sessionData.tasks.push(task);

    // Update plan's related tasks if planId is provided
    if (taskData.planId) {
      const plan = sessionData.plans.find(p => p.id === taskData.planId);
      if (plan) {
        plan.relatedTasks.push(task.id);
      }
    }

    await this.saveSessionData(sessionId, sessionData);
    return task;
  }

  async updateTask(sessionId: string, taskId: string, updates: Partial<TaskEntry>): Promise<boolean> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      const taskIndex = sessionData.tasks.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        return false;
      }

      sessionData.tasks[taskIndex] = {
        ...sessionData.tasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.saveSessionData(sessionId, sessionData);
      return true;
    } catch {
      return false;
    }
  }

  async addExecutionLog(sessionId: string, taskId: string, logEntry: Omit<ExecutionLogEntry, 'id' | 'timestamp'>): Promise<boolean> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      const task = sessionData.tasks.find(t => t.id === taskId);

      if (!task) {
        return false;
      }

      const logEntryWithId: ExecutionLogEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...logEntry
      };

      task.executionLog.push(logEntryWithId);
      await this.saveSessionData(sessionId, sessionData);
      return true;
    } catch {
      return false;
    }
  }

  async getContext(sessionId: string): Promise<Record<string, any>> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      return sessionData.context;
    } catch {
      return {};
    }
  }

  async updateContext(sessionId: string, updates: Record<string, any>): Promise<boolean> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      sessionData.context = { ...sessionData.context, ...updates };
      await this.saveSessionData(sessionId, sessionData);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add exchange log entry for client-server interactions
   */
  async addExchangeLog(sessionId: string, type: 'request' | 'response' | 'error', content: Record<string, any>, metadata?: Record<string, any>): Promise<boolean> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      
      // Initialize exchangeLog if it doesn't exist
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
      await this.saveSessionData(sessionId, sessionData);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add message entry for user/assistant interactions
   */
  async addMessage(sessionId: string, content: string, role: 'user' | 'assistant' | 'system' = 'assistant', metadata?: Record<string, any>): Promise<boolean> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      
      // Initialize messages if it doesn't exist
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
      await this.saveSessionData(sessionId, sessionData);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all exchange log entries for a session
   */
  async getExchangeLog(sessionId: string): Promise<ExchangeLogEntry[]> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      return sessionData.context.exchangeLog || [];
    } catch {
      return [];
    }
  }

  /**
   * Get all message entries for a session
   */
  async getMessages(sessionId: string): Promise<MessageEntry[]> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      return sessionData.context.messages || [];
    } catch {
      return [];
    }
  }

  /**
   * Reconstruct messages from exchange log entries
   * This is useful for backward compatibility or when messages are not directly stored
   */
  async reconstructMessagesFromLog(sessionId: string): Promise<MessageEntry[]> {
    try {
      const exchangeLog = await this.getExchangeLog(sessionId);
      const messages: MessageEntry[] = [];

      for (const logEntry of exchangeLog) {
        if (logEntry.type === 'request' && logEntry.content?.result) {
          // Extract user message from request
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
          // Extract assistant message from response
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
          // Add error as system message
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
    } catch {
      return [];
    }
  }

  /**
   * Get session summary with message count and recent activity
   */
  async getSessionSummary(sessionId: string): Promise<{
    session: SessionData | null;
    messageCount: number;
    exchangeLogCount: number;
    recentMessages: MessageEntry[];
    recentExchangeLog: ExchangeLogEntry[];
  }> {
    try {
      const sessionData = await this.loadSessionData(sessionId);
      const messages = sessionData.context.messages || [];
      const exchangeLog = sessionData.context.exchangeLog || [];

      return {
        session: sessionData,
        messageCount: messages.length,
        exchangeLogCount: exchangeLog.length,
        recentMessages: messages.slice(-10).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        recentExchangeLog: exchangeLog.slice(-10).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      };
    } catch {
      return {
        session: null,
        messageCount: 0,
        exchangeLogCount: 0,
        recentMessages: [],
        recentExchangeLog: []
      };
    }
  }

  /**
   * Helper method to extract user message from request content
   */
  private extractUserMessageFromRequest(result: any): string | null {
    // Try to extract from different possible structures
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

  /**
   * Helper method to extract assistant message from response content
   */
  private extractAssistantMessageFromResponse(response: any): string | null {
    // Try to extract from different possible structures
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

  async getActiveSession(): Promise<SessionData | null> {
    const sessions = await this.listSessions();
    const activeSession = sessions.find(s => s.status === 'active');

    if (activeSession) {
      return this.getSession(activeSession.id);
    }

    return null;
  }

  async archiveSession(sessionId: string): Promise<boolean> {
    return this.updateSession(sessionId, { status: 'archived' });
  }

  private async loadSessionData(sessionId: string): Promise<SessionData> {
    const sessionFile = path.join(this.sessionsDir, sessionId, 'session.json');
    const data = await fs.readFile(sessionFile, 'utf8');
    return JSON.parse(data);
  }

  private async saveSessionData(sessionId: string, sessionData: SessionData): Promise<void> {
    const sessionFile = path.join(this.sessionsDir, sessionId, 'session.json');
    await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
  }
}

export default SessionStorage;