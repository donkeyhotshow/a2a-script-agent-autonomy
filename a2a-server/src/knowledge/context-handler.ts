/**
 * Context Handler
 * Main orchestrator for context formation and neuron activation
 * 
 * Flow:
 * 1. Client sends Root Context → activates first neurons
 * 2. Neurons inject their knowledge via @INJECT
 * 3. Server returns context with active neurons
 */

import { activateNeurons } from './neurons/neuron-activator.js';
import {
  resolveInjections,
  resolveRequestFiles,
  mergeInjectedContext,
} from './context-injector.js';
import { registerContextBlock } from './context-store.js';
import type { ContextBlock, FileBlock, Task, TaskType } from '../types/index.js';
import type { ActivationContext, ActivatedNeuron } from './neurons/neuron.types.js';

// ============================================
// Types
// ============================================

/**
 * ADR (Architecture Decision Record)
 */
export interface ADR {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  date: string;
  context?: string;
  decision?: string;
  consequences?: string;
}

/**
 * Directory Tree Node (1 level deep)
 */
export interface DirectoryTreeNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: DirectoryTreeNode[]; // Only for directories, 1 level
}

/**
 * Root Context — первое что отправляет клиент при начале сессии
 * Активирует первые нейроны
 */
export interface RootContext {
  projectName: string;
  projectType: string;
  detectedAt: string;
  // ADR — Architecture Decision Records
  adrs: ADR[];
  // Directory tree — 1 level deep
  directoryTree: DirectoryTreeNode[];
  frameworks: {
    frontend?: string[];
    backend?: string[];
    testing?: string[];
  };
  libraries: Record<string, string[]>;
  architecture: {
    type: string;
    patterns: string[];
    structure: Record<string, string>;
  };
  metrics?: {
    features?: number;
    controllers?: number;
    models?: number;
    vueComponents?: number;
    tests?: number;
    coverage?: string;
  };
  detectors?: Record<string, {
    found: boolean;
    files?: string[];
    count?: number;
    version?: string;
  }>;
}

/**
 * File Masks — маски для поиска файлов
 */
export interface FileMasks {
  projectName: string;
  updatedAt: string;
  masks: Record<string, {
    pattern: string;
    exclude: string[];
    purpose: string;
    count?: number;
  }>;
}

/**
 * Active Actions — активные действия
 */
export interface ActiveAction {
  actionId: string;
  categoryId: string;
  executorSystemId: 'script' | 'ollama' | 'agent';
  enabled: boolean;
  reason: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ActiveActions {
  projectName: string;
  updatedAt: string;
  totalActions: number;
  actions: ActiveAction[];
  actionsByCategory?: Record<string, number>;
  actionsByExecutor?: Record<string, number>;
  actionsByPriority?: Record<string, number>;
}

/**
 * Session Context — состояние сессии
 */
export interface SessionContext {
  sessionId: string;
  projectId: string;
  rootContext: RootContext | null;
  fileMasks: FileMasks | null;
  activeActions: ActiveActions | null;
  context: ContextBlock;
  activatedNeurons: ActivatedNeuron[];
  history: ContextBlock[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result of context handling
 */
export interface ContextHandlerResult {
  context: ContextBlock;
  injectedContent: string;
  activatedNeurons: ActivatedNeuron[];
  requestedFiles?: string[];
  actions?: ActiveAction[];
}

// ============================================
// Session Store (in-memory for now)
// ============================================

const sessions = new Map<string, SessionContext>();

/**
 * Create new session context
 */
export function createSessionContext(sessionId: string, projectId: string): SessionContext {
  const now = new Date();
  const sessionContext: SessionContext = {
    sessionId,
    projectId,
    rootContext: null,
    fileMasks: null,
    activeActions: null,
    context: {
      version: '1.0',
      session_id: sessionId,
    },
    activatedNeurons: [],
    history: [],
    createdAt: now,
    updatedAt: now,
  };
  
  sessions.set(sessionId, sessionContext);
  return sessionContext;
}

/**
 * Get session context
 */
export function getSessionContext(sessionId: string): SessionContext | null {
  return sessions.get(sessionId) ?? null;
}

/**
 * Update session context
 */
export function updateSessionContext(sessionId: string, updates: Partial<SessionContext>): SessionContext | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  const updated = {
    ...session,
    ...updates,
    updatedAt: new Date(),
  };
  
  sessions.set(sessionId, updated);
  return updated;
}

/**
 * Delete session context
 */
export function deleteSessionContext(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

// ============================================
// Root Context Handling
// ============================================

/**
 * Handle root context — первое сообщение от клиента
 * Активирует нейроны на основе обнаруженных фреймворков и паттернов
 */
export function handleRootContext(
  sessionId: string,
  rootContext: RootContext,
  fileMasks?: FileMasks,
  activeActions?: ActiveActions
): ContextHandlerResult {
  const session = getSessionContext(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  // Update session with root context
  updateSessionContext(sessionId, {
    rootContext,
    fileMasks: fileMasks ?? null,
    activeActions: activeActions ?? null,
  });
  
  // Build activation context from root context
  const activationContext = buildActivationContext(rootContext, fileMasks);
  
  // Activate neurons
  const activatedNeurons = activateNeurons(activationContext);
  
  // Resolve @INJECT and request_files actions
  const injectedContexts = resolveInjections(activatedNeurons);
  const injectedContent = mergeInjectedContext(injectedContexts);
  const neuronRequestedFiles = resolveRequestFiles(activatedNeurons);

  // Update session
  const updatedContext: ContextBlock = {
    version: '1.0',
    session_id: sessionId,
    architectural_features: extractArchitecturalFeatures(rootContext),
    ...(neuronRequestedFiles.length > 0 && {
      request_files: neuronRequestedFiles,
    }),
  };
  
  updateSessionContext(sessionId, {
    context: updatedContext,
    activatedNeurons,
  });
  
  const result: ContextHandlerResult = {
    context: updatedContext,
    injectedContent,
    activatedNeurons,
  };
  if (neuronRequestedFiles.length > 0) {
    result.requestedFiles = neuronRequestedFiles;
  }
  if (activeActions?.actions) {
    result.actions = activeActions.actions;
  }

  return result;
}

/**
 * Build activation context from root context
 */
function buildActivationContext(
  rootContext: RootContext,
  fileMasks?: FileMasks
): ActivationContext {
  const filePaths: string[] = [];
  const projectStructure: string[] = [];
  
  // Extract file paths from detectors
  if (rootContext.detectors) {
    for (const detector of Object.values(rootContext.detectors)) {
      if (detector.files) {
        filePaths.push(...detector.files);
      }
    }
  }
  
  // Extract structure from architecture
  if (rootContext.architecture?.structure) {
    for (const path of Object.values(rootContext.architecture.structure)) {
      projectStructure.push(path);
    }
  }
  
  // Add patterns from file masks
  if (fileMasks?.masks) {
    for (const mask of Object.values(fileMasks.masks)) {
      if (mask.pattern) {
        projectStructure.push(mask.pattern);
      }
    }
  }
  
  // Add framework indicators
  const frameworks = [
    ...(rootContext.frameworks.frontend ?? []),
    ...(rootContext.frameworks.backend ?? []),
    ...(rootContext.frameworks.testing ?? []),
  ];
  
  // Add library indicators
  const libraries = Object.values(rootContext.libraries).flat();
  
  // Add patterns
  const patterns = rootContext.architecture?.patterns ?? [];
  
  // Combine all for neuron activation
  projectStructure.push(...frameworks, ...libraries, ...patterns);
  
  return {
    filePaths,
    projectStructure,
  };
}

/**
 * Extract architectural features from root context
 */
function extractArchitecturalFeatures(rootContext: RootContext): string[] {
  const features: string[] = [];
  
  // Add frameworks
  if (rootContext.frameworks.frontend) {
    features.push(...rootContext.frameworks.frontend);
  }
  if (rootContext.frameworks.backend) {
    features.push(...rootContext.frameworks.backend);
  }
  
  // Add architecture type
  if (rootContext.architecture?.type) {
    features.push(`arch:${rootContext.architecture.type}`);
  }
  
  // Add patterns
  if (rootContext.architecture?.patterns) {
    features.push(...rootContext.architecture.patterns);
  }
  
  return features;
}

// ============================================
// Context Handling
// ============================================

/**
 * Handle incoming context from client
 */
export function handleContext(
  sessionId: string,
  incomingContext: ContextBlock,
  files?: FileBlock[]
): ContextHandlerResult {
  const session = getSessionContext(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  // Merge incoming context with existing
  const mergedContext: ContextBlock = {
    ...session.context,
    ...incomingContext,
    version: '1.0',
    session_id: sessionId,
  };
  
  // Build activation context from files
  const activationContext: ActivationContext = {
    filePaths: files?.map((f) => f.path) ?? [],
    projectStructure: [],
  };
  
  if (files && files.length > 0) {
    activationContext.fileContents = files.reduce((acc, f) => {
      acc[f.path] = f.content;
      return acc;
    }, {} as Record<string, string>);
  }
  
  // Activate neurons based on files
  const activatedNeurons = activateNeurons(activationContext);
  
  // Merge with existing activated neurons
  const allActivatedNeurons = mergeActivatedNeurons(
    session.activatedNeurons,
    activatedNeurons
  );
  
  // Resolve @INJECT and request_files actions
  const injectedContexts = resolveInjections(allActivatedNeurons);
  const injectedContent = mergeInjectedContext(injectedContexts);
  const neuronRequestedFiles = resolveRequestFiles(allActivatedNeurons);

  const allRequested = [
    ...(mergedContext.request_files ?? []),
    ...neuronRequestedFiles,
  ];
  const finalContext: ContextBlock = {
    ...mergedContext,
    ...(allRequested.length > 0 && {
      request_files: [...new Set(allRequested)],
    }),
  };

  // Update session
  updateSessionContext(sessionId, {
    context: finalContext,
    activatedNeurons: allActivatedNeurons,
    history: [...session.history, session.context],
  });

  const result: ContextHandlerResult = {
    context: finalContext,
    injectedContent,
    activatedNeurons: allActivatedNeurons,
  };
  if (neuronRequestedFiles.length > 0) {
    result.requestedFiles = neuronRequestedFiles;
  }
  return result;
}

/**
 * Merge activated neurons (deduplicate by neuron id)
 */
function mergeActivatedNeurons(
  existing: ActivatedNeuron[],
  newOnes: ActivatedNeuron[]
): ActivatedNeuron[] {
  const map = new Map<string, ActivatedNeuron>();
  
  for (const an of existing) {
    map.set(an.neuron.id, an);
  }
  
  for (const an of newOnes) {
    const existing = map.get(an.neuron.id);
    if (existing) {
      // Merge matched triggers
      const mergedTriggers = new Set([
        ...existing.matchedTriggers,
        ...an.matchedTriggers,
      ]);
      map.set(an.neuron.id, {
        neuron: an.neuron,
        matchedTriggers: Array.from(mergedTriggers),
      });
    } else {
      map.set(an.neuron.id, an);
    }
  }
  
  return Array.from(map.values());
}

// ============================================
// new_task Handling
// ============================================

/**
 * Handle new_task from client
 */
export function handleNewTask(
  sessionId: string,
  tasks: string[],
  architecturalFeatures?: string[]
): ContextHandlerResult {
  const session = getSessionContext(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  // Create Task objects
  const newTasks: Task[] = tasks.map((task, index) => ({
    id: `task_${Date.now()}_${index}`,
    type: inferTaskType(task) as TaskType,
    status: 'pending' as const,
    target: task,
    progress: 0,
  }));
  
  // Build activation context from task descriptions
  const activationContext: ActivationContext = {
    filePaths: [],
    projectStructure: architecturalFeatures ?? [],
    taskText: tasks.join(' '),
  };
  
  // Activate neurons based on tasks
  const activatedNeurons = activateNeurons(activationContext);
  
  // Merge with existing
  const allActivatedNeurons = mergeActivatedNeurons(
    session.activatedNeurons,
    activatedNeurons
  );
  
  // Resolve @INJECT and request_files actions
  const injectedContexts = resolveInjections(allActivatedNeurons);
  const injectedContent = mergeInjectedContext(injectedContexts);
  const neuronRequestedFiles = resolveRequestFiles(allActivatedNeurons);

  // Update context with tasks
  const updatedContext: ContextBlock = {
    ...session.context,
    new_task: tasks,
    tasks: [...(session.context.tasks ?? []), ...newTasks],
    ...(architecturalFeatures && {
      architectural_features: architecturalFeatures,
    }),
    ...(neuronRequestedFiles.length > 0 && {
      request_files: [
        ...new Set([
          ...(session.context.request_files ?? []),
          ...neuronRequestedFiles,
        ]),
      ],
    }),
  };

  // Update session
  updateSessionContext(sessionId, {
    context: updatedContext,
    activatedNeurons: allActivatedNeurons,
    history: [...session.history, session.context],
  });

  const result: ContextHandlerResult = {
    context: updatedContext,
    injectedContent,
    activatedNeurons: allActivatedNeurons,
  };
  if (neuronRequestedFiles.length > 0) {
    result.requestedFiles = neuronRequestedFiles;
  }
  return result;
}

/**
 * Infer task type from task description
 */
function inferTaskType(task: string): string {
  const lowerTask = task.toLowerCase();
  
  if (lowerTask.includes('test') || lowerTask.includes('spec')) {
    return 'test';
  }
  if (lowerTask.includes('refactor')) {
    return 'refactor';
  }
  if (lowerTask.includes('fix') || lowerTask.includes('bug')) {
    return 'fix';
  }
  if (lowerTask.includes('document') || lowerTask.includes('doc')) {
    return 'document';
  }
  if (lowerTask.includes('create') || lowerTask.includes('add') || lowerTask.includes('implement')) {
    return 'create';
  }
  if (lowerTask.includes('delete') || lowerTask.includes('remove')) {
    return 'delete';
  }
  
  return 'analyze';
}

export interface ProcessNewTaskResult {
  context: Record<string, unknown>;
  activatedNeurons: ActivatedNeuron[];
}

/**
 * Stateless: process new_task → tasks via neurons.
 * Used by Request API (no session).
 * Activates neurons from codeBlocks paths + architectural_features,
 * converts new_task strings to Task[], moves into context.tasks, clears new_task.
 */
export function processNewTaskToContext(
  context: Record<string, unknown>,
  codeBlocks: Array<{ path: string; content?: string }>
): ProcessNewTaskResult {
  const newTask = context['new_task'] as string[] | undefined;
  if (!newTask?.length) return { context, activatedNeurons: [] };

  const projectStructure = (context['architectural_features'] as string[]) ?? [];
  const fileContents = codeBlocks.length
    ? Object.fromEntries(codeBlocks.map((c) => [c.path, c.content ?? '']))
    : undefined;
  const activationContext: ActivationContext = {
    filePaths: codeBlocks.map((c) => c.path),
    fileContents,
    projectStructure,
    taskText: newTask.join(' '),
  };
  let activated: ActivatedNeuron[];
  try {
    activated = activateNeurons(activationContext);
  } catch {
    activated = [];
  }
  const neuronRequestedFiles = resolveRequestFiles(activated);

  const existingTasks = (context['tasks'] as Task[]) ?? [];
  const newTasks: Task[] = newTask.map((task, index) => ({
    id: `task_${Date.now()}_${index}`,
    type: inferTaskType(task) as TaskType,
    status: 'pending' as const,
    target: task,
    progress: 0,
  }));

  const result: Record<string, unknown> = {
    ...context,
    tasks: [...existingTasks, ...newTasks],
    new_task: [],
  };
  if (neuronRequestedFiles.length > 0) {
    const existing = (context['request_files'] as string[]) ?? [];
    result.request_files = [...new Set([...existing, ...neuronRequestedFiles])];
  }
  return { context: result, activatedNeurons: activated };
}

// ============================================
// File Request Handling
// ============================================

/**
 * Request files from client
 */
export function requestFiles(
  sessionId: string,
  paths: string[]
): ContextBlock {
  const session = getSessionContext(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  const context: ContextBlock = {
    ...session.context,
    request_files: paths,
  };
  
  updateSessionContext(sessionId, { context });
  
  return context;
}

// ============================================
// Continue & Confirm Handling
// ============================================

/**
 * Handle continue flag
 */
export function continueExecution(sessionId: string): ContextHandlerResult {
  const session = getSessionContext(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  const context: ContextBlock = {
    ...session.context,
    continue: true,
  };
  
  updateSessionContext(sessionId, { context });
  
  // Re-resolve injections
  const injectedContexts = resolveInjections(session.activatedNeurons);
  const injectedContent = mergeInjectedContext(injectedContexts);
  
  return {
    context,
    injectedContent,
    activatedNeurons: session.activatedNeurons,
  };
}

/**
 * Handle confirm flag
 */
export function confirmAction(sessionId: string): ContextHandlerResult {
  const session = getSessionContext(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  
  const context: ContextBlock = {
    ...session.context,
    confirm: true,
  };
  
  updateSessionContext(sessionId, { context });
  
  // Re-resolve injections
  const injectedContexts = resolveInjections(session.activatedNeurons);
  const injectedContent = mergeInjectedContext(injectedContexts);
  
  return {
    context,
    injectedContent,
    activatedNeurons: session.activatedNeurons,
  };
}

// ============================================
// Shadowing
// ============================================

/**
 * Apply shadowing — project standards override neuron defaults
 */
export function applyShadowing(
  projectStandards: Record<string, string>,
  neuronDefaults: Record<string, string>
): Record<string, string> {
  return { ...neuronDefaults, ...projectStandards };
}

/**
 * Register project-specific context block (for shadowing)
 */
export function registerProjectContext(
  projectId: string,
  id: string,
  content: string
): void {
  const contextId = `project-${projectId}-${id}`;
  registerContextBlock(contextId, content, { allowOverwriteBuiltin: false });
}

// ============================================
// Neuron Sequence Restoration
// ============================================

/**
 * Restore neuron sequence from session history
 */
export function restoreNeuronSequence(sessionId: string): ActivatedNeuron[] {
  const session = getSessionContext(sessionId);
  if (!session) {
    return [];
  }
  
  return session.activatedNeurons;
}

/**
 * Get all active neurons for session
 */
export function getActiveNeurons(sessionId: string): ActivatedNeuron[] {
  const session = getSessionContext(sessionId);
  return session?.activatedNeurons ?? [];
}

// ============================================
// Utilities
// ============================================

/**
 * Check if session exists
 */
export function hasSession(sessionId: string): boolean {
  return sessions.has(sessionId);
}

/**
 * Get all session IDs
 */
export function getAllSessionIds(): string[] {
  return Array.from(sessions.keys());
}

/**
 * Clear all sessions (for testing)
 */
export function clearAllSessions(): void {
  sessions.clear();
}
