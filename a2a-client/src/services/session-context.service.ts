/**
 * Session Context Service
 * In-memory storage for session-scoped context and project binding.
 */

export interface RootContext {
  [key: string]: unknown;
}

export interface ContextHandlerResult {
  context: RootContext;
  injectedContent: string;
  activatedNeurons: Array<{ neuron: { id: string; name: string }; matchedTriggers: string[] }>;
  requestedFiles: string[];
}

interface SessionState {
  projectId: string;
  rootContext: RootContext;
  updatedAt: Date;
}

const sessions = new Map<string, SessionState>();

export function createContext(sessionId: string, projectId: string): void {
  sessions.set(sessionId, {
    projectId,
    rootContext: {},
    updatedAt: new Date(),
  });
}

export function getContext(sessionId: string): { projectId: string } | null {
  const state = sessions.get(sessionId);
  if (!state) {
    return null;
  }

  return { projectId: state.projectId };
}

export function handleRoot(sessionId: string, rootContext: RootContext): ContextHandlerResult {
  const projectId = (rootContext['project_path'] as string) ?? 'default';

  sessions.set(sessionId, {
    projectId,
    rootContext,
    updatedAt: new Date(),
  });

  return {
    context: rootContext,
    injectedContent: '',
    activatedNeurons: [],
    requestedFiles: [],
  };
}

export function clearContext(sessionId: string): void {
  sessions.delete(sessionId);
}
