/**
 * middleware/inflight.middleware.ts — Enforces one active request per chat.
 * If another request is already running for the same chat, reject immediately.
 */
import { MiddlewareFn, Context } from "grammy"
import { isInflight } from "../session/queue.js"

export const inflightMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const chatId = ctx.chat?.id
  // Let commands like /stop and /status bypass the inflight check
  const command = ctx.message?.text?.split(" ")[0]?.slice(1)
  const bypassCommands = new Set(["stop", "status", "help"])
  if (!chatId || (command && bypassCommands.has(command))) {
    await next()
    return
  }

  if (isInflight(chatId)) {
    await ctx.reply("⏳ Still processing your previous request. Please wait.")
    return
  }

  await next()
}
