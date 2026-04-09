/**
 * Session Storage Types
 */

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
