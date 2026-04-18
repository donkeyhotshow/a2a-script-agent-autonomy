/**
 * Typed client for the A2A Client API (/api/a2a/*).
 * All calls go through the Next.js proxy route which forwards to the backend.
 */

const BASE = "/api/a2a"

export interface SessionDTO {
  id: string
  title?: string
  status?: "idle" | "active" | "completed" | "error" | "stopped"
  createdAt?: string
  updatedAt?: string
}

export interface AsyncPollResult {
  asyncPending: boolean
  status?: string
  execute?: Record<string, unknown>
  result?: Record<string, unknown>
  completed?: boolean
  error?: string | null
  message?: string
  context?: Record<string, unknown>
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  }
  if (body !== undefined) init.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, init)
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Invalid JSON from ${path}: ${text.slice(0, 50)}`)
  }
  if (!res.ok) {
    const payload = data as Record<string, unknown> | null
    throw new Error(
      String(payload?.error ?? payload?.message ?? `HTTP ${res.status}`)
    )
  }
  return data as T
}

function unwrapSession(payload: unknown): SessionDTO {
  if (payload && typeof payload === "object") {
    const p = payload as Record<string, unknown>
    if (p.session && typeof p.session === "object") return p.session as SessionDTO
    if (p.success && p.data && typeof p.data === "object") return p.data as SessionDTO
  }
  return payload as SessionDTO
}

export async function createSession(title?: string): Promise<SessionDTO> {
  const raw = await request<unknown>("POST", "/sessions", title ? { title } : {})
  return unwrapSession(raw)
}

export async function listSessions(): Promise<SessionDTO[]> {
  const raw = await request<unknown>("GET", "/sessions")
  if (Array.isArray(raw)) return raw as SessionDTO[]
  const r = raw as Record<string, unknown>
  if (r.success && Array.isArray(r.data)) return r.data as SessionDTO[]
  if (r.sessions && Array.isArray(r.sessions)) return r.sessions as SessionDTO[]
  return []
}

export async function getSession(sessionId: string): Promise<SessionDTO> {
  const raw = await request<unknown>("GET", `/sessions/${encodeURIComponent(sessionId)}`)
  return unwrapSession(raw)
}

export async function postNext(
  sessionId: string,
  submitResult?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(
    "POST",
    `/sessions/${encodeURIComponent(sessionId)}/next`,
    submitResult !== undefined ? { result: submitResult } : {}
  )
}

export async function pollAsync(sessionId: string): Promise<AsyncPollResult> {
  return request<AsyncPollResult>(
    "GET",
    `/sessions/${encodeURIComponent(sessionId)}/async`
  )
}

export async function stopSession(sessionId: string): Promise<void> {
  await request("POST", `/sessions/${encodeURIComponent(sessionId)}/stop`, {})
}
