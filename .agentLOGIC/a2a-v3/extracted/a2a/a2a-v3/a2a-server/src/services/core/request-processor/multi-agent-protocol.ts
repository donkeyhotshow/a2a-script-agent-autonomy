/**
 * Multi-Agent Protocol v2.0
 *
 * Inspired by: A2A, MCP, ACP protocols overview
 * "протокол модели контекста (MCP), протокол связи агента (ACP),
 * протокол между агентами (A2A) и протокол сети агента (ANP)"
 *
 * Standardized message format for multi-agent communication.
 *
 * Usage:
 *   When communicating with other agents in a multi-agent environment,
 *   messages MUST follow this protocol format.
 *
 * Example:
 *   {
 *     "sender_id": "agent-01",
 *     "capability": "code-execution",
 *     "payload": "...",
 *     "context_state": { ... },
 *     "status_request": "GET_CONTEXT:<key>"
 *   }
 */

import {logger} from '../../../utils/logger.js';

/**
 * Agent identifier
 */
export type AgentID = string;

/**
 * Agent capabilities
 */
export type AgentCapability =
    | 'code-execution'
    | 'file-operations'
    | 'database'
    | 'web-search'
    | 'reasoning'
    | 'memory'
    | 'planning'
    | 'coordination'
    | 'user-communication';

/**
 * Message priority
 */
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Context request types
 */
export type ContextRequestType =
    | 'GET_CONTEXT'
    | 'SET_CONTEXT'
    | 'UPDATE_CONTEXT'
    | 'DELETE_CONTEXT';

/**
 * A2A Message format v2.0
 */
export interface A2AMessage {
    /** Protocol version */
    version: '2.0';
    /** Unique message ID */
    message_id: string;
    /** Timestamp (ISO 8601) */
    timestamp: string;
    /** Sender agent ID */
    sender_id: AgentID;
    /** Target agent ID (null for broadcast) */
    target_id: AgentID | null;
    /** Sender capability specialization */
    capability: AgentCapability;
    /** Message type */
    type: A2AMessageType;
    /** Message payload */
    payload: A2APayload;
    /** Current context state (snapshot) */
    context_state?: Record<string, unknown>;
    /** Context request/response */
    context_request?: ContextRequest;
    /** Message priority */
    priority: MessagePriority;
    /** Correlation ID for tracing */
    correlation_id?: string;
    /** TTL in seconds */
    ttl?: number;
}

/**
 * A2A Message types
 */
export type A2AMessageType =
    | 'request'           // Request for action
    | 'response'         // Response to request
    | 'status'           // Status update
    | 'error'            // Error notification
    | 'handoff'          // Transfer to another agent
    | 'context_update'   // Context synchronization
    | 'heartbeat'        // Keep-alive
    | 'shutdown';        // Shutdown request

/**
 * A2A Payload
 */
export interface A2APayload {
    /** Action to perform */
    action?: string;
    /** Task description */
    task?: string;
    /** Task parameters */
    params?: Record<string, unknown>;
    /** Result of action */
    result?: unknown;
    /** Error message if applicable */
    error?: string;
    /** Status details */
    status?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Context Request
 */
export interface ContextRequest {
    /** Request type */
    type: ContextRequestType;
    /** Key to get/set */
    key: string;
    /** Value (for SET/UPDATE) */
    value?: unknown;
    /** Wait timeout in ms */
    timeout?: number;
}

/**
 * A2A Protocol Configuration
 */
const A2A_PROTOCOL_VERSION = '2.0';
const DEFAULT_TTL = 300; // 5 minutes

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create A2A Message (builder pattern)
 */
export class A2AMessageBuilder {
    private message: Partial<A2AMessage>;

    constructor(senderId: AgentID, capability: AgentCapability) {
        this.message = {
            version: A2A_PROTOCOL_VERSION,
            message_id: generateMessageId(),
            timestamp: new Date().toISOString(),
            sender_id: senderId,
            capability,
            type: 'request',
            payload: {},
            priority: 'normal',
        };
    }

    to(targetId: AgentID): this {
        this.message.target_id = targetId;
        return this;
    }

    broadcast(): this {
        this.message.target_id = null;
        return this;
    }

    request(action: string, task?: string, params?: Record<string, unknown>): this {
        this.message.type = 'request';
        this.message.payload = {
            action,
            task,
            params,
        };
        return this;
    }

    response(result: unknown, correlationId?: string): this {
        this.message.type = 'response';
        this.message.payload = { result };
        if (correlationId) {
            this.message.correlation_id = correlationId;
        }
        return this;
    }

    error(errorMessage: string, correlationId?: string): this {
        this.message.type = 'error';
        this.message.payload = { error: errorMessage };
        if (correlationId) {
            this.message.correlation_id = correlationId;
        }
        return this;
    }

    status(statusMessage: string): this {
        this.message.type = 'status';
        this.message.payload = { status: statusMessage };
        return this;
    }

    handoff(targetAgentId: AgentID, reason?: string): this {
        this.message.type = 'handoff';
        this.message.target_id = targetAgentId;
        this.message.payload = { reason };
        return this;
    }

    contextSnapshot(state: Record<string, unknown>): this {
        this.message.context_state = state;
        return this;
    }

    getContext(key: string, timeout?: number): this {
        this.message.context_request = {
            type: 'GET_CONTEXT',
            key,
            timeout,
        };
        return this;
    }

    setContext(key: string, value: unknown): this {
        this.message.context_request = {
            type: 'SET_CONTEXT',
            key,
            value,
        };
        return this;
    }

    priority(p: MessagePriority): this {
        this.message.priority = p;
        return this;
    }

    ttl(seconds: number): this {
        this.message.ttl = seconds;
        return this;
    }

    correlation(id: string): this {
        this.message.correlation_id = id;
        return this;
    }

    metadata(meta: Record<string, unknown>): this {
        this.message.payload.metadata = meta;
        return this;
    }

    build(): A2AMessage {
        // Ensure required fields
        if (!this.message.message_id) {
            this.message.message_id = generateMessageId();
        }
        if (!this.message.timestamp) {
            this.message.timestamp = new Date().toISOString();
        }
        if (this.message.ttl === undefined) {
            this.message.ttl = DEFAULT_TTL;
        }

        return this.message as A2AMessage;
    }
}

/**
 * A2A Protocol Handler
 */
export class A2AProtocolHandler {
    /**
     * Parse incoming A2A message
     */
    static parse(raw: unknown): A2AMessage | null {
        try {
            const msg = raw as A2AMessage;

            // Validate required fields
            if (!msg.version || !msg.message_id || !msg.sender_id || !msg.capability || !msg.type) {
                logger.warn('[A2AProtocol] Invalid message: missing required fields');
                return null;
            }

            // Check version compatibility
            if (msg.version !== A2A_PROTOCOL_VERSION) {
                logger.warn(`[A2AProtocol] Version mismatch: ${msg.version} != ${A2A_PROTOCOL_VERSION}`);
            }

            return msg;
        } catch (error) {
            logger.error('[A2AProtocol] Parse error:', error);
            return null;
        }
    }

    /**
     * Validate A2A message
     */
    static validate(message: A2AMessage): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!message.version) {
            errors.push('Missing version');
        }
        if (!message.message_id) {
            errors.push('Missing message_id');
        }
        if (!message.sender_id) {
            errors.push('Missing sender_id');
        }
        if (!message.capability) {
            errors.push('Missing capability');
        }
        if (!message.type) {
            errors.push('Missing message type');
        }
        if (!message.payload) {
            errors.push('Missing payload');
        }

        // Check TTL
        if (message.ttl !== undefined && message.ttl <= 0) {
            errors.push('TTL must be positive');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Check if message should trigger handoff
     */
    static shouldHandoff(message: A2AMessage): boolean {
        // Check confidence threshold
        if (message.context_state?.['confidence'] !== undefined) {
            const confidence = message.context_state['confidence'] as number;
            if (confidence < 0.7) {
                return true;
            }
        }

        // Check if explicitly marked as handoff
        if (message.type === 'handoff') {
            return true;
        }

        // Check for error responses that need escalation
        if (message.type === 'error') {
            const error = message.payload.error || '';
            if (error.toLowerCase().includes('unauthorized') ||
                error.toLowerCase().includes('forbidden') ||
                error.toLowerCase().includes('critical')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract context from message
     */
    static extractContext(message: A2AMessage): Record<string, unknown> {
        return message.context_state || {};
    }

    /**
     * Handle context request from message
     */
    static handleContextRequest(
        message: A2AMessage,
        currentContext: Record<string, unknown>
    ): ContextRequest | null {
        if (!message.context_request) {
            return null;
        }

        const { type, key, value } = message.context_request;

        switch (type) {
            case 'GET_CONTEXT':
                // Just return the request for processing
                return message.context_request;

            case 'SET_CONTEXT':
                currentContext[key] = value;
                return {
                    type: 'SET_CONTEXT',
                    key,
                    value: currentContext[key],
                };

            case 'UPDATE_CONTEXT':
                if (typeof currentContext[key] === 'object') {
                    Object.assign(currentContext[key] as object, value as object);
                }
                return {
                    type: 'UPDATE_CONTEXT',
                    key,
                    value: currentContext[key],
                };

            case 'DELETE_CONTEXT':
                delete currentContext[key];
                return {
                    type: 'DELETE_CONTEXT',
                    key,
                };

            default:
                return null;
        }
    }

    /**
     * Format message for logging
     */
    static formatForLog(message: A2AMessage): string {
        return `[A2A ${message.type.toUpperCase()}] ${message.sender_id} -> ${message.target_id || 'BROADCAST'}: ${JSON.stringify(message.payload).substring(0, 100)}`;
    }
}

/**
 * A2A Message Router
 */
export class A2AMessageRouter {
    private handlers: Map<string, (msg: A2AMessage) => Promise<A2AMessage | null>> = new Map();
    private agentCapabilities: Map<AgentID, AgentCapability[]> = new Map();

    /**
     * Register a handler for a message type
     */
    registerHandler(type: A2AMessageType, handler: (msg: A2AMessage) => Promise<A2AMessage | null>): void {
        this.handlers.set(type, handler);
    }

    /**
     * Register agent capability
     */
    registerAgent(agentId: AgentID, capabilities: AgentCapability[]): void {
        this.agentCapabilities.set(agentId, capabilities);
    }

    /**
     * Find agents by capability
     */
    findAgentsByCapability(capability: AgentCapability): AgentID[] {
        const result: AgentID[] = [];
        for (const [agentId, capabilities] of this.agentCapabilities.entries()) {
            if (capabilities.includes(capability)) {
                result.push(agentId);
            }
        }
        return result;
    }

    /**
     * Route message to appropriate handler
     */
    async route(message: A2AMessage): Promise<A2AMessage | null> {
        const handler = this.handlers.get(message.type);
        if (!handler) {
            logger.warn(`[A2ARouter] No handler for message type: ${message.type}`);
            return null;
        }

        try {
            return await handler(message);
        } catch (error) {
            logger.error(`[A2ARouter] Handler error:`, error);
            return A2AMessageBuilder
                .createResponse(message.sender_id, 'reasoning')
                .error(`Handler error: ${error}`)
                .correlation(message.message_id)
                .build();
        }
    }
}

/**
 * Helper function to create request message
 */
export function createA2ARequest(
    senderId: AgentID,
    capability: AgentCapability,
    action: string,
    task?: string,
    params?: Record<string, unknown>
): A2AMessage {
    return new A2AMessageBuilder(senderId, capability)
        .request(action, task, params)
        .build();
}

/**
 * Helper function to create response message
 */
export function createA2AResponse(
    senderId: AgentID,
    capability: AgentCapability,
    result: unknown,
    correlationId?: string
): A2AMessage {
    return new A2AMessageBuilder(senderId, capability)
        .response(result, correlationId)
        .build();
}

/**
 * Helper function to create handoff message
 */
export function createA2AHandoff(
    senderId: AgentID,
    targetId: AgentID,
    reason?: string
): A2AMessage {
    return new A2AMessageBuilder(senderId, 'coordination')
        .handoff(targetId, reason)
        .priority('high')
        .build();
}

/**
 * Helper function to create error message
 */
export function createA2AError(
    senderId: AgentID,
    capability: AgentCapability,
    errorMessage: string,
    correlationId?: string
): A2AMessage {
    return new A2AMessageBuilder(senderId, capability)
        .error(errorMessage, correlationId)
        .priority('high')
        .build();
}
