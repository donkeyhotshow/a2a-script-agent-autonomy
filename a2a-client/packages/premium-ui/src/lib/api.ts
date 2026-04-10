/**
 * Client API — обёртка над /api/a2a/*
 * Работает как в dev (Next.js на :3000 проксирует на :5173),
 * так и напрямую через BASE_URL.
 */

// В dev Next.js сервер на :3000, Client API на :5173
// Используем относительный путь — Next.js будет проксировать через rewrites,
// либо обращаемся напрямую к :5173
const BASE = process.env.NEXT_PUBLIC_CLIENT_API_URL ?? "http://localhost:5173";

export interface ApiSession {
  id: string;
  title: string;
  status: "created" | "active" | "completed" | "failed";
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  context?: {
    execution?: { action?: string; step?: string };
    task?: string;
    llmModel?: string;
  };
  execute?: {
    message?: string;
    form?: {
      input?: Array<{ name: string; type: string; label: string; required?: boolean }>;
      choices?: Array<{ id: string; label: string; description?: string }>;
    };
    wait?: boolean;
  };
  messages?: Array<{ role: string; content: string; step?: number }>;
}

export interface ApiProject {
  id: string;
  name: string;
  path?: string;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<ApiProject[]> {
  const r = await fetch(`${BASE}/api/a2a/projects`);
  if (!r.ok) throw new Error(`GET /projects → ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : (data.projects ?? []);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function fetchSessions(projectId?: string): Promise<ApiSession[]> {
  const url = projectId
    ? `${BASE}/api/a2a/sessions?projectId=${encodeURIComponent(projectId)}`
    : `${BASE}/api/a2a/sessions`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GET /sessions → ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : (data.sessions ?? []);
}

export async function fetchSession(id: string): Promise<ApiSession> {
  const r = await fetch(`${BASE}/api/a2a/sessions/${id}?includeContext=1`);
  if (!r.ok) throw new Error(`GET /sessions/${id} → ${r.status}`);
  return r.json();
}

export async function createSession(opts: {
  title?: string;
  task?: string;
  mode?: "agent" | "dialog" | "task-decomposition";
  llmModel?: string;
  projectId?: string;
}): Promise<ApiSession> {
  const r = await fetch(`${BASE}/api/a2a/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  if (!r.ok) throw new Error(`POST /sessions → ${r.status}`);
  return r.json();
}

// ── Turn: next + poll async ───────────────────────────────────────────────────

export async function sendNext(
  sessionId: string,
  body: { task?: string; result?: Record<string, unknown> }
): Promise<void> {
  const r = await fetch(`${BASE}/api/a2a/sessions/${sessionId}/next`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST /next → ${r.status}`);
}

export async function pollAsync(
  sessionId: string,
  opts: { maxAttempts?: number; intervalMs?: number } = {}
): Promise<ApiSession> {
  const { maxAttempts = 120, intervalMs = 1500 } = opts;
  for (let i = 0; i < maxAttempts; i++) {
    const r = await fetch(`${BASE}/api/a2a/sessions/${sessionId}/async`);
    if (!r.ok) throw new Error(`GET /async → ${r.status}`);
    const data: ApiSession = await r.json();
    // settled when execute exists and no pending promise
    if (data.execute && !("promisePending" in (data as any))) return data;
    if (data.status === "completed" || data.status === "failed") return data;
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error("pollAsync: timeout");
}

// ── Full turn helper ──────────────────────────────────────────────────────────
// POST /next → poll /async → return settled session

export async function sendMessage(
  sessionId: string,
  text: string,
  llmModel?: string
): Promise<ApiSession> {
  await sendNext(sessionId, { task: text });
  return pollAsync(sessionId);
}
