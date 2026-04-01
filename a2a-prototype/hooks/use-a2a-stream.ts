'use client';
/**
 * useA2AStream — ADR-Premium-UI §16.3
 *
 * React hook that drives a full A2A session:
 *   1. Creates a session (POST /api/a2a/sessions)
 *   2. Sends the initial task (POST /api/a2a/sessions/{id}/next)
 *   3. Polls for results (GET /api/a2a/sessions/{id}/async) until terminal
 *   4. Exposes live messages[], current execute block, and session state
 *
 * The hook is intentionally transport-agnostic (HTTP polling).  A WebSocket
 * layer can be swapped in by replacing the `pollAsync` implementation.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface A2AMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface A2AExecuteBlock {
  [key: string]: unknown;
}

export type StreamStatus =
  | 'idle'
  | 'creating'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'error';

export interface UseA2AStreamOptions {
  /** Base URL for Client API — defaults to same origin via Next.js rewrite */
  apiUrl?: string;
  /** Polling interval in ms when waiting for async response (default: 1 500) */
  pollIntervalMs?: number;
  /** Maximum number of poll attempts before declaring timeout (default: 80) */
  maxPollAttempts?: number;
  /** Called whenever a new message arrives */
  onMessage?: (message: A2AMessage) => void;
  /** Called when the session reaches a terminal state */
  onComplete?: (sessionId: string) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export interface UseA2AStreamReturn {
  /** Ordered conversation messages */
  messages: A2AMessage[];
  /** Latest execute block from the server (null when idle) */
  execute: A2AExecuteBlock | null;
  /** Operational status */
  status: StreamStatus;
  /** Current session id (null when not yet created) */
  sessionId: string | null;
  /** Start a new session with a task string */
  start: (task: string, projectId?: string) => Promise<void>;
  /** Send a follow-up message / choice to an existing session */
  send: (taskOrChoice: string) => Promise<void>;
  /** Abort the current session */
  abort: () => void;
  /** Validation / transport error (null when clean) */
  error: Error | null;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function apiFetch(url: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`A2A API ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useA2AStream(options: UseA2AStreamOptions = {}): UseA2AStreamReturn {
  const {
    apiUrl = '/api/a2a',
    pollIntervalMs = 1_500,
    maxPollAttempts = 80,
    onMessage,
    onComplete,
    onError,
  } = options;

  const [messages, setMessages] = useState<A2AMessage[]>([]);
  const [execute, setExecute] = useState<A2AExecuteBlock | null>(null);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef(false);
  const pollAttemptsRef = useRef(0);

  // ── Message helpers ─────────────────────────────────────────────────────

  const pushMessage = useCallback(
    (msg: A2AMessage) => {
      setMessages((prev) => [...prev, msg]);
      onMessage?.(msg);
    },
    [onMessage],
  );

  // ── Polling loop ────────────────────────────────────────────────────────

  const pollAsync = useCallback(
    async (sid: string): Promise<void> => {
      pollAttemptsRef.current = 0;

      while (!abortRef.current) {
        if (pollAttemptsRef.current >= maxPollAttempts) {
          const err = new Error('A2A stream timed out waiting for response');
          abortRef.current = true; // ensure loop terminates after return
          setError(err);
          setStatus('error');
          onError?.(err);
          return;
        }

        await new Promise<void>((r) => setTimeout(r, pollIntervalMs));
        pollAttemptsRef.current++;

        let asyncResult: Record<string, unknown>;
        try {
          asyncResult = (await apiFetch(
            `${apiUrl}/sessions/${sid}/async`,
          )) as Record<string, unknown>;
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err));
          setError(e);
          setStatus('error');
          onError?.(e);
          return;
        }

        const execBlock = asyncResult['execute'] as A2AExecuteBlock | undefined;
        if (execBlock) setExecute(execBlock);

        // Extract assistant message if present
        const ctx = asyncResult['context'] as Record<string, unknown> | undefined;
        const history = ctx?.['history'] as Array<Record<string, unknown>> | undefined;
        if (Array.isArray(history) && history.length > 0) {
          const last = history[history.length - 1] as Record<string, unknown>;
          const role = (last['role'] as string) ?? 'assistant';
          const content = (last['message'] as string) ?? JSON.stringify(last);
          const msg: A2AMessage = {
            role: role === 'user' ? 'user' : 'assistant',
            content,
            timestamp: new Date().toISOString(),
          };
          pushMessage(msg);
        }

        // Terminal check
        const isTerminal =
          asyncResult['status'] === 'completed' ||
          asyncResult['status'] === 'stopped' ||
          (execBlock && 'form' in execBlock);

        if (isTerminal) {
          setStatus(
            asyncResult['status'] === 'stopped' ? 'completed' : 'waiting',
          );
          // If it's truly done (no more input needed), mark completed
          if (asyncResult['status'] === 'completed') {
            setStatus('completed');
            onComplete?.(sid);
          }
          return;
        }
      }
    },
    [apiUrl, maxPollAttempts, pollIntervalMs, onError, onComplete, pushMessage],
  );

  // ── Public API ──────────────────────────────────────────────────────────

  const start = useCallback(
    async (task: string, projectId = 'default'): Promise<void> => {
      abortRef.current = false;
      setMessages([]);
      setExecute(null);
      setError(null);
      setStatus('creating');

      // Record the user's task as a message
      pushMessage({ role: 'user', content: task, timestamp: new Date().toISOString() });

      try {
        // 1. Create session
        const session = (await apiFetch(`${apiUrl}/sessions`, {
          method: 'POST',
          body: JSON.stringify({ projectId, mode: 'agent', task }),
        })) as Record<string, unknown>;

        const sid = session['id'] as string;
        setSessionId(sid);
        setStatus('running');

        // 2. Send initial task
        await apiFetch(`${apiUrl}/sessions/${sid}/next`, {
          method: 'POST',
          body: JSON.stringify({ task }),
        });

        // 3. Poll for result
        await pollAsync(sid);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setStatus('error');
        onError?.(e);
      }
    },
    [apiUrl, pollAsync, pushMessage, onError],
  );

  const send = useCallback(
    async (taskOrChoice: string): Promise<void> => {
      if (!sessionId) return;

      setStatus('running');
      pushMessage({ role: 'user', content: taskOrChoice, timestamp: new Date().toISOString() });

      try {
        await apiFetch(`${apiUrl}/sessions/${sessionId}/next`, {
          method: 'POST',
          body: JSON.stringify({ task: taskOrChoice }),
        });
        await pollAsync(sessionId);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        setStatus('error');
        onError?.(e);
      }
    },
    [sessionId, apiUrl, pollAsync, pushMessage, onError],
  );

  const abort = useCallback((): void => {
    abortRef.current = true;
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  return { messages, execute, status, sessionId, start, send, abort, error };
}
