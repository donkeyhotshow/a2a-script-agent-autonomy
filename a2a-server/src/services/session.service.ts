/**
 * Session Service
 * CRUD operations for sessions
 */

import { PrismaClient, SessionStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export interface CreateSessionData {
  projectId: string;
  title?: string;
  context?: Record<string, unknown>;
}

export interface UpdateSessionData {
  title?: string;
  status?: SessionStatus;
  context?: Record<string, unknown>;
}

export interface SessionWithMessages {
  id: string;
  projectId: string;
  title: string | null;
  status: SessionStatus;
  context: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  messages: Array<{
    id: string;
    direction: string;
    role: string | null;
    content: Record<string, unknown>;
    contentText: string | null;
    promiseId: string | null;
    status: string | null;
    createdAt: Date;
  }>;
}

export class SessionService {
  /**
   * Ensure project exists (create if missing, for dev/client project IDs)
   */
  private async ensureProject(projectId: string): Promise<void> {
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (existing) return;
    const client = await prisma.client.findFirst();
    if (!client) throw new Error('No client in DB - run: npx prisma db seed');
    await prisma.project.create({
      data: {
        id: projectId,
        clientId: client.id,
        name: projectId,
        gitUrl: 'file://.',
        branch: 'main',
        status: 'PENDING_CLONE',
      },
    });
  }

  /**
   * Create a new session
   */
  async create(data: CreateSessionData): Promise<{
    id: string;
    projectId: string;
    title: string | null;
    status: SessionStatus;
    createdAt: Date;
  }> {
    await this.ensureProject(data.projectId);
    const session = await prisma.session.create({
      data: {
        id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId: data.projectId,
        title: data.title || 'New Session',
        status: SessionStatus.CREATED,
        context: data.context || {},
      },
    });

    logger.info('Session created', { sessionId: session.id, projectId: data.projectId });
    return {
      id: session.id,
      projectId: session.projectId,
      title: session.title,
      status: session.status,
      createdAt: session.createdAt,
    };
  }

  /**
   * Get session by ID with messages
   */
  async getById(sessionId: string): Promise<SessionWithMessages | null> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) return null;

    return {
      id: session.id,
      projectId: session.projectId,
      title: session.title,
      status: session.status,
      context: session.context as Record<string, unknown> | null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      completedAt: session.completedAt,
      messages: session.messages.map(m => ({
        id: m.id,
        direction: m.direction,
        role: m.role,
        content: m.content as Record<string, unknown>,
        contentText: m.contentText,
        promiseId: m.promiseId,
        status: m.status,
        createdAt: m.createdAt,
      })),
    };
  }

  /**
   * Get sessions by project ID
   */
  async getByProjectId(
    projectId: string,
    options?: { status?: SessionStatus; limit?: number; offset?: number }
  ): Promise<SessionWithMessages[]> {
    const sessions = await prisma.session.findMany({
      where: {
        projectId,
        ...(options?.status && { status: options.status }),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Only get last message for preview
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return sessions.map(s => ({
      id: s.id,
      projectId: s.projectId,
      title: s.title,
      status: s.status,
      context: s.context as Record<string, unknown> | null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      completedAt: s.completedAt,
      messages: s.messages.map(m => ({
        id: m.id,
        direction: m.direction,
        role: m.role,
        content: m.content as Record<string, unknown>,
        contentText: m.contentText,
        promiseId: m.promiseId,
        status: m.status,
        createdAt: m.createdAt,
      })),
    }));
  }

  /**
   * Update session
   */
  async update(
    sessionId: string,
    data: UpdateSessionData
  ): Promise<{
    id: string;
    projectId: string;
    title: string | null;
    status: SessionStatus;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    try {
      const session = await prisma.session.update({
        where: { id: sessionId },
        data,
      });

      logger.info('Session updated', { sessionId, updates: Object.keys(data) });
      return {
        id: session.id,
        projectId: session.projectId,
        title: session.title,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    } catch (error) {
      logger.error('Failed to update session', { sessionId, error: String(error) });
      return null;
    }
  }

  /**
   * Delete session (soft delete by setting status to ERROR)
   */
  async delete(sessionId: string): Promise<boolean> {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: SessionStatus.ERROR },
      });

      logger.info('Session deleted', { sessionId });
      return true;
    } catch (error) {
      logger.error('Failed to delete session', { sessionId, error: String(error) });
      return false;
    }
  }

  /**
   * Hard delete session (permanent removal)
   */
  async hardDelete(sessionId: string): Promise<boolean> {
    try {
      await prisma.session.delete({
        where: { id: sessionId },
      });

      logger.info('Session hard deleted', { sessionId });
      return true;
    } catch (error) {
      logger.error('Failed to hard delete session', { sessionId, error: String(error) });
      return false;
    }
  }
}

export const sessionService = new SessionService();
