/**
 * bot.ts — grammy bot setup: middleware registration + handler wiring.
 * All business logic lives in handlers/, middleware/, etc.
 */
import { Bot, GrammyError, HttpError, type Context } from "grammy"
import { config } from "./config.js"
import { type SessionManager } from "./session/manager.js"
import { authMiddleware } from "./middleware/auth.middleware.js"
import { staleMiddleware } from "./middleware/stale.middleware.js"
import { inflightMiddleware } from "./middleware/inflight.middleware.js"
import { registerCommandHandlers } from "./handlers/command.handler.js"
import { registerMessageHandler } from "./handlers/message.handler.js"
import { registerCallbackHandler } from "./handlers/callback.handler.js"
import { registerVoiceHandler } from "./handlers/voice.handler.js"
import { registerPhotoHandler } from "./handlers/photo.handler.js"

export function createBot(manager: SessionManager): Bot {
  const bot = new Bot(config.telegram.botToken)

  // ── Middleware (applied in order) ─────────────────────────────────────────
  bot.use(staleMiddleware)
  bot.use(authMiddleware)
  bot.use(inflightMiddleware)

  // ── Handlers ──────────────────────────────────────────────────────────────
  registerCommandHandlers(bot, manager)
  registerMessageHandler(bot, manager)
  registerCallbackHandler(bot, manager)
  registerVoiceHandler(bot, manager)
  registerPhotoHandler(bot, manager)

  // ── Global error handler ──────────────────────────────────────────────────
  bot.catch((err) => {
    const ctx = err.ctx as Context | undefined
    console.error(`[bot] Unhandled error for update ${ctx?.update?.update_id}:`)
    if (err.error instanceof GrammyError) {
      console.error("[bot] grammy error:", err.error.description)
    } else if (err.error instanceof HttpError) {
      console.error("[bot] HTTP error:", err.error)
    } else {
      console.error("[bot] Unknown error:", err.error)
    }
  })

  return bot
}
