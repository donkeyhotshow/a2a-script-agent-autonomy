/**
 * Session Context Service
 * Wraps knowledge/context-handler for routes layer.
 * Routes → services only; no direct knowledge.
 */

import {
  createSessionContext,
  getSessionContext,
  handleRootContext,
} from '../knowledge/context-handler.js';
import type { RootContext, ContextHandlerResult } from '../knowledge/context-handler.js';

export type { RootContext, ContextHandlerResult };

export function createContext(sessionId: string, projectId: string) {
  return createSessionContext(sessionId, projectId);
}

export function getContext(sessionId: string) {
  return getSessionContext(sessionId);
}

export function handleRoot(sessionId: string, rootContext: RootContext): ContextHandlerResult {
  return handleRootContext(sessionId, rootContext);
}
