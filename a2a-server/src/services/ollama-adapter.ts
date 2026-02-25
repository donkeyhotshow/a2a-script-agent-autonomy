/**
 * Ollama / external-ai-hub promise-based adapter
 *
 * Реализация на основе плана: plans/ollama-proxy-integration.md
 */

const AI_HUB_URL = process.env.AI_HUB_URL ?? 'http://localhost:11434';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? '2000', 10);
const POLL_TIMEOUT_MS = parseInt(process.env.POLL_TIMEOUT_MS ?? '120000', 10);

export interface OllamaRequest {
  model: string;
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
}

export interface PromiseStatus {
  promiseId: string;
  status: 'pending' | 'done' | 'error';
  error?: string;
}

export async function createOllamaPromise(request: OllamaRequest): Promise<{ promiseId: string }> {
  const res = await fetch(`${AI_HUB_URL}/api/generate?promise=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: request.model,
      prompt: request.prompt,
      messages: request.messages,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`AI Hub error: ${res.status}`);
  const data = (await res.json()) as { promiseId?: string };
  if (!data.promiseId) throw new Error('Missing promiseId in response');
  return { promiseId: data.promiseId };
}

export async function getPromiseStatus(promiseId: string): Promise<PromiseStatus> {
  const res = await fetch(`${AI_HUB_URL}/promise/${promiseId}`);
  if (res.status === 404) throw new Error(`Promise not found: ${promiseId}`);
  if (!res.ok) throw new Error(`AI Hub error: ${res.status}`);
  return (await res.json()) as PromiseStatus;
}

export async function getPromiseResponse(promiseId: string): Promise<Response> {
  return fetch(`${AI_HUB_URL}/promise/${promiseId}/response`);
}

export async function waitForPromise(
  promiseId: string,
  onProgress?: (status: PromiseStatus) => void
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const status = await getPromiseStatus(promiseId);
    onProgress?.(status);
    if (status.status === 'done') {
      const res = await getPromiseResponse(promiseId);
      return res.text();
    }
    if (status.status === 'error') throw new Error(status.error ?? 'Promise failed');
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error('Promise timeout');
}
