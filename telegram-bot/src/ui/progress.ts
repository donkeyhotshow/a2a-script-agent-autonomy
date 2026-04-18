/**
 * ui/progress.ts — Edit-in-place streaming progress messages.
 * Sends an initial placeholder message then edits it as progress arrives.
 */
import { type Context } from "grammy"
import { escapeMarkdownV2 } from "./formatter.js"

export class ProgressMessage {
  private msgId: number | null = null
  private chatId: number
  private ctx: Context
  private lastText = ""

  constructor(ctx: Context) {
    this.ctx = ctx
    this.chatId = ctx.chat!.id
  }

  /** Send the initial "working" placeholder. */
  async init(text = "_⚙️ Working\\.\\.\\._"): Promise<void> {
    try {
      const msg = await this.ctx.reply(text, { parse_mode: "MarkdownV2" })
      this.msgId = msg.message_id
      this.lastText = text
    } catch (err) {
      console.error("[progress] Failed to send initial message:", err)
    }
  }

  /** Edit the progress message in place. Silently skip if unchanged or msgId unknown. */
  async update(text: string, escaped = false): Promise<void> {
    if (!this.msgId) return
    const safeText = escaped ? text : escapeMarkdownV2(text)
    if (safeText === this.lastText) return
    try {
      await this.ctx.api.editMessageText(this.chatId, this.msgId, safeText, {
        parse_mode: "MarkdownV2",
      })
      this.lastText = safeText
    } catch (err) {
      // Telegram throws if the text is identical or the message is too old — ignore
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("message is not modified") && !msg.includes("message to edit not found")) {
        console.warn("[progress] Edit failed:", msg)
      }
    }
  }

  /** Delete the progress message (e.g. before sending the real response). */
  async delete(): Promise<void> {
    if (!this.msgId) return
    try {
      await this.ctx.api.deleteMessage(this.chatId, this.msgId)
    } catch {
      // ignore — message may already be gone
    }
    this.msgId = null
  }

  get messageId(): number | null {
    return this.msgId
  }
}
