/**
 * Request Service
 * Handles async request processing with promiseId
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export type RequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface CreateRequestData {
  sessionId?: string;
  clientId: string;
  context: Record<string, unknown>;
  message?: string;
  codeBlocks?: Array<{ path: string; content: string }>;
  priority?: number;
}

export interface RequestResult {
  id: string;
  promiseId: string;
  sessionId: string | null;
  clientId: string;
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
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const promiseId = `prm_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;

    // Using raw query until Prisma client is regenerated
    await prisma.$executeRaw`
      INSERT INTO requests (id, promise_id, session_id, client_id, status, priority, context, message_text, code_blocks, created_at)
      VALUES (${id}, ${promiseId}, ${data.sessionId || null}, ${data.clientId}, 'pending', ${data.priority || 0}, 
              ${JSON.stringify(data.context)}::jsonb, ${data.message || null}, 
              ${data.codeBlocks ? JSON.stringify(data.codeBlocks) : null}, NOW())
    `;

    logger.info('Request created', { requestId: id, promiseId, clientId: data.clientId });

    return { promiseId, id };
  }

  /**
   * Get request status by promiseId
   */
  async getStatus(promiseId: string): Promise<{
    promiseId: string;
    status: RequestStatus;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  } | null> {
    const result = await prisma.$queryRaw<Array<{
      promise_id: string;
      status: string;
      created_at: Date;
      started_at: Date | null;
      completed_at: Date | null;
    }>>`
      SELECT promise_id, status, created_at, started_at, completed_at
      FROM requests
      WHERE promise_id = ${promiseId}
    `;

    if (!result || result.length === 0) return null;

    const row = result[0];
    return {
      promiseId: row.promise_id,
      status: row.status as RequestStatus,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }

  /**
   * Get full request result by promiseId
   */
  async getResult(promiseId: string): Promise<RequestResult | null> {
    const result = await prisma.$queryRaw<Array<{
      id: string;
      promise_id: string;
      session_id: string | null;
      client_id: string;
      status: string;
      priority: number;
      context: any;
      message_text: string | null;
      code_blocks: any;
      result: any;
      error: any;
      created_at: Date;
      started_at: Date | null;
      completed_at: Date | null;
    }>>`
      SELECT id, promise_id, session_id, client_id, status, priority, context, 
             message_text, code_blocks, result, error, created_at, started_at, completed_at
      FROM requests
      WHERE promise_id = ${promiseId}
    `;

    if (!result || result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      promiseId: row.promise_id,
      sessionId: row.session_id,
      clientId: row.client_id,
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
   * Update request status
   */
  async updateStatus(
    promiseId: string,
    status: RequestStatus,
    result?: Record<string, unknown>,
    error?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const now = new Date();
      const startedAt = status === 'processing' ? now : null;
      const completedAt = status === 'completed' || status === 'failed' ? now : null;

      await prisma.$executeRaw`
        UPDATE requests
        SET status = ${status},
            started_at = COALESCE(${startedAt}, started_at),
            completed_at = COALESCE(${completedAt}, completed_at),
            result = COALESCE(${result ? JSON.stringify(result) : null}, result),
            error = COALESCE(${error ? JSON.stringify(error) : null}, error)
        WHERE promise_id = ${promiseId}
      `;

      logger.info('Request status updated', { promiseId, status });
      return true;
    } catch (err) {
      logger.error('Failed to update request status', { promiseId, error: String(err) });
      return false;
    }
  }

  /**
   * Cancel a pending request
   */
  async cancel(promiseId: string): Promise<boolean> {
    const status = await this.getStatus(promiseId);
    if (!status) return false;

    if (status.status !== 'pending') {
      logger.warn('Cannot cancel request - not in pending state', { promiseId, currentStatus: status.status });
      return false;
    }

    return this.updateStatus(promiseId, 'cancelled');
  }

  /**
   * Get next pending request for processing (for worker)
   */
  async getNextPending(): Promise<RequestResult | null> {
    const result = await prisma.$queryRaw<Array<{
      id: string;
      promise_id: string;
      session_id: string | null;
      client_id: string;
      status: string;
      priority: number;
      context: any;
      message_text: string | null;
      code_blocks: any;
      result: any;
      error: any;
      created_at: Date;
      started_at: Date | null;
      completed_at: Date | null;
    }>>`
      SELECT id, promise_id, session_id, client_id, status, priority, context, 
             message_text, code_blocks, result, error, created_at, started_at, completed_at
      FROM requests
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;

    if (!result || result.length === 0) return null;

    const row = result[0];
    
    // Mark as processing
    await this.updateStatus(row.promise_id, 'processing');

    return {
      id: row.id,
      promiseId: row.promise_id,
      sessionId: row.session_id,
      clientId: row.client_id,
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
