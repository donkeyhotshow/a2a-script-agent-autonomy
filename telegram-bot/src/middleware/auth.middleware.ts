/**
 * middleware/auth.middleware.ts — Allowlist guard + per-chat rate limiter.
 */
import { MiddlewareFn, Context } from "grammy"
import { config } from "../config.js"

// ── Rate limiter (sliding window per chat) ────────────────────────────────────

const rateBuckets = new Map<number, number[]>()

function isRateLimited(chatId: number): boolean {
  const now = Date.now()
  const windowMs = 60_000
  const limit = config.rateLimit.requestsPerMinute

  let timestamps = rateBuckets.get(chatId) ?? []
  // Keep only timestamps within the last minute
  timestamps = timestamps.filter((t) => now - t < windowMs)
  if (timestamps.length >= limit) return true
  timestamps.push(now)
  rateBuckets.set(chatId, timestamps)
  return false
}

// ── Middleware ────────────────────────────────────────────────────────────────

export const authMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const chatId = ctx.chat?.id
  if (!chatId) return

  const allowed = config.telegram.allowedChatIds
  if (allowed.length > 0 && !allowed.includes(chatId)) {
    await ctx.reply("⛔ You are not authorised to use this bot.")
    return
  }

  if (config.rateLimit.perChat && isRateLimited(chatId)) {
    await ctx.reply(
      `🚦 Rate limit exceeded. Max ${config.rateLimit.requestsPerMinute} requests/minute.`
    )
    return
  }

  await next()
}
