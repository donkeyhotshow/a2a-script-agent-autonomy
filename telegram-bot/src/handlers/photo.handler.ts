/**
 * handlers/photo.handler.ts — Handles photo messages.
 * When photo_notifications is enabled, notifies the agent that a photo was sent.
 * The photo is described by file_id; actual vision analysis is out of scope.
 */
import { type Bot } from "grammy"
import { type SessionManager } from "../session/manager.js"
import { config } from "../config.js"
import { sendMessage } from "../bridge/a2a-client.js"

export function registerPhotoHandler(bot: Bot, manager: SessionManager): void {
  bot.on("message:photo", async (ctx) => {
    if (!config.features.photoNotifications) return

    const chatId = ctx.chat.id
    const caption = ctx.message.caption ?? ""
    const photo = ctx.message.photo.at(-1) // largest size
    const notice = caption
      ? `[Photo received: ${caption}]`
      : "[User sent a photo]"

    const state = await manager.getOrCreate(chatId)
    try {
      await sendMessage(state.sessionId, notice)
      await ctx.reply(
        `📷 Photo noted\\. File ID: \`${photo?.file_id ?? "unknown"}\``,
        { parse_mode: "MarkdownV2" }
      )
    } catch (err) {
      console.error("[photo] Failed to notify agent:", err)
      await ctx.reply("❌ Failed to send photo notification to agent\\.", {
        parse_mode: "MarkdownV2",
      })
    }
  })
}
