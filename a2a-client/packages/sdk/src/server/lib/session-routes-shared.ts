/**
 * Shared between sessions-read, sessions-async, and sessions-mutation route modules.
 */

import type { Response } from "express";
import { sessionService } from "../services/session-service.js";
import {
  saveRequestToServer,
  saveServerPromise,
  saveServerResponse,
} from "../services/step-storage.js";
import { serverFetch, getServerBaseUrl } from "../services/index.js";
import { applyAgentRagChainAfterSyncInvoke } from "./agent-rag-chain.js";
import {
  extractA2aExecute,
  sanitizeInvokeBodyForA2aUpstream,
} from "./a2a-invoke-builders.js";
import { pickInvokeContextPatch } from "./context-invoke-patch.js";
import { sanitizeApiRecordExecuteFields } from "./web-execute-dto.js";
import { parseA2aInvokeResponse } from "../../client-api-envelope.js";
import { deriveSessionStage } from "@a2a-client/shared/session-stage-derive.js";
import { validateRequestToServer } from "@a2a-server/protocol";

/** Vite `toMinimalNextAck` parity: success ack omits transport `promiseId`; use `asyncPending` + GET `/async`. */
export function buildMinimalNextAck(step: number, promiseId: string | null) {
  return {
    success: true as const,
    accepted: true as const,
    step,
    asyncPending: !!promiseId,
  };
}

export function getStepNum(session: {
  metadata?: Record<string, unknown>;
}): number {
  const n = session.metadata?.stepNum;
  return typeof n === "number" ? n : 1;
}

export function setStepNum(sessionId: string, stepNum: number): void {
  const s = sessionService.getSession(sessionId);
  if (s) {
    sessionService.updateSession(sessionId, {
      metadata: { ...s.metadata, stepNum },
    });
  }
}

/** Match Vite `toPublicSession(..., false)` — omit context in JSON. */
export function stripContextForWeb<T extends Record<string, unknown>>(
  obj: T | null | undefined,
): Omit<T, "context"> | null {
  if (!obj || typeof obj !== "object") return null;
  const { context: _c, ...rest } = obj;
  return rest as Omit<T, "context">;
}

function isActivePromiseStatusForProjection(st: unknown): boolean {
  return st === "pending" || st === "processing" || st === "waiting";
}

/**
 * Vite `toPublicSession(session, true)` parity: on full session dumps (`includeContext=1`), attach
 * `asyncPending`, `promiseStatus`, and `stage` so drivers match WEB_UI_PROTOCOL / projection DTO.
 */
export function applyIncludeContextSessionProjection(
  session: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...session };
  const promiseId = session.promiseId;
  const promiseStatus = session.promiseStatus;
  const asyncPending =
    session.asyncPending ??
    !!(
      typeof promiseId === "string" &&
      isActivePromiseStatusForProjection(promiseStatus)
    );
  out.asyncPending = asyncPending;
  out.promiseStatus = promiseStatus ?? null;
  out.stage = deriveSessionStage({
    execute: (out.execute ?? null) as Record<string, unknown> | null,
    context: (out.context ?? null) as Record<string, unknown> | null,
    asyncPending,
    status: (out.status ?? null) as string | null,
  });
  return out;
}

export function toWebClientSessionPayload<T extends Record<string, unknown>>(
  obj: T | null | undefined,
) {
  const stripped = stripContextForWeb(obj);
  if (!stripped) return null;
  return sanitizeApiRecordExecuteFields(stripped as Record<string, unknown>);
}

/** Validate request-to-server before sending to A2A: task|context required, context.execution valid when present
 *  * Imported from @a2a-server/protocol to avoid duplication
 *  */
  }
  return null;
}

export async function invokeAndPersistContinuation(params: {
  sessionId: string;
  nextStep: number;
  requestBody: Record<string, unknown>;
  upstreamErrorCode: string;
  res: Response;
}): Promise<{ ackStep: number; promiseId: string | null } | null> {
  const { sessionId, nextStep, requestBody, upstreamErrorCode, res } = params;
  let serverResponse: Record<string, unknown> | null = null;
  let promiseId: string | null = null;
  let ackStep = nextStep;
  try {
    const serverBase = await getServerBaseUrl();
    const upstreamBody = sanitizeInvokeBodyForA2aUpstream(
      requestBody,
    ) as Record<string, unknown>;
    const err = validateRequestToServer({
      context: upstreamBody.context as Record<string, unknown>,
    });
    if (err) {
      res
        .status(400)
        .json({
          success: false,
          error: { code: "INVALID_REQUEST", message: err },
        });
      return null;
    }
    await saveRequestToServer(sessionId, nextStep, {
      step: nextStep,
      ...upstreamBody,
    });
    const upstream = await serverFetch(
      "POST",
      serverBase,
      "/api/v1/invoke",
      upstreamBody,
    );
    serverResponse = (await upstream.json()) as Record<string, unknown>;
    if (!upstream.ok || !serverResponse) {
      res.status(upstream.status >= 400 ? upstream.status : 502).json({
        success: false,
        error: { code: upstreamErrorCode, message: "A2A invoke failed" },
      });
      return null;
    }
    const unwrapped = parseA2aInvokeResponse(
      serverResponse as Record<string, unknown>,
    );
    promiseId = unwrapped.promiseId;
    if (promiseId) {
      await saveServerPromise(sessionId, nextStep, {
        promiseId,
        status: (unwrapped.data?.status as string) || "pending",
        submittedAt: new Date().toISOString(),
      });
      setStepNum(sessionId, nextStep);
    } else if (unwrapped.data) {
      await saveServerResponse(sessionId, nextStep, {
        step: nextStep,
        ...unwrapped.data,
      });
      setStepNum(sessionId, nextStep);
    }
    if (unwrapped.context && typeof unwrapped.context === "object") {
      sessionService.updateSessionContext(
        sessionId,
        pickInvokeContextPatch(unwrapped.context),
      );
    }
    if (unwrapped.execute && typeof unwrapped.execute === "object") {
      sessionService.updateSession(sessionId, {
        currentExecute: unwrapped.execute as Record<string, unknown>,
      });
    }
    ackStep = await persistSyncThenRagChain(
      sessionId,
      nextStep,
      serverResponse as Record<string, unknown>,
      unwrapped.promiseId,
    );
    return { ackStep, promiseId };
  } catch (serverError) {
    res.status(503).json({
      success: false,
      error: {
        code: upstreamErrorCode,
        message:
          serverError instanceof Error ? serverError.message : "Upstream error",
      },
    });
    return null;
  }
}

/** After a terminal upstream response is merged (no in-flight `promiseId` for this step), run client rag-search chain (parity with Vite stepRoutes). */
export async function persistSyncThenRagChain(
  sessionId: string,
  startStep: number,
  serverResponse: Record<string, unknown> | null,
  promiseId: string | null,
): Promise<number> {
  if (!serverResponse || promiseId) return startStep;
  const sess = sessionService.getSession(sessionId);
  const rawCtx = sess?.context;
  if (!rawCtx || typeof rawCtx !== "object") return startStep;
  const ctx = rawCtx as Record<string, unknown>;
  const out = await applyAgentRagChainAfterSyncInvoke({
    sessionId,
    startStepNum: startStep,
    serverResponse,
    context: ctx,
  });
  if (out.finalStep > startStep) {
    setStepNum(sessionId, out.finalStep);
    sessionService.updateSessionContext(sessionId, out.finalContext);
    const fe = extractA2aExecute(out.finalResponse);
    if (fe) {
      sessionService.updateSession(sessionId, { currentExecute: fe });
    }
  }
  return out.finalStep;
}
