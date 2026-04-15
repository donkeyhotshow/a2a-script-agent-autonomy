/**
 * @a2a/server-protocol — minimal stub
 * Full validation is handled by AJV schema in routes/index.ts.
 */
export function validateInvokeRequest(body: unknown): { valid: boolean; errors?: string[] } {
  if (body === null || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be an object'] };
  }
  return { valid: true };
}

// Protocol types — minimal stubs for type-checking
export interface ContextBlock {
  type: string;
  content: unknown;
}

export interface ServerMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface Task {
  id: string;
  type: string;
  status: TaskStatus;
  payload?: unknown;
}

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TaskType = 'dialog' | 'agent' | 'form' | 'script';

export interface RequestContextBlock {
  sessionId?: string;
  requestId?: string;
  context?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface FileBlock {
  path: string;
  content: string;
  startLine?: number;
  endLine?: number;
}
