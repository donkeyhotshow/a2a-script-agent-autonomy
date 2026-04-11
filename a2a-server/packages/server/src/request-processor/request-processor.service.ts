/**
 * Request Processor Service
 *
 * Main entry point for request processing. Acts as a router/factory
 * that delegates to specialized processors based on request type.
 *
 * IMPORTANT: Server does NOT store client data!
 * Graph is passed in context and returned in response.
 * ContextManager is reset per request (resetContextManager) — no cache of context/code between iterations.
 */

import {
  requestService,
  isRetryableError,
  shouldDeferDialogProcessorFailure,
  type RequestResult,
} from "@a2a/server-request";
import { logger } from '../../lib/logger.js';
import { resolveAiHubBaseUrl } from "../../../lib/ai-hub-url.js";
import { requestProcessorLatencyHistogram } from "../utils/metrics.js";
import type {
  RequestContext,
  ProcessResult,
  ProcessOutcome,
  Task,
  TaskAnalysis,
} from "./request-processor.interfaces.js";
import {
  actionRequestProcessor,
  simulationRequestProcessor,
  formRequestProcessor,
  dialogRequestProcessor,
  processorRegistry,
  recoverDialogFromLlmPromise,
} from "./index.js";
import type { RequestType } from "./base-processor.js";
import {
  LLM_PIPELINE_ACTIONS,
  type LlmPipelineAction,
} from "../../server-config/router-static.js";
import { resolveExecution, resolveResultObject } from "./normalization.js";
import { detectFrameworksFromCodeBlocks } from "./framework-from-codeblocks.js";
import { readDialogHubLlmResubmitMax } from "../../../gray-room/src/core/request-processor/gray-room-trigger.js";
import { features } from "../../server-config/index.js";

export { LLM_PIPELINE_ACTIONS, type LlmPipelineAction };

function mergeFrameworksIntoStatusPayload(
  result: ProcessResult,
  baseContext: Record<string, unknown>,
  codeBlocks: RequestResult["codeBlocks"],
): Record<string, unknown> {
  const resultObj =
    typeof result === "object" && result !== null
      ? (result as unknown as Record<string, unknown>)
      : {};
  const frameworks = detectFrameworksFromCodeBlocks(codeBlocks);
  const hadContext =
    typeof resultObj.context === "object" && resultObj.context !== null;

  if (frameworks === undefined && !hadContext) {
    return resultObj;
  }

  const mergedContext: Record<string, unknown> = {
    ...baseContext,
    ...(hadContext ? (resultObj.context as Record<string, unknown>) : {}),
  };
  if (frameworks !== undefined) {
    mergedContext.frameworks = frameworks;
  }
  return { ...resultObj, context: mergedContext };
}

const DEFAULT_INTERVAL_MS = parseInt(
  process.env.REQUEST_PROCESSOR_INTERVAL_MS || "5000",
  10,
);
let timerId: ReturnType<typeof setInterval> | null = null;
let isTicking = false;

// Register processors — `dialog` handles all LLM pipeline actions (dialog, agent, task-decomposition, …); see determineRequestType + GR-S-12.
processorRegistry.register("action", actionRequestProcessor);
processorRegistry.register("simulation", simulationRequestProcessor);
processorRegistry.register("form", formRequestProcessor);
processorRegistry.register("dialog", dialogRequestProcessor);

/**
 * Determine the request type based on context
 */
export function determineRequestType(
  context: Record<string, unknown>,
): RequestType {
  const exec = resolveExecution(context);
  const result = resolveResultObject(context);
  const transformSchema = context["transformSchema"] as string | undefined;
  const action = (exec?.action ?? context["action"]) as string | undefined;
  const task = context["task"] as string | undefined;
  const message = context["message"] as string | undefined;
  const hasMessage = Boolean(result?.message ?? task ?? message);
  const choiceRaw =
    (typeof result?.choice === "string" ? result.choice : "") ||
    (typeof context["choice_id"] === "string" ? context["choice_id"] : "");
  const llmChoice =
    choiceRaw && LLM_PIPELINE_ACTIONS.includes(choiceRaw as LlmPipelineAction)
      ? choiceRaw
      : undefined;
  const execStep = exec?.step as string | undefined;

  // Check for simulation requests first
  if (
    context["simulation"] ||
    context["replay"] ||
    context["simulation_name"] ||
    context["simulation_step"]
  ) {
    return "simulation";
  }

  // First beat (task input form): classify via action processor (router), even when POST /sessions
  // seeded execution.action as agent|dialog|task-decomposition (mode on create).
  // Must NOT run when the client submitted a router choice (beat B): if merged execution was lost
  // and fell back to step "new", we'd otherwise re-enter handleTaskRequest and re-emit the router form.
  const firstBeatText =
    (typeof result?.message === "string" && result.message.trim()) ||
    (typeof task === "string" && task.trim()) ||
    (typeof message === "string" && message.trim());
  if (execStep === "new" && firstBeatText && !choiceRaw) {
    return "action";
  }

  // Router beat B (dialog|agent|task-decomposition): ActionRequestProcessor.handleRouterChoice patches
  // execution before delegating to dialog. Routing straight to dialog skipped that patch and left
  // task/router on the client when the LLM hop failed (no context on failed ProcessResult).
  if (execStep === "router" && llmChoice !== undefined) {
    return "action";
  }

  // Transform pipeline / LLM: transformSchema, or execution.action in LLM modes + (message/task or router choice)
  const llmActions = [...LLM_PIPELINE_ACTIONS] as string[];
  if (
    transformSchema ||
    (action &&
      llmActions.includes(action) &&
      (hasMessage || llmChoice !== undefined))
  ) {
    return "dialog";
  }

  // Check for form requests (not router LLM pipeline picks — those use dialog + normalization.applyRouterPipelineChoice)
  const isRouterLlmPick = execStep === "router" && llmChoice !== undefined;
  if (
    !isRouterLlmPick &&
    (context["form_submission"] ||
      context["form_data"] ||
      context["form_id"] ||
      context["selected_choice"] ||
      context["choice_id"])
  ) {
    return "form";
  }

  // Check for action requests
  const actionType = (context["action"] ?? exec?.action) as string | undefined;
  if (
    actionType === "step_result" ||
    actionType === "approve_action" ||
    actionType === "task_request" ||
    (context["continue"] && context["step_result"])
  ) {
    return "action";
  }

  // Default to action processing for non-simulation requests
  return "action";
}

/**
 * Route request to appropriate processor
 */
async function routeRequest(request: RequestContext): Promise<ProcessResult> {
  const { promiseId, context } = request;
  const requestType = determineRequestType(context);

  logger.info("[RequestProcessor] Routing request", {
    promiseId,
    requestType,
    resultChoice: (context["result"] as Record<string, unknown> | undefined)
      ?.choice,
    executionAction: (
      context["execution"] as Record<string, unknown> | undefined
    )?.action,
  });

  const processor = processorRegistry.get(requestType);

  if (!processor) {
    logger.error("[RequestProcessor] No processor found for type", {
      requestType,
    });
    return {
      outcome: "failed",
      error: `No processor available for request type: ${requestType}`,
    } as ProcessResult;
  }

  return processor.process(request);
}

/**
 * Run processor for an already-claimed row (status should be `processing`).
 */
async function executePendingRow(
  request: RequestResult,
): Promise<ProcessResult> {
  const { promiseId, context, codeBlocks, message } = request;

  try {
    const requestContext: RequestContext = {
      promiseId,
      context,
      codeBlocks,
      message: message ?? undefined,
    };

    const requestType = determineRequestType(context);
    const result = await routeRequest(requestContext);

    // Handle AI-Actions continuation (form choice -> LLM processing)
    if (result.outcome === "ai_action_ready" && result.aiActions?.action) {
      if (context["ai_action"] === true) {
        logger.warn(
          "[RequestProcessor] Prevented recursive AI-action follow-up loop",
          {
            promiseId,
            action: result.aiActions.action,
          },
        );
        await requestService.updateStatus(promiseId, "failed", {
          outcome: "failed",
          error: "Recursive ai_action_ready detected for follow-up request",
        });
        return {
          ...result,
          outcome: "failed",
          error: "Recursive ai_action_ready detected for follow-up request",
        };
      }
      logger.info(
        "[RequestProcessor] AI-Action ready, creating LLM follow-up request",
        {
          promiseId,
          action: result.aiActions.action,
        },
      );

      // Create new request for neuron processor with LLM
      // Create a clean context to prevent property leakage
      const followUpContext: Record<string, unknown> = {
        // Copy over safe properties
        ...(context["execution"] ? { execution: context["execution"] } : {}),
        ...(context["task"] ? { task: context["task"] } : {}),
        ...(context["message"] ? { message: context["message"] } : {}),
        ...(context["history"] ? { history: context["history"] } : {}),
        ...(context["workbench"] ? { workbench: context["workbench"] } : {}),
        ...(context["session_id"] ? { session_id: context["session_id"] } : {}),
        ...(context["operationHistory"]
          ? { operationHistory: context["operationHistory"] }
          : {}),
        // Set required properties for AI-action processing
        action: result.aiActions.action,
        ai_action: true,
        previousChoice: result.selection,
        task:
          message ??
          (context["task"] as string | undefined) ??
          result.aiActions.action,
      };

      const followUpExecution =
        (followUpContext["execution"] as Record<string, unknown> | undefined) ??
        {};
      followUpContext["execution"] = {
        ...followUpExecution,
        action: result.aiActions.action,
        step: "start",
      };

      const followUpRequest = await requestService.create({
        clientId: promiseId, // Link to original
        context: followUpContext,
        message: message ?? `AI-Action: ${result.aiActions.action}`,
      });

      logger.info("[RequestProcessor] Created LLM follow-up request", {
        originalPromiseId: promiseId,
        followUpPromiseId: followUpRequest.promiseId,
        action: result.aiActions.action,
      });

      // Complete current request with reference to follow-up
      await requestService.updateStatus(promiseId, "completed", {
        ...result,
        followUpRequestId: followUpRequest.promiseId,
        note: "AI-Action routed to LLM processing",
      });

      return result;
    }

    // Update request status based on result
    if (result.outcome === "failed") {
      const err = String(result.error ?? "");
      const deferForDialog =
        requestType === "dialog" && shouldDeferDialogProcessorFailure(err);
      if (isRetryableError(err) || deferForDialog) {
        const ok = await requestService.scheduleRetry(promiseId);
        if (ok) {
          logger.info(
            "[RequestProcessor] Scheduled retry (transient or dialog pipeline)",
            {
              promiseId,
              deferForDialog,
            },
          );
          return result;
        }
      }
    }

    await requestService.updateStatus(
      promiseId,
      result.outcome === "failed" ? "failed" : "completed",
      mergeFrameworksIntoStatusPayload(
        result,
        context as Record<string, unknown>,
        codeBlocks,
      ),
    );
    return result;
  } catch (err) {
    const errStr = String(err);
    logger.error("[RequestProcessor] Error", { promiseId, error: errStr });
    const reqType = determineRequestType(context);
    const deferDialog =
      reqType === "dialog" && shouldDeferDialogProcessorFailure(errStr);
    if (isRetryableError(errStr) || deferDialog) {
      const ok = await requestService.scheduleRetry(promiseId);
      if (ok) {
        logger.info("[RequestProcessor] Scheduled retry for caught error", {
          promiseId,
        });
        return { outcome: "failed" as ProcessOutcome };
      }
    }
    await requestService.updateStatus(promiseId, "failed", undefined, {
      code: "PROCESS_ERROR",
      message: errStr,
    });
    return { outcome: "failed" as ProcessOutcome };
  }
}

/**
 * Process a single request (queue head).
 */
export async function processOneRequest(): Promise<ProcessResult | null> {
  const request = await requestService.getNextPending();
  if (!request) return null;
  return executePendingRow(request);
}

/**
 * Process a specific pending request by promiseId (async invoke queue).
 */
export async function processRequestByPromiseId(
  promiseId: string,
): Promise<ProcessResult | null> {
  const request = await requestService.claimPendingByPromiseId(promiseId);
  if (!request) return null;
  return executePendingRow(request);
}

/**
 * Timer tick for background processing
 */
async function tick(): Promise<void> {
  // Prevent concurrent ticks
  if (isTicking) {
    return;
  }
  isTicking = true;
  const startTime = Date.now();
  try {
    const result = await processOneRequest();

    // Record latency metric
    const latency = Date.now() - startTime;
    const outcome =
      result?.outcome ?? (result === null ? "no_request" : "unknown");
    requestProcessorLatencyHistogram.observe({ outcome }, latency);

    if (result?.outcome === "failed") {
      logger.warn("[RequestProcessor] Request failed, continuing...");
    }
    // When idle, revive retryable failed requests (e.g. after a2a-ai-hub starts)
    if (!result) {
      await requestService.scheduleRetryForFailed();
      await requestService.reviveFailedAfterCooldown();
      const cleanupStats = await requestService.cleanupStorage();
      if (cleanupStats.removedByAge > 0 || cleanupStats.removedByLimit > 0) {
        logger.info(
          "[RequestProcessor] Cleaned up request storage",
          cleanupStats,
        );
      }
    }
  } catch (err) {
    // Record error latency
    const latency = Date.now() - startTime;
    requestProcessorLatencyHistogram.observe({ outcome: "error" }, latency);
    logger.error("[RequestProcessor] Tick error", { error: String(err) });
  } finally {
    isTicking = false;
  }
}

/**
 * Recover processing requests that have llmPromiseId (e.g. after server restart during polling)
 */
async function recoverProcessingRequests(): Promise<void> {
  const base = resolveAiHubBaseUrl();
  const ids = await requestService.listProcessing();
  for (const promiseId of ids) {
    // Validate promiseId format (should be a non-empty string)
    if (
      !promiseId ||
      typeof promiseId !== "string" ||
      promiseId.trim() === ""
    ) {
      logger.warn(
        "[RequestProcessor] Skipping invalid promiseId during recovery",
        { promiseId },
      );
      continue;
    }
    const req = await requestService.getResult(promiseId);
    if (!req) continue;
    let llmPromiseId = (req.context as Record<string, unknown>)
      ?.llmPromiseId as string | undefined;
    if (!llmPromiseId) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        const lookupRes = await fetch(
          `${base}/promise/by-server-request/${encodeURIComponent(promiseId)}`,
          {
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);
        if (lookupRes.ok) {
          const data = (await lookupRes.json()) as { promiseId?: string };
          llmPromiseId = data?.promiseId;
        }
      } catch (err) {
        // Ignore timeout errors as they're expected when service is unavailable
        if (err.name !== "AbortError") {
          logger.error("Failed to fetch session during recovery:", err);
        }
        continue;
      }
    }

    if (!llmPromiseId) continue;
    const outcome = await recoverDialogFromLlmPromise(
      promiseId,
      req.context,
      llmPromiseId,
    );
    if (outcome.tag === "pending") {
      continue;
    }
    if (outcome.tag === "resubmit") {
      const cap = readDialogHubLlmResubmitMax();
      const cnt = await requestService.incrementHubLlmResubmitCount(promiseId);
      if (cnt > cap) {
        await requestService.updateStatus(promiseId, "failed", undefined, {
          message: `Hub LLM promise lost after ${cap} resubmit(s)`,
        });
        logger.warn("[RequestProcessor] Recovery resubmit cap exceeded", {
          promiseId,
        });
        continue;
      }
      await requestService.clearLlmPromiseId(promiseId);
      logger.info(
        "[RequestProcessor] Hub promise gone — cleared llmPromiseId for next dialog tick",
        {
          promiseId,
          reason: outcome.reason,
        },
      );
      continue;
    }
    if (outcome.tag === "failed") {
      const errMsg = outcome.error ?? "Recovery failed";
      const ctx = req.context as Record<string, unknown>;
      const isDialog = determineRequestType(ctx) === "dialog";
      if (isDialog && shouldDeferDialogProcessorFailure(errMsg)) {
        const ok = await requestService.scheduleRetry(promiseId);
        if (ok) {
          logger.info(
            "[RequestProcessor] Recovery failed — scheduled dialog retry",
            { promiseId },
          );
          continue;
        }
      }
      await requestService.updateStatus(promiseId, "failed", undefined, {
        message: errMsg,
      });
      logger.info("[RequestProcessor] Recovered stuck request", {
        promiseId,
        success: false,
      });
      continue;
    }
    const proc = outcome.result;
    const resultPayload = { ...proc } as Record<string, unknown>;
    await requestService.updateStatus(promiseId, "completed", resultPayload);
    logger.info("[RequestProcessor] Recovered stuck request", {
      promiseId,
      success: true,
    });
  }
}

/**
 * Start the request processor
 */
export function startRequestProcessor(
  intervalMs: number = DEFAULT_INTERVAL_MS,
): void {
  if (timerId) return;
  logger.info("[RequestProcessor] Started", { intervalMs });
  recoverProcessingRequests().catch((err) =>
    logger.error("[RequestProcessor] Recovery failed", { error: String(err) }),
  );
  timerId = setInterval(() => {
    tick().catch((err) => {
      logger.error("[RequestProcessor] Tick error", { error: String(err) });
    });
  }, intervalMs);
}
/**
 * Stop the request processor
 */
export function stopRequestProcessor(): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    logger.info("[RequestProcessor] Stopped");
  }
}

/**
 * Halt an active request by promiseId.
 */
export function haltRequest(promiseId: string): boolean {
  // Check if gray room feature is enabled
  if (!features.transform.grayRoom) {
    return false;
  }

  const { GrayRoomOrchestrator } = require("./gray-room-orchestrator.js");
  return GrayRoomOrchestrator.halt(promiseId);
}

// Re-export types for compatibility
export type { ProcessResult, ProcessOutcome, Task, TaskAnalysis };
