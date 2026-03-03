import SessionStorage, {
  SessionMetadata,
  SessionData,
  PlanEntry,
  TaskEntry,
  ExecutionLogEntry
} from './session-storage';

export interface HistoryManagerOptions {
  projectPath: string;
  autoCreateSession?: boolean;
  defaultSessionName?: string;
}

export class HistoryManager {
  private sessionStorage: SessionStorage;
  private currentSessionId: string | null = null;

  constructor(options: HistoryManagerOptions) {
    this.sessionStorage = new SessionStorage(options.projectPath);
    this.sessionStorage.initialize();
  }

  async initialize(): Promise<void> {
    await this.sessionStorage.initialize();
  }

  // Session Management
  async createSession(name: string, description?: string, tags: string[] = []): Promise<SessionMetadata> {
    const session = await this.sessionStorage.createSession(name, description, tags);
    this.currentSessionId = session.id;
    return session;
  }

  async getActiveSession(): Promise<SessionData | null> {
    return this.sessionStorage.getActiveSession();
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    return this.sessionStorage.getSession(sessionId);
  }

  async listSessions(): Promise<SessionMetadata[]> {
    return this.sessionStorage.listSessions();
  }

  async switchSession(sessionId: string): Promise<boolean> {
    const session = await this.sessionStorage.getSession(sessionId);
    if (session) {
      this.currentSessionId = sessionId;
      return true;
    }
    return false;
  }

  async archiveCurrentSession(): Promise<boolean> {
    if (!this.currentSessionId) {
      return false;
    }
    return this.sessionStorage.archiveSession(this.currentSessionId);
  }

  // Plan Management
  async createPlan(
    name: string,
    description?: string,
    priority: 'high' | 'medium' | 'low' = 'medium',
    tags: string[] = []
  ): Promise<PlanEntry> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    return this.sessionStorage.createPlan(this.currentSessionId, {
      name,
      description,
      priority,
      tags,
      content: ''
    });
  }

  async updatePlan(planId: string, updates: Partial<PlanEntry>): Promise<boolean> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    return this.sessionStorage.updatePlan(this.currentSessionId, planId, updates);
  }

  async getPlans(): Promise<PlanEntry[]> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    const session = await this.sessionStorage.getSession(this.currentSessionId);
    return session?.plans || [];
  }

  async getPlan(planId: string): Promise<PlanEntry | null> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    const session = await this.sessionStorage.getSession(this.currentSessionId);
    return session?.plans.find(p => p.id === planId) || null;
  }

  // Task Management
  async createTask(
    name: string,
    description?: string,
    planId?: string,
    priority: 'high' | 'medium' | 'low' = 'medium',
    tags: string[] = []
  ): Promise<TaskEntry> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    return this.sessionStorage.createTask(this.currentSessionId, {
      name,
      description,
      planId,
      priority,
      tags,
      content: ''
    });
  }

  async updateTask(taskId: string, updates: Partial<TaskEntry>): Promise<boolean> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    return this.sessionStorage.updateTask(this.currentSessionId, taskId, updates);
  }

  async getTasks(): Promise<TaskEntry[]> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    const session = await this.sessionStorage.getSession(this.currentSessionId);
    return session?.tasks || [];
  }

  async getTask(taskId: string): Promise<TaskEntry | null> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    const session = await this.sessionStorage.getSession(this.currentSessionId);
    return session?.tasks.find(t => t.id === taskId) || null;
  }

  async addExecutionLog(taskId: string, action: string, details: Record<string, any>, status: 'success' | 'error' | 'warning' = 'success'): Promise<boolean> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    return this.sessionStorage.addExecutionLog(this.currentSessionId, taskId, {
      action,
      details,
      status
    });
  }

  // Context Management
  async getContext(): Promise<Record<string, any>> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    return this.sessionStorage.getContext(this.currentSessionId);
  }

  async updateContext(updates: Record<string, any>): Promise<boolean> {
    if (!this.currentSessionId) {
      throw new Error('No active session. Create or switch to a session first.');
    }

    return this.sessionStorage.updateContext(this.currentSessionId, updates);
  }

  // Utility Methods
  async getTaskStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    failed: number;
  }> {
    const tasks = await this.getTasks();
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      failed: tasks.filter(t => t.status === 'failed').length
    };
  }

  async getPlanStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  }> {
    const plans = await this.getPlans();
    return {
      total: plans.length,
      pending: plans.filter(p => p.status === 'pending').length,
      inProgress: plans.filter(p => p.status === 'in_progress').length,
      completed: plans.filter(p => p.status === 'completed').length,
      cancelled: plans.filter(p => p.status === 'cancelled').length
    };
  }

  async getSessionSummary(): Promise<{
    session: SessionData | null;
    planStats: any;
    taskStats: any;
    recentActivity: ExecutionLogEntry[];
  }> {
    const session = await this.getActiveSession();
    const planStats = await this.getPlanStats();
    const taskStats = await this.getTaskStats();

    // Get recent activity from all tasks
    const recentActivity: ExecutionLogEntry[] = [];
    if (session) {
      for (const task of session.tasks) {
        recentActivity.push(...task.executionLog);
      }
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return {
      session,
      planStats,
      taskStats,
      recentActivity: recentActivity.slice(0, 20) // Last 20 activities
    };
  }

  // Static utility methods
  static async createHistoryManager(projectPath: string): Promise<HistoryManager> {
    const manager = new HistoryManager({ projectPath });
    await manager.initialize();
    return manager;
  }
}

export default HistoryManager;