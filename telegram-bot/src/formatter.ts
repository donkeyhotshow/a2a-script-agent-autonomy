/**
 * formatter.ts — Converts A2A PollResult to Telegram-friendly text + keyboards.
 */
import { InlineKeyboard } from "grammy"
import type { PollResult } from "./a2a-client.js"

export interface FormattedResponse {
  text: string
  keyboard?: InlineKeyboard
  isWaiting?: boolean
}

/**
 * Escape characters that have special meaning in Telegram MarkdownV2.
 * https://core.telegram.org/bots/api#markdownv2-style
 * Backslash is escaped first to avoid double-escaping other characters.
 */
function escapeMarkdownV2(text: string): string {
  // Escape backslash first, then all other MarkdownV2 special characters
  return text
    .replace(/\\/g, "\\\\")
    .replace(/[_*[\]()~`>#+\-=|{}.!]/g, (c) => `\\${c}`)
}

export function formatAgentResponse(
  result: PollResult,
  sessionId: string
): FormattedResponse {
  const execute = result.execute
  const form = execute?.form

  // ── 1. WAITING_STATE ──────────────────────────────────────────────────────
  if (execute?.waiting_state) {
    const ws = execute.waiting_state
    let text = `⏸ *Agent is waiting for approval*\n${escapeMarkdownV2(ws.reason ?? "")}`
    if (ws.expires_at) {
      const expires = new Date(ws.expires_at)
      const remaining = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000))
      text += `\n_Expires in ${remaining}s_`
    }
    const keyboard = new InlineKeyboard()
      .text("✅ Approve", `choice:${sessionId}:approve`)
      .text("❌ Reject", `choice:${sessionId}:reject`)
    return { text, keyboard, isWaiting: true }
  }

  // ── 2. Message text ───────────────────────────────────────────────────────
  const rawMessage = form?.message ?? execute?.message ?? null
  let text = rawMessage
    ? escapeMarkdownV2(rawMessage)
    : "_Agent is processing\\.\\.\\._"

  // ── 3. Choices → inline keyboard ─────────────────────────────────────────
  let keyboard: InlineKeyboard | undefined
  const choices = form?.choices
  if (choices && choices.length > 0) {
    text += "\n\n*Choose an option:*"
    keyboard = new InlineKeyboard()
    choices.forEach((choice, idx) => {
      keyboard!.text(
        choice.label,
        `choice:${sessionId}:${choice.id}`
      )
      // Two buttons per row
      if (idx % 2 === 1) keyboard!.row()
    })
  }

  // ── 4. Artifact chips (optional, informational) ───────────────────────────
  const artifacts = result.artifacts
  if (artifacts && artifacts.length > 0) {
    const chips = artifacts
      .slice(0, 3)
      .map((a) => a.type)
      .join(" · ")
    text += `\n\n\`${chips}\``
  }

  return { text, keyboard }
}

/**
 * Formats a session snapshot for the /status command.
 */
export function formatSessionStatus(snapshot: {
  id: string
  status?: string
  stage?: string
  messageCount?: number
}): string {
  const lines = [
    `*Session Status*`,
    `ID: \`${snapshot.id}\``,
    `Status: ${escapeMarkdownV2(snapshot.status ?? "unknown")}`,
    `Stage: ${escapeMarkdownV2(snapshot.stage ?? "unknown")}`,
    `Messages: ${snapshot.messageCount ?? 0}`,
  ]
  return lines.join("\n")
}
