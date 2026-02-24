/**
 * Session Service
 * CRUD operations for sessions with ownership enforcement
 */

import { PrismaClient, SessionStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { AppError } from '../types/errors.js';

const prisma = new PrismaClient();

export interface CreateSessionData {
  projectId: string;
  clientId: string;
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
  clientId: string;
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
   * Create a new session
   */
  async create(data: CreateSessionData): Promise<{
    id: string;
    projectId: string;
    title: string | null;
    status: SessionStatus;
    createdAt: Date;
  }> {
    // Ensure the project exists and belongs to the client
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, clientId: data.clientId },
    });
    
    if (!project) {
      throw new AppError('NOT_FOUND', 'Project not found or access denied', 404);
    }

    const session = await prisma.session.create({
      data: {
        id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        projectId: data.projectId,
        clientId: data.clientId,
        title: data.title || 'New Session',
        status: SessionStatus.CREATED,
        context: (data.context as any) || {},
      },
    });

    logger.info('Session created', { sessionId: session.id, projectId: data.projectId, clientId: data.clientId });
    return {
      id: session.id,
      projectId: session.projectId,
      title: session.title,
      status: session.status,
      createdAt: session.createdAt,
    };
  }

  /**
   * Get session by ID with ownership check
   */
  async getById(id: string, clientId: string): Promise<SessionWithMessages | null> {
    const session = await prisma.session.findFirst({
      where: { id, clientId },
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
      clientId: session.clientId,
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
   * List sessions for a project with ownership check
   */
  async getByProjectId(
    projectId: string,
    clientId: string,
    options: { status?: SessionStatus; limit?: number; offset?: number } = {}
  ): Promise<SessionWithMessages[]> {
    const sessions = await prisma.session.findMany({
      where: {
        projectId,
        clientId,
        ...(options?.status && { status: options.status }),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return sessions.map(s => ({
      id: s.id,
      projectId: s.projectId,
      clientId: s.clientId,
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
   * Update session with ownership check
   */
  async update(
    id: string,
    clientId: string,
    data: UpdateSessionData
  ): Promise<{
    id: string;
    projectId: string;
    title: string | null;
    status: SessionStatus;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const session = await prisma.session.findFirst({ where: { id, clientId } });
    if (!session) return null;

    const updated = await prisma.session.update({
      where: { id },
      data: {
        title: data.title,
        status: data.status,
        context: data.context as any,
      },
    });

    logger.info('Session updated', { sessionId: id, clientId });
    return {
      id: updated.id,
      projectId: updated.projectId,
      title: updated.title,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Delete session (soft delete)
   */
  async delete(id: string, clientId: string): Promise<boolean> {
    const result = await prisma.session.updateMany({
      where: { id, clientId },
      data: { status: SessionStatus.ERROR },
    });

    if (result.count > 0) {
      logger.info('Session soft deleted', { sessionId: id, clientId });
      return true;
    }
    return false;
  }

  /**
   * Hard delete session
   */
  async hardDelete(id: string, clientId: string): Promise<boolean> {
    const result = await prisma.session.deleteMany({
      where: { id, clientId },
    });

    if (result.count > 0) {
      logger.info('Session hard deleted', { sessionId: id, clientId });
      return true;
    }
    return false;
  }
}

export const sessionService = new SessionService();
