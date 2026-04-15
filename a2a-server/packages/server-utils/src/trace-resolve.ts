import type { IncomingHttpHeaders } from "node:http";
import { A2A_TRACE_CONTEXT_KEY } from "./trace-constants.js";

/**
 * Prefer client-provided trace id; otherwise use server `promiseId` (backward compatible).
 */
export function resolveA2aTraceId(
  ctx: Record<string, unknown> | undefined,
  promiseId: string,
): string {
  const raw = ctx?.[A2A_TRACE_CONTEXT_KEY];
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw.trim();
  }
  return promiseId;
}

/** Read trace id from Express/Node `req.headers` (case-insensitive). */
export function readA2aTraceIdFromHeaders(
  headers: IncomingHttpHeaders | undefined,
): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const v = headers["x-a2a-trace-id"] ?? headers["X-A2A-Trace-Id"];
  const raw = Array.isArray(v) ? v[0] : v;
  const s = typeof raw === "string" ? raw.trim() : "";
  return s || undefined;
}
