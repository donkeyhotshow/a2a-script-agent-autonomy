/**
 * Message Service
 *
 * Реализация на основе плана: plans/message-service-improvements.md
 *
 * CRUD operations for messages
 */

import { PrismaClient, MessageDirection, MessageStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

export interface CreateMessageData {
  sessionId: string;
  direction: MessageDirection;
  role?: 'user' | 'server';
  content: Record<string, unknown>;
  contentText?: string;
  promiseId?: string;
  status?: MessageStatus;
}

export interface UpdateMessageData {
  content?: Record<string, unknown>;
  contentText?: string;
  promiseId?: string | null;
  status?: MessageStatus;
}

export class MessageService {
  /**
   * Create a new message
   */
  async create(data: CreateMessageData): Promise<{
    id: string;
    sessionId: string;
    direction: MessageDirection;
    role: string | null;
    content: Record<string, unknown>;
    contentText: string | null;
    promiseId: string | null;
    status: string | null;
    createdAt: Date;
  }> {
    const message = await prisma.message.create({
      data: {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: data.sessionId,
        direction: data.direction,
        role: data.role || null,
        content: data.content as any,
        contentText: data.contentText || null,
        promiseId: data.promiseId || null,
        status: data.status || MessageStatus.sent,
      },
    });

    logger.info('Message created', { 
      messageId: message.id, 
      sessionId: data.sessionId,
      direction: data.direction 
    });

    return {
      id: message.id,
      sessionId: message.sessionId,
      direction: message.direction,
      role: message.role,
      content: message.content as Record<string, unknown>,
      contentText: message.contentText,
      promiseId: message.promiseId,
      status: message.status,
      createdAt: message.createdAt,
    };
  }

  /**
   * Get message by ID
   */
  async getById(messageId: string): Promise<{
    id: string;
    sessionId: string;
    direction: MessageDirection;
    role: string | null;
    content: Record<string, unknown>;
    contentText: string | null;
    promiseId: string | null;
    status: string | null;
    createdAt: Date;
  } | null> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) return null;

    return {
      id: message.id,
      sessionId: message.sessionId,
      direction: message.direction,
      role: message.role,
      content: message.content as Record<string, unknown>,
      contentText: message.contentText,
      promiseId: message.promiseId,
      status: message.status,
      createdAt: message.createdAt,
    };
  }

  /**
   * Get messages by session ID
   */
  async getBySessionId(
    sessionId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Array<{
    id: string;
    sessionId: string;
    direction: MessageDirection;
    role: string | null;
    content: Record<string, unknown>;
    contentText: string | null;
    promiseId: string | null;
    status: string | null;
    createdAt: Date;
  }>> {
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    return messages.map(m => ({
      id: m.id,
      sessionId: m.sessionId,
      direction: m.direction,
      role: m.role,
      content: m.content as Record<string, unknown>,
      contentText: m.contentText,
      promiseId: m.promiseId,
      status: m.status,
      createdAt: m.createdAt,
    }));
  }

  /**
   * Update message
   */
  async update(
    messageId: string,
    data: UpdateMessageData
  ): Promise<{
    id: string;
    sessionId: string;
    direction: MessageDirection;
    role: string | null;
    content: Record<string, unknown>;
    contentText: string | null;
    promiseId: string | null;
    status: string | null;
    createdAt: Date;
  } | null> {
    try {
      const updateData: any = {};
      if (data.content !== undefined) updateData.content = data.content;
      if (data.contentText !== undefined) updateData.contentText = data.contentText;
      if (data.promiseId !== undefined) updateData.promiseId = data.promiseId;
      if (data.status !== undefined) updateData.status = data.status;

      const message = await prisma.message.update({
        where: { id: messageId },
        data: updateData,
      });

      logger.info('Message updated', { messageId, updates: Object.keys(data) });

      return {
        id: message.id,
        sessionId: message.sessionId,
        direction: message.direction,
        role: message.role,
        content: message.content as Record<string, unknown>,
        contentText: message.contentText,
        promiseId: message.promiseId,
        status: message.status,
        createdAt: message.createdAt,
      };
    } catch (error) {
      logger.error('Failed to update message', { messageId, error: String(error) });
      return null;
    }
  }

  /**
   * Update message by promiseId
   */
  async updateByPromiseId(
    promiseId: string,
    data: UpdateMessageData
  ): Promise<{
    id: string;
    sessionId: string;
    direction: MessageDirection;
    role: string | null;
    content: Record<string, unknown>;
    contentText: string | null;
    promiseId: string | null;
    status: string | null;
    createdAt: Date;
  } | null> {
    try {
      const updateData: any = {};
      if (data.content !== undefined) updateData.content = data.content;
      if (data.contentText !== undefined) updateData.contentText = data.contentText;
      if (data.promiseId !== undefined) updateData.promiseId = data.promiseId;
      if (data.status !== undefined) updateData.status = data.status;

      const message = await prisma.message.update({
        where: { promiseId },
        data: updateData,
      });

      logger.info('Message updated by promiseId', { promiseId, messageId: message.id });

      return {
        id: message.id,
        sessionId: message.sessionId,
        direction: message.direction,
        role: message.role,
        content: message.content as Record<string, unknown>,
        contentText: message.contentText,
        promiseId: message.promiseId,
        status: message.status,
        createdAt: message.createdAt,
      };
    } catch (error) {
      logger.error('Failed to update message by promiseId', { promiseId, error: String(error) });
      return null;
    }
  }

  /**
   * Delete message
   */
  async delete(messageId: string): Promise<boolean> {
    try {
      await prisma.message.delete({
        where: { id: messageId },
      });

      logger.info('Message deleted', { messageId });
      return true;
    } catch (error) {
      logger.error('Failed to delete message', { messageId, error: String(error) });
      return false;
    }
  }
}

export const messageService = new MessageService();
