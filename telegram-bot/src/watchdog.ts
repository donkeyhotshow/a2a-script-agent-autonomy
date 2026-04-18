/**
 * watchdog.ts — Kills stuck polling sessions and notifies the user.
 * Each active poll registers itself; the watchdog fires after timeout_seconds.
 */
import { config } from "./config.js"

type NotifyFn = (message: string) => Promise<void>

interface WatchEntry {
  timer: ReturnType<typeof setTimeout>
  sessionId: string
  abortController: AbortController
}

const entries = new Map<number, WatchEntry>()

/**
 * Register a poll operation for watchdog supervision.
 * @param chatId     — Telegram chat ID
 * @param sessionId  — A2A session ID being polled
 * @param notify     — callback to send a Telegram message to the user
 * @returns an AbortController whose signal can be checked by the poller
 */
export function watchdogRegister(
  chatId: number,
  sessionId: string,
  notify: NotifyFn
): AbortController {
  // Cancel any pre-existing watchdog for this chat
  watchdogCancel(chatId)

  const abortController = new AbortController()

  const timer = setTimeout(async () => {
    entries.delete(chatId)
    abortController.abort()
    console.warn(
      `[watchdog] Timeout for chat ${chatId} session ${sessionId} after ${config.watchdog.timeoutSeconds}s`
    )
    if (config.watchdog.notifyOnTimeout) {
      try {
        await notify(
          `⏱ *Watchdog timeout*\nThe agent did not respond within ${config.watchdog.timeoutSeconds}s\\.\nUse /status to check or /new to start fresh\\.`
        )
      } catch (err) {
        console.error("[watchdog] Failed to notify user:", err)
      }
    }
  }, config.watchdog.timeoutSeconds * 1000)

  entries.set(chatId, { timer, sessionId, abortController })
  return abortController
}

/** Cancel the watchdog for a chat (call when poll completes normally). */
export function watchdogCancel(chatId: number): void {
  const entry = entries.get(chatId)
  if (entry) {
    clearTimeout(entry.timer)
    entries.delete(chatId)
  }
}
