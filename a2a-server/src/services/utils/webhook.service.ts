/**
 * Webhook Service
 *
 * Manages webhook subscriptions, delivery, and retries.
 * Supports request signing for security.
 */

import { logger } from '../../utils/logger.js';
import { retryWithBackoff, calculateDelay, DEFAULT_BACKOFF_OPTIONS } from '../../utils/backoff.js';
import { config } from '../../config/index.js';
import crypto from 'crypto';

// ===========================================
// Types
// ===========================================

export interface WebhookSubscription {
    id: string;
    url: string;
    events: WebhookEventType[];
    secret: string;
    active: boolean;
    createdAt: number;
    metadata?: Record<string, unknown>;
    retryCount: number;
    lastDelivery?: number;
    lastError?: string;
}

export type WebhookEventType = 
    | 'request:created'
    | 'request:completed'
    | 'request:failed'
    | 'request:retry'
    | 'queue:depth:high'
    | 'queue:depth:critical'
    | 'system:health'
    | 'system:error';

export interface WebhookPayload {
    event: WebhookEventType;
    timestamp: number;
    data: unknown;
    subscriptionId: string;
}

export interface WebhookDelivery {
    id: string;
    subscriptionId: string;
    payload: WebhookPayload;
    status: 'pending' | 'delivered' | 'failed';
    attempts: number;
    createdAt: number;
    deliveredAt?: number;
    error?: string;
}

export interface WebhookDeliveryResult {
    success: boolean;
    statusCode?: number;
    error?: string;
    responseTime: number;
}

export type WebhookEventHandler = (payload: WebhookPayload) => void;

// ===========================================
// Configuration
// ===========================================

const WEBHOOK_CONFIG = {
    timeout: 30000,
    maxRetries: 5,
    backoff: {
        initialDelay: 1000,
        multiplier: 2,
        maxDelay: 60000
    },
    signatureHeader: 'X-Webhook-Signature',
    timestampHeader: 'X-Webhook-Timestamp',
    signatureVersion: 'v1'
};

// ===========================================
// In-Memory Storage (replace with Redis/DB in production)
// ===========================================

const subscriptions = new Map<string, WebhookSubscription>();
const deliveries = new Map<string, WebhookDelivery>();
const eventHandlers = new Map<WebhookEventType, Set<WebhookEventHandler>>();

// ===========================================
// Signature Generation
// ===========================================

/**
 * Generate HMAC signature for webhook payload
 */
export function generateSignature(
    payload: string,
    secret: string,
    timestamp: number
): string {
    const data = `${timestamp}.${payload}`;
    return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifySignature(
    payload: string,
    signature: string,
    secret: string,
    timestamp: number,
    toleranceSeconds: number = 300
): boolean {
    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > toleranceSeconds) {
        return false;
    }
    
    const expectedSignature = generateSignature(payload, secret, timestamp);
    
    // Use timing-safe comparison
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
}

// ===========================================
// Subscription Management
// ===========================================

export function createSubscription(
    url: string,
    events: WebhookEventType[],
    options: Partial<WebhookSubscription> = {}
): WebhookSubscription {
    const id = crypto.randomUUID();
    const secret = options.secret || crypto.randomBytes(32).toString('hex');
    
    const subscription: WebhookSubscription = {
        id,
        url,
        events,
        secret,
        active: true,
        createdAt: Date.now(),
        retryCount: 0,
        metadata: options.metadata
    };
    
    subscriptions.set(id, subscription);
    
    logger.info('[Webhook] Subscription created', {
        id,
        url,
        events,
        active: subscription.active
    });
    
    return subscription;
}

export function getSubscription(id: string): WebhookSubscription | undefined {
    return subscriptions.get(id);
}

export function getAllSubscriptions(): WebhookSubscription[] {
    return Array.from(subscriptions.values());
}

export function getSubscriptionsForEvent(event: WebhookEventType): WebhookSubscription[] {
    return getAllSubscriptions().filter(
        sub => sub.active && sub.events.includes(event)
    );
}

export function updateSubscription(
    id: string,
    updates: Partial<WebhookSubscription>
): WebhookSubscription | undefined {
    const subscription = subscriptions.get(id);
    if (!subscription) return undefined;
    
    Object.assign(subscription, updates);
    subscriptions.set(id, subscription);
    
    logger.info('[Webhook] Subscription updated', { id, updates });
    return subscription;
}

export function deleteSubscription(id: string): boolean {
    const deleted = subscriptions.delete(id);
    if (deleted) {
        logger.info('[Webhook] Subscription deleted', { id });
    }
    return deleted;
}

export function activateSubscription(id: string): boolean {
    return !!updateSubscription(id, { active: true });
}

export function deactivateSubscription(id: string): boolean {
    return !!updateSubscription(id, { active: false });
}

// ===========================================
// Event Handling
// ===========================================

export function onWebhookEvent(
    event: WebhookEventType,
    handler: WebhookEventHandler
): () => void {
    if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set());
    }
    eventHandlers.get(event)!.add(handler);
    
    return () => {
        eventHandlers.get(event)?.delete(handler);
    };
}

function emitLocalEvent(payload: WebhookPayload): void {
    const handlers = eventHandlers.get(payload.event);
    if (handlers) {
        handlers.forEach(handler => {
            try {
                handler(payload);
            } catch (err) {
                logger.error('[Webhook] Local event handler error', {
                    event: payload.event,
                    error: String(err)
                });
            }
        });
    }
}

// ===========================================
// Delivery
// ===========================================

async function deliverWebhook(
    subscription: WebhookSubscription,
    payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
    const startTime = Date.now();
    
    try {
        const payloadBody = JSON.stringify(payload);
        const timestamp = Math.floor(Date.now() / 1000);
        const signature = generateSignature(payloadBody, subscription.secret, timestamp);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.timeout);
        
        const response = await fetch(subscription.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [WEBHOOK_CONFIG.signatureHeader]: `${WEBHOOK_CONFIG.signatureVersion}=${signature}`,
                [WEBHOOK_CONFIG.timestampHeader]: timestamp.toString(),
                'User-Agent': 'A2A-Server-Webhook/1.0'
            },
            body: payloadBody,
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
            return {
                success: true,
                statusCode: response.status,
                responseTime
            };
        } else {
            return {
                success: false,
                statusCode: response.status,
                error: `HTTP ${response.status}: ${response.statusText}`,
                responseTime
            };
        }
    } catch (error) {
        const responseTime = Date.now() - startTime;
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            responseTime
        };
    }
}

async function deliverWithRetry(
    subscription: WebhookSubscription,
    payload: WebhookPayload
): Promise<WebhookDeliveryResult> {
    return retryWithBackoff({
        fn: () => deliverWebhook(subscription, payload),
        backoff: {
            initialDelay: WEBHOOK_CONFIG.backoff.initialDelay,
            multiplier: WEBHOOK_CONFIG.backoff.multiplier,
            maxDelay: WEBHOOK_CONFIG.backoff.maxDelay,
            maxRetries: WEBHOOK_CONFIG.maxRetries,
            jitter: true,
            jitterFactor: 0.1
        },
        retryIf: (error) => {
            // Retry on network errors and 5xx responses
            const message = error.message.toLowerCase();
            return message.includes('network') || 
                   message.includes('timeout') ||
                   message.includes('econnrefused') ||
                   message.includes('5');
        },
        onAttempt: (attempt, delay) => {
            logger.debug('[Webhook] Retry attempt', {
                subscriptionId: subscription.id,
                event: payload.event,
                attempt,
                delay
            });
        }
    });
}

export async function sendWebhook(
    event: WebhookEventType,
    data: unknown,
    options: { retry?: boolean; subscriptionId?: string } = {}
): Promise<WebhookDelivery[]> {
    const subscriptions = options.subscriptionId 
        ? [getSubscription(options.subscriptionId)].filter(Boolean) as WebhookSubscription[]
        : getSubscriptionsForEvent(event);
    
    if (subscriptions.length === 0) {
        return [];
    }
    
    const deliveries: WebhookDelivery[] = [];
    
    await Promise.all(subscriptions.map(async (subscription) => {
        const payload: WebhookPayload = {
            event,
            timestamp: Date.now(),
            data,
            subscriptionId: subscription.id
        };
        
        // Emit to local handlers
        emitLocalEvent(payload);
        
        // Create delivery record
        const delivery: WebhookDelivery = {
            id: crypto.randomUUID(),
            subscriptionId: subscription.id,
            payload,
            status: 'pending',
            attempts: 0,
            createdAt: Date.now()
        };
        
        deliveries.push(delivery);
        
        // Deliver webhook
        const deliverFn = options.retry !== false ? deliverWithRetry : deliverWebhook;
        const result = await deliverFn(subscription, payload);
        
        // Update delivery record
        delivery.attempts++;
        delivery.status = result.success ? 'delivered' : 'failed';
        if (result.success) {
            delivery.deliveredAt = Date.now();
        } else {
            delivery.error = result.error;
            subscription.retryCount++;
            subscription.lastError = result.error;
        }
        
        subscription.lastDelivery = Date.now();
        
        logger.info('[Webhook] Delivery completed', {
            deliveryId: delivery.id,
            subscriptionId: subscription.id,
            event,
            success: result.success,
            responseTime: result.responseTime
        });
    }));
    
    return deliveries;
}

// ===========================================
// Convenience Methods
// ===========================================

export function notifyRequestCreated(promiseId: string, context: unknown): Promise<WebhookDelivery[]> {
    return sendWebhook('request:created', { promiseId, context });
}

export function notifyRequestCompleted(promiseId: string, result: unknown): Promise<WebhookDelivery[]> {
    return sendWebhook('request:completed', { promiseId, result });
}

export function notifyRequestFailed(promiseId: string, error: unknown): Promise<WebhookDelivery[]> {
    return sendWebhook('request:failed', { promiseId, error });
}

export function notifyQueueDepthHigh(depth: number, threshold: number): Promise<WebhookDelivery[]> {
    return sendWebhook('queue:depth:high', { depth, threshold });
}

export function notifyQueueDepthCritical(depth: number, threshold: number): Promise<WebhookDelivery[]> {
    return sendWebhook('queue:depth:critical', { depth, threshold });
}

export function notifySystemHealth(status: string, metrics: unknown): Promise<WebhookDelivery[]> {
    return sendWebhook('system:health', { status, metrics });
}

export function notifySystemError(error: unknown, context?: unknown): Promise<WebhookDelivery[]> {
    return sendWebhook('system:error', { error, context });
}

// ===========================================
// Metrics
// ===========================================

export interface WebhookMetrics {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageResponseTime: number;
}

export function getWebhookMetrics(): WebhookMetrics {
    const allSubs = getAllSubscriptions();
    const allDeliveries = Array.from(deliveries.values());
    
    const successful = allDeliveries.filter(d => d.status === 'delivered');
    const responseTimes = successful
        .filter(d => d.deliveredAt)
        .map(d => d.deliveredAt! - d.createdAt);
    
    const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;
    
    return {
        totalSubscriptions: allSubs.length,
        activeSubscriptions: allSubs.filter(s => s.active).length,
        totalDeliveries: allDeliveries.length,
        successfulDeliveries: successful.length,
        failedDeliveries: allDeliveries.filter(d => d.status === 'failed').length,
        averageResponseTime: avgResponseTime
    };
}

// ===========================================
// Cleanup
// ===========================================

export function cleanupOldDeliveries(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let cleaned = 0;
    
    for (const [id, delivery] of deliveries) {
        if (delivery.createdAt < cutoff) {
            deliveries.delete(id);
            cleaned++;
        }
    }
    
    logger.info('[Webhook] Cleaned old deliveries', { cleaned, maxAgeMs });
    return cleaned;
}

export function clearAllSubscriptions(): void {
    subscriptions.clear();
    logger.info('[Webhook] All subscriptions cleared');
}

export function clearAllDeliveries(): void {
    deliveries.clear();
    logger.info('[Webhook] All deliveries cleared');
}
