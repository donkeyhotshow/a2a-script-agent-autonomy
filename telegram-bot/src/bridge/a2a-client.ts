/**
 * bridge/a2a-client.ts — HTTP client for the A2A server.
 * All functions async, throw on non-2xx responses.
 */
import { config } from "../config.js"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Choice {
  id: string
  label: string
  description?: string
}

export interface FormField {
  name: string
  type: string
  label: string
  required?: boolean
}

export interface PollResult {
  asyncPending: boolean
  status?: string
  stage?: string
  execute?: {
    message?: string
    form?: {
      message?: string
      choices?: Choice[]
      input?: FormField[]
    }
    waiting_state?: {
      reason?: string
      expires_at?: string
    }
  }
  artifacts?: Array<{ type: string; name?: string }>
  error?: string
}

export interface SessionSnapshot {
  id: string
  status?: string
  stage?: string
  messageCount?: number
  context?: Record<string, unknown>
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const url = `${config.a2a.apiUrl}${path}`
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  }
  if (body !== undefined) init.body = JSON.stringify(body)

  const res = await fetch(url, init)
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(
      `[a2a-client] Non-JSON response from ${method} ${url}: ${text.slice(0, 100)}`
    )
  }

  if (!res.ok) {
    const d = data as Record<string, unknown> | null
    const msg = String(d?.error ?? d?.message ?? `HTTP ${res.status}`)
    throw new Error(`[a2a-client] ${method} ${url} → ${res.status}: ${msg}`)
  }
  return data as T
}

// ── Session lifecycle ─────────────────────────────────────────────────────────

export async function createSession(): Promise<string> {
  const raw = await apiFetch<Record<string, unknown>>("POST", "/api/a2a/sessions", {})
  const inner =
    (raw.session as Record<string, unknown> | undefined) ??
    (raw.data as Record<string, unknown> | undefined) ??
    raw
  const id = inner.id ?? inner.sessionId
  if (typeof id !== "string")
    throw new Error(`[a2a-client] createSession: could not extract session ID`)
  return id
}

export async function sendTask(
  sessionId: string,
  task: string
): Promise<Record<string, unknown>> {
  return apiFetch("POST", `/api/a2a/sessions/${encodeURIComponent(sessionId)}/next`, { task })
}

export async function sendChoice(
  sessionId: string,
  choice: string
): Promise<Record<string, unknown>> {
  return apiFetch("POST", `/api/a2a/sessions/${encodeURIComponent(sessionId)}/next`, {
    result: { choice },
  })
}

export async function sendMessage(
  sessionId: string,
  message: string
): Promise<Record<string, unknown>> {
  return apiFetch("POST", `/api/a2a/sessions/${encodeURIComponent(sessionId)}/next`, {
    result: { message },
  })
}

export async function pollAsync(sessionId: string): Promise<PollResult> {
  return apiFetch("GET", `/api/a2a/sessions/${encodeURIComponent(sessionId)}/async`)
}

export async function getSession(sessionId: string): Promise<SessionSnapshot> {
  return apiFetch("GET", `/api/a2a/sessions/${encodeURIComponent(sessionId)}`)
}

export async function stopSession(sessionId: string): Promise<void> {
  await apiFetch("POST", `/api/a2a/sessions/${encodeURIComponent(sessionId)}/stop`, {})
}
