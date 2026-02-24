/**
 * Request Service
 * Handles async request processing with promiseId and ownership enforcement
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { getCorrelationId } from '../utils/context.js';

const prisma = new PrismaClient();

export type RequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface CreateRequestData {
  clientId: string;
  context: Record<string, unknown>;
  message?: string;
  codeBlocks?: Array<{ path: string; content: string }>;
  priority?: number;
}

export interface RequestResult {
  id: string;
  promiseId: string;
  clientId: string;
  correlationId: string | null;
  status: RequestStatus;
  priority: number;
  context: Record<string, unknown>;
  message: string | null;
  codeBlocks: Array<{ path: string; content: string }> | null;
  result: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export class RequestService {
  /**
   * Create a new request and return promiseId
   */
  async create(data: CreateRequestData): Promise<{ promiseId: string; id: string }> {
    const req = await prisma.request.create({
      data: {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        clientId: data.clientId,
        correlationId: getCorrelationId() ?? null,
        status: 'pending',
        priority: data.priority ?? 0,
        context: data.context as PrismaClient.InputJsonValue,
        message: data.message ?? null,
        codeBlocks: data.codeBlocks ? (data.codeBlocks as PrismaClient.InputJsonValue) : undefined,
      },
    });
    logger.info('Request created', { requestId: req.id, promiseId: req.promiseId, clientId: data.clientId });
    return { promiseId: req.promiseId, id: req.id };
  }

  /**
   * Get request status by promiseId with ownership check
   */
  async getStatus(promiseId: string, clientId: string) {
    return prisma.request.findFirst({
      where: { promiseId, clientId },
      select: {
        promiseId: true,
        status: true,
        priority: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        error: true,
      },
    });
  }

  /**
   * Get full result with ownership check
   */
  async getResult(promiseId: string, clientId: string): Promise<RequestResult | null> {
    const req = await prisma.request.findFirst({
      where: { promiseId, clientId },
    });

    if (!req) return null;
    return {
      id: req.id,
      promiseId: req.promiseId,
      clientId: req.clientId,
      correlationId: req.correlationId,
      status: req.status as RequestStatus,
      priority: req.priority,
      context: req.context as Record<string, unknown>,
      message: req.message,
      codeBlocks: req.codeBlocks as Array<{ path: string; content: string }> | null,
      result: req.result as Record<string, unknown> | null,
      error: req.error as Record<string, unknown> | null,
      createdAt: req.createdAt,
      startedAt: req.startedAt,
      completedAt: req.completedAt,
    };
  }

  /**
   * Update request status (internal use by worker)
   */
  async updateStatus(
    promiseId: string,
    status: RequestStatus,
    result?: Record<string, unknown>,
    error?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const now = new Date();
      const data: any = { status };
      
      if (status === 'processing') data.startedAt = now;
      if (status === 'completed' || status === 'failed') data.completedAt = now;
      if (result !== undefined) data.result = result as PrismaClient.InputJsonValue;
      if (error !== undefined) data.error = error as PrismaClient.InputJsonValue;

      await prisma.request.updateMany({
        where: { promiseId },
        data,
      });

      logger.info('Request status updated', { promiseId, status });
      return true;
    } catch (err) {
      logger.error('Failed to update request status', { promiseId, error: String(err) });
      return false;
    }
  }

  /**
   * Cancel a pending request with ownership check
   */
  async cancel(promiseId: string, clientId: string): Promise<boolean> {
    const result = await prisma.request.updateMany({
      where: { promiseId, clientId, status: 'pending' },
      data: { status: 'cancelled', error: { code: 'CANCELLED', message: 'Cancelled by user' } as any },
    });
    return result.count > 0;
  }

  /**
   * Cancel all pending requests for a client
   */
  async cancelAllPending(clientId: string): Promise<{ cancelledCount: number }> {
    const result = await prisma.request.updateMany({
      where: { clientId, status: 'pending' },
      data: { status: 'cancelled', error: { code: 'CANCELLED', message: 'Queue cleared' } as any },
    });
    return { cancelledCount: result.count };
  }

  /**
   * Get next pending request for processing (for worker)
   */
  async getNextPending(): Promise<RequestResult | null> {
    const result = await prisma.$queryRaw<Array<{
      id: string;
      promise_id: string;
      client_id: string;
      correlation_id: string | null;
      status: string;
      priority: number;
      context: unknown;
      message_text: string | null;
      code_blocks: unknown;
      result: unknown;
      error: unknown;
      created_at: Date;
      started_at: Date | null;
      completed_at: Date | null;
    }>>`
      SELECT id, promise_id, client_id, correlation_id, status, priority, context, 
             message_text, code_blocks, result, error, created_at, started_at, completed_at
      FROM requests
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (!result || result.length === 0) return null;

    const row = result[0];
    await this.updateStatus(row.promise_id, 'processing');

    return {
      id: row.id,
      promiseId: row.promise_id,
      clientId: row.client_id,
      correlationId: row.correlation_id,
      status: row.status as RequestStatus,
      priority: row.priority,
      context: row.context as Record<string, unknown>,
      message: row.message_text,
      codeBlocks: row.code_blocks as Array<{ path: string; content: string }> | null,
      result: row.result as Record<string, unknown> | null,
      error: row.error as Record<string, unknown> | null,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }

  /**
   * Get queue length
   */
  async getQueueLength(): Promise<number> {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM requests
      WHERE status = 'pending'
    `;

    return Number(result[0]?.count || 0);
  }
}

export const requestService = new RequestService();
