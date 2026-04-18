/**
 * middleware/stale.middleware.ts — Ignores messages received before bot startup.
 * Prevents processing backlogged messages after a restart.
 */
import { MiddlewareFn, Context } from "grammy"

const BOT_START_TIME = Math.floor(Date.now() / 1000) // Unix seconds, same unit as Telegram message.date
const STALE_THRESHOLD_SECONDS = 30

export const staleMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  const date = ctx.message?.date ?? ctx.callbackQuery?.message?.date
  if (date !== undefined && BOT_START_TIME - date > STALE_THRESHOLD_SECONDS) {
    // Message is older than threshold — silently skip
    return
  }
  await next()
}
