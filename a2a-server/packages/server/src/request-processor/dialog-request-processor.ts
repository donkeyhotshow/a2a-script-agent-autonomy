/**
 * Dialog / Transform Request Processor
 *
 * Uses transform pipeline: request transforms → LLM → response transforms.
 * Switch: context.transformSchema (e.g. "dialog/3") or execution.action=dialog + result.message.
 *
 * Модульная структура:
 * - normalization.ts - нормализация входных данных
 * - llm-orchestration.ts - оркестрация LLM вызовов
 * - response-path.ts - обработка путей ответа
 */

import { logger } from "@a2a/server-utils/logger"";
import { resolveAiHubBaseUrl } from '../../../lib/ai-hub-url';
import type { RequestContextBlock } from "@a2a/server-protocol";
import type {
  RequestContext,
  ProcessResult,
} from "./request-processor.interfaces";
import { BaseRequestProcessor, type RequestType } from "./base-processor";
import { isDialogToolExecutePayload } from "../../../gray-room/src/core/request-processor/gray-room-utils.ts";
import { normalizeAgentSpuriousRequestAfterPipeline } from "./agent-spurious-request-normalize";
import { readDialogHubLlmResubmitMax } from "../../../gray-room/src/core/request-processor/gray-room-trigger";
// import { featureManager } from "@a2a/server-features";
import {
  resolveTransformSchema,
  normalizeContext,
  extractSchemaName,
  resolveResultObject,
} from "./normalization";
import { tryParseJsonFromLlmText } from "@a2a/server-utils/strip-markdown-json-fence";
import { resolveLlmModelFromContext } from "./llm-model-resolver";
import { requestService } from "@a2a/server-request";
import { CognitionBase } from "../cognition-base.ts";

import { globalDesignReasoner } from "../hierarchical-design-reasoner.ts";
import { getPromptsTransformsPath } from './index';
import {
  isAgentSchemaName,
  lastAssistantMessageFromContext,
} from '../../../server-utils/src/agent-utils';

export { isDialogToolExecutePayload };
export { resolveTransformSchema, normalizeContext, extractSchemaName };

// Re-export из llm-orchestration
export {
  createDialogTransformOutputDir,
  runRequestTransforms,
  prepareLlmMessages,
  initLlmPromise,
  executeLlmCall,
  recoverLlmPromise,
  type LlmCallOptions,
  type LlmCallResult,
} from "./llm-orchestration";

// Re-export из response-path
export {
  recoverDialogFromLlmPromise,
  canRecoverFromLlmPromise,
  getLlmPromiseId,
  type ResponsePathResult,
  type RecoverDialogOutcome,
} from "./response-path";

function dialogFailedWithContext(
  ctx: Record<string, unknown>,
  error: string,
): ProcessResult {
  return {
    outcome: "failed",
    error,
    context: ctx as unknown as RequestContextBlock,
  };
}

function isDialogExecuteMissingOrEmpty(
  execute: ProcessResult["execute"],
): boolean {
  if (execute == null || typeof execute !== "object") {
    return true;
  }
  const ex = execute as Record<string, unknown>;
  return Object.keys(ex).filter((k) => ex[k] != null).length === 0;
}

/**
 * Agent golden request shape (simulations/sync/agent steps 2 / 15): form + message input when execute is missing.
 */
function buildAgentFallbackExecute(
  description: string,
): Record<string, unknown> {
  const desc =
    typeof description === "string" && description.trim()
      ? description.trim()
      : "Continue with your task or describe the next step.";
  return {
    form: {
      title: "Agent",
      description: desc,
      input: [
        { name: "message", type: "text", label: "Message", required: true },
      ],
    },
  };
}

/**
 * When the LLM hub fails but the session must stay usable (router follow-up, hub outage),
 * provide the same shapes as agent-request.json / dialog-request.json when transforms did not yield execute.
 */
function defaultExecuteWhenLlmUnavailable(
  schemaName: string,
): Record<string, unknown> | null {
  if (isAgentSchemaName(schemaName)) {
    return buildAgentFallbackExecute(
      "Model hub is unavailable. You can still type a message; the session uses context.task and the agent prompt.",
    );
  }
  if (schemaName === "dialog") {
    return {
      form: {
        title: "AI Assistant",
        description: "Enter your message",
        input: [
          { name: "message", type: "text", label: "Message", required: true },
        ],
      },
    };
  }
  return null;
}

/**
 * If context.task is set but history has no user line, prepend one so Client API / proba semantic checks match materialize behavior.
 */
function ensureTaskUserInHistory(
  context: Record<string, unknown> | undefined,
): void {
  if (!context || typeof context !== "object") {
    return;
  }
  const task = context["task"];
  if (typeof task !== "string" || !task.trim()) {
    return;
  }
  const rawHist = context["history"];
  const history: unknown[] = Array.isArray(rawHist) ? [...rawHist] : [];
  context["history"] = history;
  const hasUser = history.some(
    (h: unknown) =>
      h &&
      typeof h === "object" &&
      !Array.isArray(h) &&
      String((h as Record<string, unknown>)["role"]).toLowerCase() === "user",
  );
  if (!hasUser) {
    history.unshift({ role: "user", message: task.trim() });
  }
}

/** Proba / UI expect workbench.sections; gray-room may only populate slots. */
function ensureWorkbenchSectionsShape(
  context: Record<string, unknown> | undefined,
): void {
  if (!context || typeof context !== "object") {
    return;
  }
  const wb = context["workbench"];
  if (wb === undefined || wb === null) {
    context["workbench"] = { sections: {} };
    return;
  }
  if (typeof wb !== "object" || Array.isArray(wb)) {
    context["workbench"] = { sections: {} };
    return;
  }
  const w = wb as Record<string, unknown>;
  if (w["sections"] === undefined) {
    w["sections"] = {};
  } else if (
    typeof w["sections"] !== "object" ||
    w["sections"] === null ||
    Array.isArray(w["sections"])
  ) {
    w["sections"] = {};
  }
}
function extractDialogFallbackAssistantText(responseMd: string): string {
  const trimmed = (responseMd || "").trim();
  if (!trimmed) {
    return "The model returned no visible text (empty response). Check LLM hub / model settings.";
  }
  const parsed = tryParseJsonFromLlmText(trimmed);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const p = parsed as Record<string, unknown>;
    const ex = p["execute"];
    if (ex && typeof ex === "object" && !Array.isArray(ex)) {
      const msg = (ex as Record<string, unknown>)["message"];
      if (typeof msg === "string" && msg.trim()) {
        return msg.trim();
      }
    }
    const topMsg = p["message"];
    if (typeof topMsg === "string" && topMsg.trim()) {
      return topMsg.trim();
    }
  }
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim());
  const first = lines.find((l) => l.length > 0);
  return first ?? trimmed.slice(0, 500);
}

/**
 * Gray-room response transform can yield context patches without `execute`, which breaks the Client API
 * (persisted server-response.json is context-only). For dialog schema, synthesize a standard continue form.
 */
function ensureDialogExecuteWhenMissing(
  result: ProcessResult,
  schemaName: string,
  responseMd: string,
): void {
  if (schemaName !== "dialog") {
    return;
  }
  if (result.outcome === "failed") {
    return;
  }
  if (!isDialogExecuteMissingOrEmpty(result.execute)) {
    return;
  }

  const ctx = result.context as Record<string, unknown> | undefined;
  let text = lastAssistantMessageFromContext(ctx);
  if (!text) {
    text = extractDialogFallbackAssistantText(responseMd);
  }

  const baseCtx: Record<string, unknown> =
    ctx && typeof ctx === "object" && !Array.isArray(ctx) ? { ...ctx } : {};
  const hist: unknown[] = Array.isArray(baseCtx["history"])
    ? [...(baseCtx["history"] as unknown[])]
    : [];
  const hasAssistant = hist.some(
    (row) =>
      row &&
      typeof row === "object" &&
      !Array.isArray(row) &&
      (row as Record<string, unknown>)["role"] === "assistant",
  );
  if (!hasAssistant && text) {
    hist.push({ role: "assistant", message: text });
    baseCtx["history"] = hist;
  }

  result.context = baseCtx as RequestContextBlock;
  result.execute = {
    form: {
      title: "Dialog",
      description: text,
      input: [
        {
          name: "message",
          type: "text",
          label: "Message",
          required: false,
        },
      ],
    },
  };

  logger.warn(
    "[DialogRequestProcessor] Dialog gray-room result had no execute; applied fallback form",
    {
      preview: text.slice(0, 120),
    },
  );
}

/**
 * Agent gray-room path can return context-only (LLM/transform failure). Synthesize a continue form so invoke responses stay Client-API-shaped.
 */
function ensureAgentExecuteWhenMissing(
  result: ProcessResult,
  schemaName: string,
  responseMd: string,
): void {
  if (!isAgentSchemaName(schemaName)) {
    return;
  }
  if (result.outcome === "failed") {
    return;
  }
  if (!isDialogExecuteMissingOrEmpty(result.execute)) {
    return;
  }

  const ctx = result.context as Record<string, unknown> | undefined;
  let text = lastAssistantMessageFromContext(ctx);
  if (!text) {
    text = extractDialogFallbackAssistantText(responseMd);
  }
  if (!text) {
    text = "Continue with your task or describe the next step.";
  }

  const baseCtx: Record<string, unknown> =
    ctx && typeof ctx === "object" && !Array.isArray(ctx) ? { ...ctx } : {};
  const hist: unknown[] = Array.isArray(baseCtx["history"])
    ? [...(baseCtx["history"] as unknown[])]
    : [];
  const hasAssistant = hist.some(
    (row) =>
      row &&
      typeof row === "object" &&
      !Array.isArray(row) &&
      (row as Record<string, unknown>)["role"] === "assistant",
  );
  if (!hasAssistant && text) {
    hist.push({ role: "assistant", message: text });
    baseCtx["history"] = hist;
  }

  result.context = baseCtx as RequestContextBlock;
  result.execute = buildAgentFallbackExecute(text);

  logger.warn(
    "[DialogRequestProcessor] Agent gray-room result had no execute; applied fallback form",
    {
      preview: text.slice(0, 120),
    },
  );
}

function finalizeDialogGrayRoomResult(
  grayRoomResult: ProcessResult,
  schemaName: string,
  responseMd: string,
): void {
  normalizeAgentSpuriousRequestAfterPipeline(grayRoomResult, schemaName);
  ensureDialogExecuteWhenMissing(grayRoomResult, schemaName, responseMd);
  ensureAgentExecuteWhenMissing(grayRoomResult, schemaName, responseMd);
  const ctx = grayRoomResult.context as Record<string, unknown> | undefined;
  ensureWorkbenchSectionsShape(ctx);
  ensureTaskUserInHistory(ctx);
}

export class DialogRequestProcessor extends BaseRequestProcessor {
  private promptsTransformsPath: string;

  constructor(promptsTransformsPath?: string) {
    super("DialogRequestProcessor", {});
    this.promptsTransformsPath =
      promptsTransformsPath ?? getPromptsTransformsPath();
  }

  canProcess(request: RequestContext): boolean {
    return resolveTransformSchema(request.context) !== null;
  }

  getRequestType(): RequestType {
    return "dialog";
  }

  protected async doProcess(request: RequestContext): Promise<ProcessResult> {
    const { promiseId, context, message: requestMessage } = request;
    const { executeLlmCall } = await import("./llm-orchestration");

    const ctx = normalizeContext(context, requestMessage);
    if (context.session_id) {
      ctx.session_id = context.session_id;
    }
    const grayRoomChain = shouldUseGrayRoom(ctx).shouldTrigger;
    const schema = resolveTransformSchema(ctx);

    if (!schema) {
      return dialogFailedWithContext(ctx, "transformSchema required");
    }

    const schemaName = extractSchemaName(schema);
    const aiHubUrl = resolveAiHubBaseUrl();
    const model = resolveLlmModelFromContext(ctx);

    logger.info("[DialogRequestProcessor] Processing", { promiseId });

    let allowContextAugment = true;

    try {
      // Check for dialog INITIAL request (no history yet) to return form directly without LLM
      // For follow-up requests (history exists), we MUST call LLM to get assistant response
      const hasHistory =
        Array.isArray(ctx["history"]) && ctx["history"].length > 0;
      if (
        schemaName === "dialog" &&
        !hasHistory &&
        !resolveResultObject(ctx)?.message
      ) {
        return {
          outcome: "success",
          execute: {
            form: {
              input: [
                {
                  name: "task",
                  type: "text",
                  label: "Enter your task",
                  required: true,
                },
              ],
            },
          },
          context: ctx as RequestContextBlock,
        };
      }

      const existingLlmId = ctx["llmPromiseId"] as string | undefined;
      if (existingLlmId) {
        const { recoverDialogFromLlmPromise } =
          await import("./response-path");
        const recoveryOutcome = await recoverDialogFromLlmPromise(
          promiseId,
          ctx,
          existingLlmId,
        );

        if (recoveryOutcome.tag === "pending") {
          return dialogFailedWithContext(ctx, "LLM promise still pending");
        }
        if (recoveryOutcome.tag === "failed") {
          return dialogFailedWithContext(
            ctx,
            recoveryOutcome.error || "LLM recovery failed",
          );
        }
        if (recoveryOutcome.tag === "resubmit") {
          const cnt =
            await requestService.incrementHubLlmResubmitCount(promiseId);
          const maxR = readDialogHubLlmResubmitMax();
          if (cnt > maxR) {
            return dialogFailedWithContext(
              ctx,
              `LLM hub promise lost after ${maxR} resubmit(s); start a new turn or check AI hub`,
            );
          }
          await requestService.clearLlmPromiseId(promiseId);
          delete ctx["llmPromiseId"];
          allowContextAugment = false;
        } else if (recoveryOutcome.tag === "done") {
          const r = recoveryOutcome.result;
          if (
            r.context &&
            typeof r.context === "object" &&
            !Array.isArray(r.context)
          ) {
            const sessionIdValue = ctx["session_id"];
            if (sessionIdValue && typeof sessionIdValue === "string") {
              r.context = { ...r.context, session_id: sessionIdValue };
            }
          }
          // Same normalization as after grayRoom.runLoop (recovery skips that path).
          finalizeDialogGrayRoomResult(r, schemaName, "");
          return r;
        }
      }

      if (!ctx["llmPromiseId"]) {
        if (allowContextAugment) {
          // Внедрение априорных знаний через CognitionBase
          try {
            const cognition = new CognitionBase();
            const topic =
              (ctx["task"] as string) ||
              (ctx["message"] as string) ||
              "general";
            const sessionId = (ctx["session_id"] as string) || "startup";

            const priors = await cognition.injectPriors(
              topic,
              sessionId,
              { query: async () => [] }, // LessonStore stub
              { query: async () => [] }, // PatternStore stub
            );

            const priorStr = cognition.formatForContext(priors);
            if (priorStr && typeof ctx["message"] === "string") {
              ctx["message"] = ctx["message"] + "\n\n" + priorStr;
            }
          } catch (err) {
            logger.warn(
              "[DialogRequestProcessor] CognitionBase injection failed",
              { error: String(err) },
            );
          }
        }

        // -- HIERARCHICAL DESIGN RESONER (ADR-0061) --
        const taskText =
          (ctx["task"] as string) || (ctx["message"] as string) || "";
        const isUITask =
          /ui|component|style|design|vue|react|html|css|layout|aesthetic|premium/i.test(
            taskText,
          );
        if (isUITask) {
          try {
            const manifesto = await globalDesignReasoner.generateManifesto(
              taskText,
              ctx,
            );
            ctx["message"] =
              `[DESIGN_MANIFESTO_INJECTED]\n${manifesto.raw_manifesto}\n\n[USER_TASK]\n${ctx["message"]}`;
            logger.info(
              "[DialogRequestProcessor] Design manifesto injected into message",
            );
          } catch (err) {
            logger.warn("[DialogRequestProcessor] DesignReasoner failed", {
              error: String(err),
            });
          }
        }

        const llmResult = await executeLlmCall({
          promptsTransformsPath: this.promptsTransformsPath,
          schemaName,
          ctx,
          promiseId,
          base: aiHubUrl,
          model,
        });

        if (!llmResult.success || !llmResult.responseMd) {
          const execFromTransform =
            llmResult.requestTransformExecute &&
            Object.keys(llmResult.requestTransformExecute).length > 0;
          // Request transforms produced a form (e.g. Agent Mode): use it even when history exists
          // (router → agent was previously hard-failing with llm_error while the form was already valid).
          if (execFromTransform) {
            await requestService.patchRequestContext(promiseId, {
              requestPhase: "llm_form_fallback",
            });
            return {
              outcome: "success",
              execute: llmResult.requestTransformExecute,
              context: {
                ...ctx,
                ...((llmResult.requestTransformContext as Record<
                  string,
                  unknown
                >) ?? {}),
                // Final updateStatus merges this onto stored context; transforms must not
                // overwrite patched requestPhase with a stale llm_error.
                requestPhase: "llm_form_fallback",
              } as unknown as RequestContextBlock,
            };
          }
          const fallbackExecute = defaultExecuteWhenLlmUnavailable(schemaName);
          if (fallbackExecute) {
            await requestService.patchRequestContext(promiseId, {
              requestPhase: "llm_form_fallback",
            });
            return {
              outcome: "success",
              execute: fallbackExecute,
              context: {
                ...(ctx as Record<string, unknown>),
                requestPhase: "llm_form_fallback",
              } as unknown as RequestContextBlock,
            };
          }
          return dialogFailedWithContext(
            ctx,
            llmResult.error || "LLM call failed",
          );
        }

        // Trigger gray room feature for post_llm_call event
        // await featureManager.trigger({
        //   type: "post_llm_call",
        //   context: ctx,
        //   data: llmResult.responseMd,
        // });

        // Note: Gray room modifications are applied directly to ctx via feature system
        // For backward compatibility, we still need to call finalize function
        // but we need to construct a minimal gray room result for it
        const minimalGrayRoomResult = {
          context: ctx,
          outcome: llmResult.outcome,
          execute: llmResult.execute,
          requestPhase: llmResult.requestPhase,
        };

        finalizeDialogGrayRoomResult(
          minimalGrayRoomResult,
          schemaName,
          llmResult.responseMd,
        );

        return minimalGrayRoomResult;
      }

      return dialogFailedWithContext(
        ctx,
        "Unexpected dialog state (llmPromiseId still set)",
      );
    } catch (err) {
      logger.error("[DialogRequestProcessor] Failed", { error: String(err) });
      return dialogFailedWithContext(
        ctx,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

export const dialogRequestProcessor = new DialogRequestProcessor();
