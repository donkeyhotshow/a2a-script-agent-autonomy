/**
 * Request Queue Service
 *
 * Queue-based request processing using BullMQ with Redis.
 * Supports priority queues, job persistence, and exponential backoff.
 */

import { Queue, Worker, Job, QueueEvents, FlowProducer } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import type { RequestContext, ProcessResult } from './request-processor.interfaces.js';

// ===========================================
// Types
// ===========================================

export type QueuePriority = 'high' | 'medium' | 'low';

export interface QueueJobData {
    promiseId: string;
    context: Record<string, unknown>;
    codeBlocks?: unknown[];
    message?: string;
    priority: QueuePriority;
    createdAt: number;
    retryCount: number;
}

export interface QueueMetrics {
    depth: number;
    processingTime: number;
    errorRate: number;
    retryCount: number;
    completedCount: number;
    failedCount: number;
    delayedCount: number;
    waitingCount: number;
    activeCount: number;
}

export interface QueueStats {
    byPriority: Record<QueuePriority, number>;
    total: number;
    avgProcessingTime: number;
    lastUpdated: number;
}

export type QueueEventType = 
    | 'job:completed' 
    | 'job:failed' 
    | 'job:retry' 
    | 'job:stalled'
    | 'queue:paused'
    | 'queue:resumed';

export type QueueEventHandler = (data: unknown) => void;

// ===========================================
// Configuration
// ===========================================

const QUEUE_CONFIG = {
    name: 'a2a-requests',
    priorities: {
        high: 1,
        medium: 2,
        low: 3
    },
    defaultPriority: 'medium' as QueuePriority,
    backoff: {
        type: 'exponential' as const,
        delay: 1000,
        multiplier: 2,
        maxDelay: 60000,
        maxRetries: 5
    },
    concurrency: 5,
    stalledInterval: 30000,
    maxStalledCount: 3
};

// ===========================================
// Redis Connection
// ===========================================

let redisConnection: Redis | null = null;

function getRedisConnection(): Redis {
    if (!redisConnection) {
        redisConnection = new Redis(config.redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false
        });
        
        redisConnection.on('error', (err) => {
            logger.error('[RequestQueue] Redis connection error', { error: err.message });
        });
        
        redisConnection.on('connect', () => {
            logger.info('[RequestQueue] Redis connected');
        });
    }
    return redisConnection;
}

// ===========================================
// Queue Instance
// ===========================================

let requestQueue: Queue<QueueJobData> | null = null;
let queueWorker: Worker<QueueJobData> | null = null;
let queueEvents: QueueEvents | null = null;
let flowProducer: FlowProducer | null = null;

const eventHandlers = new Map<QueueEventType, Set<QueueEventHandler>>();

// ===========================================
// Metrics
// ===========================================

const metrics: QueueMetrics = {
    depth: 0,
    processingTime: 0,
    errorRate: 0,
    retryCount: 0,
    completedCount: 0,
    failedCount: 0,
    delayedCount: 0,
    waitingCount: 0,
    activeCount: 0
};

const processingTimes: number[] = [];
const MAX_PROCESSING_TIMES = 100;

function updateMetrics(updates: Partial<QueueMetrics>): void {
    Object.assign(metrics, updates);
}

function recordProcessingTime(duration: number): void {
    processingTimes.push(duration);
    if (processingTimes.length > MAX_PROCESSING_TIMES) {
        processingTimes.shift();
    }
    const avg = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    updateMetrics({ processingTime: avg });
}

// ===========================================
// Event Handlers
// ===========================================

function emitEvent(eventType: QueueEventType, data: unknown): void {
    const handlers = eventHandlers.get(eventType);
    if (handlers) {
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (err) {
                logger.error('[RequestQueue] Event handler error', { eventType, error: String(err) });
            }
        });
    }
}

export function onQueueEvent(eventType: QueueEventType, handler: QueueEventHandler): () => void {
    if (!eventHandlers.has(eventType)) {
        eventHandlers.set(eventType, new Set());
    }
    eventHandlers.get(eventType)!.add(handler);
    
    return () => {
        eventHandlers.get(eventType)?.delete(handler);
    };
}

// ===========================================
// Job Processing
// ===========================================

export type JobProcessor = (job: Job<QueueJobData>) => Promise<ProcessResult>;

let jobProcessor: JobProcessor | null = null;

export function setJobProcessor(processor: JobProcessor): void {
    jobProcessor = processor;
}

async function processJob(job: Job<QueueJobData>): Promise<ProcessResult> {
    const startTime = Date.now();
    
    if (!jobProcessor) {
        throw new Error('No job processor configured');
    }
    
    try {
        logger.info('[RequestQueue] Processing job', { 
            jobId: job.id, 
            promiseId: job.data.promiseId,
            priority: job.data.priority,
            attempt: job.attemptsMade + 1
        });
        
        const result = await jobProcessor(job);
        
        const duration = Date.now() - startTime;
        recordProcessingTime(duration);
        
        logger.info('[RequestQueue] Job completed', { 
            jobId: job.id, 
            promiseId: job.data.promiseId,
            duration,
            outcome: result.outcome
        });
        
        metrics.completedCount++;
        emitEvent('job:completed', { jobId: job.id, result, duration });
        
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        recordProcessingTime(duration);
        metrics.failedCount++;
        
        logger.error('[RequestQueue] Job failed', { 
            jobId: job.id, 
            promiseId: job.data.promiseId,
            duration,
            error: error instanceof Error ? error.message : String(error)
        });
        
        emitEvent('job:failed', { jobId: job.id, error, duration });
        throw error;
    }
}

// ===========================================
// Queue Management
// ===========================================

export function initializeQueue(): Queue<QueueJobData> {
    if (requestQueue) {
        return requestQueue;
    }
    
    const connection = getRedisConnection();
    
    requestQueue = new Queue<QueueJobData>(QUEUE_CONFIG.name, {
        connection,
        defaultJobOptions: {
            attempts: QUEUE_CONFIG.backoff.maxRetries,
            backoff: {
                type: QUEUE_CONFIG.backoff.type,
                delay: QUEUE_CONFIG.backoff.delay
            },
            removeOnComplete: 100,
            removeOnFail: 50
        }
    });
    
    // Initialize worker
    queueWorker = new Worker<QueueJobData>(QUEUE_CONFIG.name, processJob, {
        connection,
        concurrency: QUEUE_CONFIG.concurrency,
        stalledInterval: QUEUE_CONFIG.stalledInterval,
        maxStalledCount: QUEUE_CONFIG.maxStalledCount
    });
    
    // Initialize queue events
    queueEvents = new QueueEvents(QUEUE_CONFIG.name, { connection });
    
    // Setup event listeners
    queueWorker.on('completed', (job) => {
        logger.debug('[RequestQueue] Worker completed', { jobId: job.id });
    });
    
    queueWorker.on('failed', (job, err) => {
        logger.warn('[RequestQueue] Worker failed', { jobId: job?.id, error: err.message });
        if (job) {
            metrics.retryCount++;
            emitEvent('job:retry', { jobId: job.id, attempt: job.attemptsMade, error: err.message });
        }
    });
    
    queueWorker.on('stalled', (jobId) => {
        logger.warn('[RequestQueue] Job stalled', { jobId });
        emitEvent('job:stalled', { jobId });
    });
    
    queueEvents.on('waiting', ({ jobId }) => {
        logger.debug('[RequestQueue] Job waiting', { jobId });
    });
    
    logger.info('[RequestQueue] Queue initialized', { 
        name: QUEUE_CONFIG.name,
        concurrency: QUEUE_CONFIG.concurrency 
    });
    
    return requestQueue;
}

export async function addRequestToQueue(
    request: RequestContext,
    priority: QueuePriority = QUEUE_CONFIG.defaultPriority
): Promise<Job<QueueJobData>> {
    const queue = initializeQueue();
    
    const jobData: QueueJobData = {
        promiseId: request.promiseId,
        context: request.context,
        codeBlocks: request.codeBlocks,
        message: request.message,
        priority,
        createdAt: Date.now(),
        retryCount: 0
    };
    
    const job = await queue.add(
        `request-${request.promiseId}`,
        jobData,
        {
            priority: QUEUE_CONFIG.priorities[priority],
            jobId: request.promiseId
        }
    );
    
    logger.info('[RequestQueue] Request added to queue', { 
        jobId: job.id, 
        promiseId: request.promiseId,
        priority 
    });
    
    return job;
}

export async function getQueueMetrics(): Promise<QueueMetrics> {
    if (!requestQueue) {
        return { ...metrics };
    }
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        requestQueue.getWaitingCount(),
        requestQueue.getActiveCount(),
        requestQueue.getCompletedCount(),
        requestQueue.getFailedCount(),
        requestQueue.getDelayedCount()
    ]);
    
    const total = waiting + active + delayed;
    const errorRate = completed + failed > 0 ? failed / (completed + failed) : 0;
    
    const currentMetrics: QueueMetrics = {
        depth: total,
        processingTime: metrics.processingTime,
        errorRate,
        retryCount: metrics.retryCount,
        completedCount: completed,
        failedCount: failed,
        delayedCount: delayed,
        waitingCount: waiting,
        activeCount: active
    };
    
    return currentMetrics;
}

export async function getQueueStats(): Promise<QueueStats> {
    const jobs = await requestQueue?.getJobs(['waiting', 'active', 'delayed']) || [];
    
    const byPriority: Record<QueuePriority, number> = { high: 0, medium: 0, low: 0 };
    jobs.forEach(job => {
        const priority = job.data.priority || 'medium';
        byPriority[priority]++;
    });
    
    return {
        byPriority,
        total: jobs.length,
        avgProcessingTime: metrics.processingTime,
        lastUpdated: Date.now()
    };
}

export async function pauseQueue(): Promise<void> {
    await requestQueue?.pause();
    emitEvent('queue:paused', { timestamp: Date.now() });
    logger.info('[RequestQueue] Queue paused');
}

export async function resumeQueue(): Promise<void> {
    await requestQueue?.resume();
    emitEvent('queue:resumed', { timestamp: Date.now() });
    logger.info('[RequestQueue] Queue resumed');
}

export async function drainQueue(): Promise<void> {
    logger.info('[RequestQueue] Draining queue...');
    
    // Wait for active jobs to complete
    if (queueWorker) {
        await queueWorker.pause();
        
        // Wait for active jobs with timeout
        const startTime = Date.now();
        const timeout = 30000; // 30 seconds
        
        while (Date.now() - startTime < timeout) {
            const activeCount = await requestQueue?.getActiveCount() || 0;
            if (activeCount === 0) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    logger.info('[RequestQueue] Queue drained');
}

export async function closeQueue(): Promise<void> {
    logger.info('[RequestQueue] Closing queue...');
    
    await drainQueue();
    
    await queueWorker?.close();
    await queueEvents?.close();
    await requestQueue?.close();
    
    if (redisConnection) {
        await redisConnection.quit();
        redisConnection = null;
    }
    
    requestQueue = null;
    queueWorker = null;
    queueEvents = null;
    
    logger.info('[RequestQueue] Queue closed');
}

export function isQueueInitialized(): boolean {
    return requestQueue !== null;
}

// ===========================================
// Job Management
// ===========================================

export async function getJob(promiseId: string): Promise<Job<QueueJobData> | undefined> {
    return await requestQueue?.getJob(promiseId) || undefined;
}

export async function removeJob(promiseId: string): Promise<boolean> {
    const job = await getJob(promiseId);
    if (job) {
        await job.remove();
        logger.info('[RequestQueue] Job removed', { promiseId });
        return true;
    }
    return false;
}

export async function retryJob(promiseId: string): Promise<boolean> {
    const job = await getJob(promiseId);
    if (job && job.failedReason) {
        await job.retry();
        logger.info('[RequestQueue] Job retried', { promiseId });
        return true;
    }
    return false;
}

export async function getJobStatus(promiseId: string): Promise<string | null> {
    const job = await getJob(promiseId);
    if (!job) return null;
    
    const state = await job.getState();
    return state;
}

// ===========================================
// Batch Operations
// ===========================================

export async function addBatchRequests(
    requests: Array<{ request: RequestContext; priority?: QueuePriority }>
): Promise<Job<QueueJobData>[]> {
    const queue = initializeQueue();
    
    const jobs = await Promise.all(
        requests.map(({ request, priority }) => 
            addRequestToQueue(request, priority || QUEUE_CONFIG.defaultPriority)
        )
    );
    
    logger.info('[RequestQueue] Batch requests added', { count: jobs.length });
    return jobs;
}

export async function cleanQueue(status: 'completed' | 'failed', maxAge?: number): Promise<void> {
    if (!requestQueue) return;
    
    await requestQueue.clean(maxAge || 3600000, status, 100);
    logger.info('[RequestQueue] Queue cleaned', { status, maxAge });
}
