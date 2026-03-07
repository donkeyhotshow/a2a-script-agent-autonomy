/**
 * Message Queue Service
 * Implements "save first, then pedal" pattern for reliable message delivery
 *
 * Flow:
 * 1. Message saved locally with 'pending' status
 * 2. Pedaler picks up pending messages and sends to server
 * 3. On success: status -> 'sent', on failure: retries with backoff
 * 4. On app restart: scans for pending messages and resumes pedaling
 */

import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export type MessageStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'retrying';

export interface QueuedMessage {
  id: string;
  sessionId: string;
  projectId: string;
  result: Record<string, unknown>;
  context?: Record<string, unknown> | null;
  status: MessageStatus;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  lastError?: string;
  sentAt?: string;
}

export interface QueueStats {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  total: number;
}

export interface PedalerOptions {
  /** Base directory for queue storage */
  baseDir: string;
  /** Max retry attempts before marking failed */
  maxRetries: number;
  /** Initial retry delay in ms */
  initialDelay: number;
  /** Max retry delay in ms */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Interval between pedaler runs in ms */
  pedalInterval: number;
  /** Whether to start pedaling automatically */
  autoStart: boolean;
}

export type SendFunction = (
  sessionId: string,
  projectId: string,
  result: Record<string, unknown>,
  context?: Record<string, unknown> | null
) => Promise<Record<string, unknown>>;

/**
 * Message Queue for reliable message delivery
 * Persists messages locally before sending to server
 */
export class MessageQueue {
  private baseDir: string;
  private maxRetries: number;
  private initialDelay: number;
  private maxDelay: number;
  private backoffMultiplier: number;
  private pedalInterval: number;
  private sendFunction: SendFunction | null = null;
  private pedaling = false;
  private pedalTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(options: Partial<PedalerOptions> = {}) {
    this.baseDir = options.baseDir || this.getDefaultQueueDir();
    this.maxRetries = options.maxRetries ?? 5;
    this.initialDelay = options.initialDelay ?? 1000;
    this.maxDelay = options.maxDelay ?? 30000;
    this.backoffMultiplier = options.backoffMultiplier ?? 2;
    this.pedalInterval = options.pedalInterval ?? 1000;

    if (options.autoStart !== false) {
      this.start();
    }
  }

  private getDefaultQueueDir(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || process.cwd();
    return path.join(homeDir, '.a2a', 'message-queue');
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  private getMessagePath(messageId: string): string {
    return path.join(this.baseDir, `${messageId}.json`);
  }

  private getSessionDir(sessionId: string): string {
    return path.join(this.baseDir, 'by-session', sessionId);
  }

  private getMessagePathInSession(sessionId: string, messageId: string): string {
    return path.join(this.getSessionDir(sessionId), `${messageId}.json`);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateDelay(retryCount: number): number {
    const delay = this.initialDelay * Math.pow(this.backoffMultiplier, retryCount);
    return Math.min(delay, this.maxDelay);
  }

  /**
   * Register the send function for pedaling messages to server
   */
  registerSender(sendFn: SendFunction): void {
    this.sendFunction = sendFn;
  }

  /**
   * Enqueue a message (save locally first)
   */
  async enqueue(
    sessionId: string,
    projectId: string,
    result: Record<string, unknown>,
    context?: Record<string, unknown> | null
  ): Promise<QueuedMessage> {
    await this.ensureDir();

    const message: QueuedMessage = {
      id: randomUUID(),
      sessionId,
      projectId,
      result,
      context: context ?? null,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      retryCount: 0,
    };

    // Save to main queue
    await this.saveMessage(message);

    // Also save to session-specific dir for easy lookup
    const sessionDir = this.getSessionDir(sessionId);
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.writeFile(
      this.getMessagePathInSession(sessionId, message.id),
      JSON.stringify(message, null, 2),
      'utf-8'
    );

    return message;
  }

  /**
   * Save message to disk
   */
  private async saveMessage(message: QueuedMessage): Promise<void> {
    const filePath = this.getMessagePath(message.id);
    await fs.writeFile(filePath, JSON.stringify(message, null, 2), 'utf-8');
  }

  /**
   * Load message by ID
   */
  async getMessage(messageId: string): Promise<QueuedMessage | null> {
    try {
      const filePath = this.getMessagePath(messageId);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as QueuedMessage;
    } catch {
      return null;
    }
  }

  /**
   * Get all pending messages for a session
   */
  async getPendingMessages(sessionId: string): Promise<QueuedMessage[]> {
    const sessionDir = this.getSessionDir(sessionId);
    try {
      const files = await fs.readdir(sessionDir);
      const messages: QueuedMessage[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const messageId = file.replace('.json', '');
        const message = await this.getMessage(messageId);
        if (message && (message.status === 'pending' || message.status === 'retrying')) {
          messages.push(message);
        }
      }

      return messages.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } catch {
      return [];
    }
  }

  /**
   * Get all unserved messages (pending, retrying, failed)
   */
  async getUnservedMessages(): Promise<QueuedMessage[]> {
    try {
      const files = await fs.readdir(this.baseDir);
      const messages: QueuedMessage[] = [];

      for (const file of files) {
        if (!file.endsWith('.json') || file === 'stats.json') continue;
        const messageId = file.replace('.json', '');
        const message = await this.getMessage(messageId);
        if (message && message.status !== 'sent') {
          messages.push(message);
        }
      }

      return messages;
    } catch {
      return [];
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const messages = await this.getUnservedMessages();
    const allMessages = await this.getAllMessages();

    return {
      pending: messages.filter(m => m.status === 'pending').length,
      sending: messages.filter(m => m.status === 'sending').length,
      sent: allMessages.filter(m => m.status === 'sent').length,
      failed: messages.filter(m => m.status === 'failed').length,
      total: allMessages.length,
    };
  }

  /**
   * Get all messages
   */
  private async getAllMessages(): Promise<QueuedMessage[]> {
    try {
      const files = await fs.readdir(this.baseDir);
      const messages: QueuedMessage[] = [];

      for (const file of files) {
        if (!file.endsWith('.json') || file === 'stats.json') continue;
        const messageId = file.replace('.json', '');
        const message = await this.getMessage(messageId);
        if (message) {
          messages.push(message);
        }
      }

      return messages;
    } catch {
      return [];
    }
  }

  /**
   * Mark message as sent
   */
  async markSent(messageId: string): Promise<void> {
    const message = await this.getMessage(messageId);
    if (!message) return;

    message.status = 'sent';
    message.sentAt = new Date().toISOString();
    message.updatedAt = new Date().toISOString();

    await this.saveMessage(message);

    // Clean up session-specific file after a delay (keep for recovery purposes)
    try {
      const sessionFile = this.getMessagePathInSession(message.sessionId, messageId);
      await fs.unlink(sessionFile);
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Mark message for retry
   */
  async markRetry(messageId: string, error?: string): Promise<void> {
    const message = await this.getMessage(messageId);
    if (!message) return;

    message.retryCount++;
    message.status = message.retryCount >= this.maxRetries ? 'failed' : 'retrying';
    message.lastError = error;
    message.updatedAt = new Date().toISOString();

    await this.saveMessage(message);

    // Update session-specific copy
    try {
      const sessionFile = this.getMessagePathInSession(message.sessionId, messageId);
      await fs.writeFile(sessionFile, JSON.stringify(message, null, 2), 'utf-8');
    } catch {
      // Ignore
    }
  }

  /**
   * Mark message as failed (max retries exceeded)
   */
  async markFailed(messageId: string, error: string): Promise<void> {
    const message = await this.getMessage(messageId);
    if (!message) return;

    message.status = 'failed';
    message.lastError = error;
    message.updatedAt = new Date().toISOString();

    await this.saveMessage(message);
  }

  /**
   * Retry a failed message manually
   */
  async retryMessage(messageId: string): Promise<boolean> {
    const message = await this.getMessage(messageId);
    if (!message) return false;

    message.status = 'pending';
    message.retryCount = 0;
    message.lastError = undefined;
    message.updatedAt = new Date().toISOString();

    await this.saveMessage(message);
    return true;
  }

  /**
   * Delete a message from queue
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const message = await this.getMessage(messageId);
    if (!message) return false;

    try {
      await fs.unlink(this.getMessagePath(messageId));
      try {
        await fs.unlink(this.getMessagePathInSession(message.sessionId, messageId));
      } catch {
        // Ignore session file errors
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start the pedaler (background sender)
   */
  start(): void {
    if (this.pedaling || this.isDestroyed) return;

    this.pedaling = true;
    this.pedalLoop();
    console.log('[MessageQueue] Pedaler started');
  }

  /**
   * Stop the pedaler
   */
  stop(): void {
    this.pedaling = false;
    if (this.pedalTimer) {
      clearTimeout(this.pedalTimer);
      this.pedalTimer = null;
    }
    console.log('[MessageQueue] Pedaler stopped');
  }

  /**
   * Destroy the queue and clean up
   */
  destroy(): void {
    this.isDestroyed = true;
    this.stop();
  }

  /**
   * Main pedal loop - processes pending messages
   */
  private async pedalLoop(): Promise<void> {
    if (!this.pedaling || this.isDestroyed) return;

    try {
      await this.pedalPendingMessages();
    } catch (err) {
      console.error('[MessageQueue] Pedal loop error:', err);
    }

    // Schedule next pedal
    if (this.pedaling && !this.isDestroyed) {
      this.pedalTimer = setTimeout(() => this.pedalLoop(), this.pedalInterval);
    }
  }

  /**
   * Process all pending messages
   */
  private async pedalPendingMessages(): Promise<void> {
    if (!this.sendFunction) return;

    const pending = await this.getPendingMessagesForPedaling();

    for (const message of pending) {
      await this.pedalMessage(message);
    }
  }

  /**
   * Get messages ready for pedaling (pending or retrying with backoff elapsed)
   */
  private async getPendingMessagesForPedaling(): Promise<QueuedMessage[]> {
    const messages = await this.getUnservedMessages();
    const now = Date.now();

    return messages.filter(m => {
      if (m.status === 'pending') return true;
      if (m.status === 'retrying') {
        // Check if backoff has elapsed
        const delay = this.calculateDelay(m.retryCount);
        const lastUpdate = new Date(m.updatedAt).getTime();
        return now - lastUpdate >= delay;
      }
      return false;
    });
  }

  /**
   * Pedal a single message to the server
   */
  private async pedalMessage(message: QueuedMessage): Promise<void> {
    if (!this.sendFunction) return;

    // Mark as sending
    message.status = 'sending';
    message.updatedAt = new Date().toISOString();
    await this.saveMessage(message);

    try {
      // Send to server
      await this.sendFunction(
        message.sessionId,
        message.projectId,
        message.result,
        message.context
      );

      // Success - mark as sent
      await this.markSent(message.id);
      console.log(`[MessageQueue] Message ${message.id} sent successfully`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[MessageQueue] Failed to send message ${message.id}:`, error);

      // Mark for retry or failure
      await this.markRetry(message.id, error);
    }
  }

  /**
   * Force immediate pedal of a specific session's messages
   */
  async pedalSession(sessionId: string): Promise<void> {
    if (!this.sendFunction) return;

    const pending = await this.getPendingMessages(sessionId);

    for (const message of pending) {
      await this.pedalMessage(message);
    }
  }

  /**
   * Check if there are unserved messages on startup and resume pedaling
   * Call this on application startup
   */
  async resumeOnStartup(): Promise<{
    resumed: boolean;
    count: number;
    errors?: string;
  }> {
    try {
      const unserved = await this.getUnservedMessages();

      if (unserved.length === 0) {
        return { resumed: false, count: 0 };
      }

      console.log(`[MessageQueue] Found ${unserved.length} unserved messages, resuming...`);

      // Start pedaler if not already running
      this.start();

      return { resumed: true, count: unserved.length };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error('[MessageQueue] Resume on startup failed:', error);
      return { resumed: false, count: 0, errors: error };
    }
  }
}

// Singleton instance for application-wide use
let globalQueue: MessageQueue | null = null;

export function getGlobalQueue(options?: Partial<PedalerOptions>): MessageQueue {
  if (!globalQueue || globalQueue['isDestroyed']) {
    globalQueue = new MessageQueue(options);
  }
  return globalQueue;
}

export function setGlobalQueue(queue: MessageQueue): void {
  globalQueue = queue;
}

export function destroyGlobalQueue(): void {
  if (globalQueue) {
    globalQueue.destroy();
    globalQueue = null;
  }
}
