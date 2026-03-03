/**
 * Message Builder - Facade for specialized builders
 */

import {ContextBlock, FileBlock, ClientMessage, ServerMessage, TaskStatus, RequestContextBlock, RequestApiResult, Task} from '../types/index.js';
import {createInitialContext, createNewTaskContext, createFileRequestContext} from './context-parser.js';
import {createActionMessageBuilder, createSimulationMessageBuilder, createFormMessageBuilder, createErrorMessageBuilder, quickError} from './message-builders/index.js';

const PROTOCOL_VERSION = '1.0';

export type BuilderType = 'action' | 'simulation' | 'form' | 'error';

export function createBuilder(type: BuilderType, sessionId: string) {
    switch (type) {
        case 'action': return createActionMessageBuilder(sessionId);
        case 'simulation': return createSimulationMessageBuilder(sessionId);
        case 'form': return createFormMessageBuilder(sessionId);
        case 'error': return createErrorMessageBuilder(sessionId);
        default: throw new Error(`Unknown builder type: ${type}`);
    }
}

// Client Message Builders
export const buildClientMessage = (ctx: ContextBlock, files?: FileBlock[]): ClientMessage => files?.length ? {context: ctx, files} : {context: ctx};
export const buildNewTaskMessage = (sid: string, tasks: string[], features?: string[]): ClientMessage => buildClientMessage(createNewTaskContext(sid, tasks, features));
export const buildContinueMessage = (sid: string): ClientMessage => buildClientMessage({version: PROTOCOL_VERSION, session_id: sid, continue: true});
export const buildConfirmMessage = (sid: string): ClientMessage => buildClientMessage({version: PROTOCOL_VERSION, session_id: sid, confirm: true});
export const buildFileResponseMessage = (_sid: string, files: FileBlock[], ctx: ContextBlock): ClientMessage => buildClientMessage(ctx, files);

// Server Message Builders
export const buildServerMessage = (ctx: ContextBlock, opts?: {files?: FileBlock[]; message?: string}): ServerMessage => ({
    context: ctx,
    ...(opts?.files?.length && {files: opts.files}),
    ...(opts?.message && {message: opts.message}),
});
export const buildFileRequestMessage = (sid: string, paths: string[]): ServerMessage => buildServerMessage(createFileRequestContext(sid, paths));
export const buildTaskProgressMessage = (sid: string, tid: string, prog: number, status: TaskStatus | string): ServerMessage => buildServerMessage({
    version: PROTOCOL_VERSION, session_id: sid,
    tasks: [{id: tid, type: 'analyze', status: status as TaskStatus, progress: Math.max(0, Math.min(100, prog))}],
});
export const buildErrorMessage = (sid: string, code: string, msg: string, file?: string, line?: number): ServerMessage => quickError(sid, code, msg, file, line);
export const buildSessionCompleteMessage = (sid: string, summary: string): ServerMessage => buildServerMessage({
    version: PROTOCOL_VERSION, session_id: sid,
    tasks: [{id: 'session', type: 'analyze', status: 'completed', progress: 100}],
}, {message: summary});
export const buildAckMessage = (sid: string, msg?: string): ServerMessage => buildServerMessage(createInitialContext(sid), {message: msg ?? 'Acknowledged'});
export const buildNeuronActivationMessage = (sid: string, neurons: string[], content?: string): ServerMessage => buildServerMessage({
    version: PROTOCOL_VERSION, session_id: sid, architectural_features: neurons,
}, content ? {message: content} : undefined);

// Serialization
export const serializeMessage = (msg: ClientMessage | ServerMessage): string => JSON.stringify(msg);
export const parseMessage = (data: string): ClientMessage | ServerMessage => JSON.parse(data);
export const parseMessageSafe = (data: string): ClientMessage | ServerMessage | null => { try { return parseMessage(data); } catch { return null; } };

// Validation
export const validateMessage = (msg: unknown): {valid: boolean; errors: string[]} => {
    const errors: string[] = [];
    if (typeof msg !== 'object' || msg === null) return {valid: false, errors: ['Message must be an object']};
    const m = msg as Record<string, unknown>;
    if (!m['context']) errors.push('context is required');
    if (m['files'] !== undefined && !Array.isArray(m['files'])) errors.push('files must be an array');
    if (m['message'] !== undefined && typeof m['message'] !== 'string') errors.push('message must be a string');
    return {valid: errors.length === 0, errors};
};
export const isValidMessage = (msg: unknown): msg is ClientMessage | ServerMessage => typeof msg === 'object' && msg !== null && 'context' in msg;

// Utilities
export const isClientMessage = (msg: ClientMessage | ServerMessage): msg is ClientMessage => !('message' in msg && typeof msg['message'] === 'string');
export const isServerMessage = (msg: ClientMessage | ServerMessage): msg is ServerMessage => 'message' in msg || !('files' in msg);
export const getSessionId = (msg: ClientMessage | ServerMessage): string => msg.context.session_id;
export const cloneMessage = <T extends ClientMessage | ServerMessage>(msg: T): T => JSON.parse(JSON.stringify(msg));
export const updateMessageContext = <T extends ClientMessage | ServerMessage>(msg: T, updates: Partial<ContextBlock>): T => ({
    ...msg, context: {...msg.context, ...updates, version: PROTOCOL_VERSION}
});

// Request API Builders
export const buildRequestContextBlock = (opts: {
    tasks?: Task[]; requestFiles?: string[]; architecturalFeatures?: string[];
    graph?: {entities: unknown[]; relations: unknown[]}; frameworks?: Record<string, unknown>; newTask?: string[];
}): RequestContextBlock => ({
    ...(opts.tasks?.length && {tasks: opts.tasks}),
    ...(opts.requestFiles?.length && {request_files: opts.requestFiles}),
    ...(opts.architecturalFeatures?.length && {architectural_features: opts.architecturalFeatures}),
    ...(opts.graph && {graph: opts.graph}),
    ...(opts.frameworks && {frameworks: opts.frameworks}),
    ...(opts.newTask?.length && {new_task: opts.newTask}),
});

export const buildRequestApiResult = (opts: {
    outcome: 'completed' | 'graph_incomplete' | 'failed'; message?: string; context?: RequestContextBlock;
    questions?: string[]; missing?: string[];
    graphStats?: {entityCount: number; relationCount: number; entityTypes: Record<string, number>};
    activatedNeuronIds?: string[]; injectedContent?: string[]; error?: {code: string; message: string};
}): RequestApiResult => ({
    outcome: opts.outcome,
    ...(opts.message && {message: opts.message}),
    ...(opts.context && {context: opts.context}),
    ...(opts.questions?.length && {questions: opts.questions}),
    ...(opts.missing?.length && {missing: opts.missing}),
    ...(opts.graphStats && {graph_stats: opts.graphStats}),
    ...(opts.activatedNeuronIds?.length && {activated_neuron_ids: opts.activatedNeuronIds}),
    ...(opts.injectedContent?.length && {injected_content: opts.injectedContent}),
    ...(opts.error && {error: opts.error}),
});

// Re-exports from specialized builders
export {
    createActionMessageBuilder, createSimulationMessageBuilder, createFormMessageBuilder, createErrorMessageBuilder, quickError,
    createActionClientMessageBuilder, createFormResponseMessageBuilder,
} from './message-builders/index.js';
