import { Queue, Worker } from "bullmq";
import { logger } from "./logger.js";
import {
  GrayRoomConfig,
  GrayRoomContext,
  GrayRoomTask,
  GrayRoomTaskResult,
  GrayRoomTrigger,
} from "./types.js";
import { GrayRoomOrchestrator } from "./orchestrator.js";

export class GrayRoomManager {
  private config: GrayRoomConfig;
  private orchestrator: GrayRoomOrchestrator;
  private taskQueue: Queue;
  private worker: Worker;
  private activeSessions: Map<string, GrayRoomContext> = new Map();

  constructor(config: GrayRoomConfig) {
    this.config = config;
    this.orchestrator = new GrayRoomOrchestrator(config.defaultOptions);

    // Initialize BullMQ queue
    this.taskQueue = new Queue("gray-room-tasks", {
      connection: {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    });

    this.worker = new Worker("gray-room-tasks", this.processTask.bind(this));
    this.worker.on("completed", (job) => {
      logger.info("[GrayRoomManager] Task completed", { jobId: job.id });
    });
    this.worker.on("failed", (job, err) => {
      logger.error("[GrayRoomManager] Task failed", {
        jobId: job?.id,
        error: err.message,
      });
    });
  }

  /**
   * Create a ticket for gray room session
   */
  createTicket(sessionId: string, context: Record<string, any>): string {
    const ticketId = `gr-${sessionId}-${Date.now()}`;
    const grayRoomContext: GrayRoomContext = {
      sessionId,
      ticketId,
      triggerPoint: "manual",
      context,
    };

    this.activeSessions.set(ticketId, grayRoomContext);
    logger.info("[GrayRoomManager] Ticket created", { ticketId, sessionId });
    return ticketId;
  }

  /**
   * Trigger gray room tasks based on trigger point and conditions
   */
  async trigger(
    ticketId: string,
    triggerPoint: GrayRoomTrigger,
    additionalContext?: Record<string, any>,
  ): Promise<GrayRoomTaskResult[]> {
    const session = this.activeSessions.get(ticketId);
    if (!session) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    // Update session context
    if (additionalContext) {
      session.context = { ...session.context, ...additionalContext };
    }
    session.triggerPoint = triggerPoint;

    // Find matching tasks
    const matchingTasks = this.config.tasks.filter(
      (task) =>
        task.enabled &&
        task.trigger === triggerPoint &&
        this.checkConditions(task, session),
    );

    if (matchingTasks.length === 0) {
      logger.info("[GrayRoomManager] No matching tasks for trigger", {
        ticketId,
        triggerPoint,
      });
      return [];
    }

    // Sort by priority (higher first)
    matchingTasks.sort(
      (a: GrayRoomTask, b: GrayRoomTask) => b.priority - a.priority,
    );

    // Execute tasks
    const results: GrayRoomTaskResult[] = [];
    for (const task of matchingTasks) {
      try {
        const result = await this.executeTask(task, session);
        results.push(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error("[GrayRoomManager] Task execution failed", {
          ticketId,
          taskId: task.id,
          error: errorMessage,
        });
        results.push({
          taskId: task.id,
          success: false,
          error: errorMessage,
          duration: 0,
          executedAt: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    task: GrayRoomTask,
    context: GrayRoomContext,
  ): Promise<GrayRoomTaskResult> {
    const startTime = Date.now();

    try {
      // Add to queue for async processing
      const job = await this.taskQueue.add("execute", {
        taskId: task.id,
        context,
        actions: task.actions,
      });

      if (!job) {
        throw new Error("Failed to create job");
      }

      // Wait for completion
      const result = await job.waitUntilFinished(
        this.taskQueue.opts.connection as any,
      );

      const duration = Date.now() - startTime;
      return {
        taskId: task.id,
        success: true,
        result,
        duration,
        executedAt: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        taskId: task.id,
        success: false,
        error: errorMessage,
        duration,
        executedAt: new Date(),
      };
    }
  }

  /**
   * Check if task conditions are met
   */
  private checkConditions(
    task: GrayRoomTask,
    context: GrayRoomContext,
  ): boolean {
    if (!task.conditions || task.conditions.length === 0) {
      return true;
    }

    return task.conditions.every((condition: any) => {
      switch (condition.type) {
        case "context_key":
          return this.checkContextKey(condition, context.context);
        case "result_outcome":
          return this.checkResultOutcome(condition, context.result);
        case "interrupt_reason":
          return this.checkInterruptReason(condition, context.trace);
        default:
          logger.warn("[GrayRoomManager] Unknown condition type", {
            type: condition.type,
          });
          return false;
      }
    });
  }

  private checkContextKey(
    condition: any,
    context: Record<string, any>,
  ): boolean {
    const value = context[condition.key];
    switch (condition.operator) {
      case "exists":
        return value !== undefined;
      case "not_exists":
        return value === undefined;
      case "equals":
        return value === condition.value;
      case "contains":
        return typeof value === "string" && value.includes(condition.value);
      default:
        return false;
    }
  }

  private checkResultOutcome(condition: any, result: any): boolean {
    if (!result) return false;
    const value = result[condition.key];
    return value === condition.value;
  }

  private checkInterruptReason(
    condition: any,
    trace: any[] | undefined,
  ): boolean {
    if (!trace) return false;
    return trace.some((event) => event.reason === condition.key);
  }

  /**
   * Process queued task
   */
  private async processTask(job: any): Promise<any> {
    const { taskId, context, actions } = job.data;

    logger.info("[GrayRoomManager] Processing task", { taskId });

    // Execute actions through orchestrator
    const results = [];
    for (const action of actions) {
      try {
        const result = await this.orchestrator.executeAction(action, context);
        results.push(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error("[GrayRoomManager] Action failed", {
          taskId,
          action: action.type,
          error: errorMessage,
        });
        results.push({
          action: action.type,
          success: false,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Cleanup completed sessions
   */
  cleanup(ticketId: string): void {
    this.activeSessions.delete(ticketId);
    logger.info("[GrayRoomManager] Session cleaned up", { ticketId });
  }

  /**
   * Shutdown manager
   */
  async shutdown(): Promise<void> {
    await this.taskQueue.close();
    await this.worker.close();
    logger.info("[GrayRoomManager] Shutdown complete");
  }
}
