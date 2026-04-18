/**
 * bridge/poller.ts — Polls GET /sessions/:id/async until the agent response is ready.
 * Calls onPartial on every non-terminal tick so callers can show "typing" status.
 */
import { config } from "../config.js"
import { pollAsync, getSession, type PollResult } from "./a2a-client.js"

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function isComplete(result: PollResult): boolean {
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
  const maxAttempts = config.a2a.pollMaxAttempts
  const interval = config.a2a.pollIntervalMs

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

  // Timeout — hydrate from session snapshot for best available state
  console.warn(`[poller] Timeout after ${maxAttempts} attempts for session ${sessionId}`)
  try {
    const snapshot = await getSession(sessionId)
    return {
      asyncPending: false,
      status: snapshot.status ?? "timeout",
      stage: snapshot.stage,
      execute: {
        message:
          "⏱ The agent took too long to respond. Use /status to check the current state.",
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
