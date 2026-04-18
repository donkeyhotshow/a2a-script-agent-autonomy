/**
 * index.ts — Entry point.
 * Starts the grammy bot (long-polling) and a minimal HTTP health-check server.
 */
import * as http from "node:http"
import { env } from "./env.js"
import { createStore } from "./session-store.js"
import { createBot } from "./bot.js"

async function main(): Promise<void> {
  console.log("[a2a-telegram-bot] Starting…")

  // Validate env (throws if TELEGRAM_BOT_TOKEN is missing)
  console.log(`[a2a-telegram-bot] A2A_API_URL: ${env.A2A_API_URL}`)
  console.log(`[a2a-telegram-bot] POLL_INTERVAL_MS: ${env.POLL_INTERVAL_MS}`)
  console.log(`[a2a-telegram-bot] POLL_MAX_ATTEMPTS: ${env.POLL_MAX_ATTEMPTS}`)
  if (env.ALLOWED_CHAT_IDS.length > 0) {
    console.log(`[a2a-telegram-bot] Allowed chat IDs: ${env.ALLOWED_CHAT_IDS.join(", ")}`)
  } else {
    console.log("[a2a-telegram-bot] No ALLOWED_CHAT_IDS set — accepting all chats")
  }

  // Session store (Redis or in-memory)
  const store = await createStore()

  // Bot
  const bot = createBot(store)

  // Health-check HTTP server
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ status: "ok", service: "a2a-telegram-bot" }))
  })
  server.listen(env.PORT, () => {
    console.log(`[a2a-telegram-bot] Health check listening on port ${env.PORT}`)
  })

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[a2a-telegram-bot] Received ${signal}, shutting down…`)
    bot.stop()
    server.close()
    process.exit(0)
  }
  process.once("SIGINT", () => shutdown("SIGINT"))
  process.once("SIGTERM", () => shutdown("SIGTERM"))

  // Start polling Telegram
  console.log("[a2a-telegram-bot] Bot is running (long-polling mode)")
  await bot.start({
    onStart: (info) => {
      console.log(`[a2a-telegram-bot] Bot @${info.username} started`)
    },
  })
}

main().catch((err) => {
  console.error("[a2a-telegram-bot] Fatal startup error:", err)
  process.exit(1)
})
