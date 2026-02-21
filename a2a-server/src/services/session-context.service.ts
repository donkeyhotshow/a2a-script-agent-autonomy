/**
 * Session Context Service
 * Stub: knowledge/context-handler archived. Returns minimal responses.
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

const sessions = new Map<string, { projectId: string }>();

export function createContext(sessionId: string, projectId: string): void {
  sessions.set(sessionId, { projectId });
}

export function getContext(sessionId: string): { projectId: string } | null {
  return sessions.get(sessionId) ?? null;
}

export function handleRoot(sessionId: string, rootContext: RootContext): ContextHandlerResult {
  sessions.set(sessionId, { projectId: (rootContext['project_path'] as string) ?? 'default' });
  return {
    context: rootContext,
    injectedContent: '',
    activatedNeurons: [],
    requestedFiles: [],
  };
}
