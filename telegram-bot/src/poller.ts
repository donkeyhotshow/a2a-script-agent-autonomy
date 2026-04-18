/**
 * poller.ts — Polls GET /sessions/:id/async until the agent response is ready.
 * Calls onPartial on every tick so callers can show "typing" status.
 */
import { env } from "./env.js"
import { pollAsync, getSession, type PollResult } from "./a2a-client.js"

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function isComplete(result: PollResult): boolean {
  return (
    result.asyncPending === false ||
    result.status === "error" ||
    result.stage === "complete"
  )
}

export async function pollUntilDone(
  sessionId: string,
  onPartial?: (result: PollResult) => void
): Promise<PollResult> {
  const maxAttempts = env.POLL_MAX_ATTEMPTS
  const interval = env.POLL_INTERVAL_MS

  let lastResult: PollResult | null = null

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(interval)
    try {
      lastResult = await pollAsync(sessionId)
    } catch (err) {
      console.error(`[poller] pollAsync attempt ${attempt + 1} failed:`, err)
      continue
    }

    onPartial?.(lastResult)

    if (isComplete(lastResult)) {
      return lastResult
    }
  }

  // Timeout — hydrate from session snapshot
  console.warn(`[poller] Timeout after ${maxAttempts} attempts for session ${sessionId}`)
  try {
    const snapshot = await getSession(sessionId)
    return {
      asyncPending: false,
      status: snapshot.status,
      stage: snapshot.stage,
      execute: {
        message: "⏱ The agent took too long to respond. Try /status for current state.",
      },
    }
  } catch {
    return {
      asyncPending: false,
      status: "timeout",
      execute: { message: "⏱ Request timed out." },
    }
  }
}
