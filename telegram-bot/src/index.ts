/**
 * index.ts — Entry point.
 * Starts the grammy bot (long-polling) and a minimal HTTP health-check server.
 */
import * as http from "node:http"
import { config } from "./config.js"
import { createStore } from "./session/store.js"
import { SessionManager } from "./session/manager.js"
import { getMemoryStore } from "./memory/store.js"
import { createBot } from "./bot.js"

async function main(): Promise<void> {
  console.log("[a2a-telegram-bot] Starting…")
  console.log(`[a2a-telegram-bot] A2A_API_URL: ${config.a2a.apiUrl}`)
  console.log(`[a2a-telegram-bot] Poll interval: ${config.a2a.pollIntervalMs}ms × ${config.a2a.pollMaxAttempts} attempts`)
  console.log(`[a2a-telegram-bot] Watchdog timeout: ${config.watchdog.timeoutSeconds}s`)

  if (config.telegram.allowedChatIds.length > 0) {
    console.log(`[a2a-telegram-bot] Allowed chats: ${config.telegram.allowedChatIds.join(", ")}`)
  } else {
    console.log("[a2a-telegram-bot] No ALLOWED_CHAT_IDS — accepting all chats")
  }

  // Session store + manager
  const store = await createStore()
  const manager = new SessionManager(store)

  // Warm up memory store (so Redis connection is established early)
  await getMemoryStore()

  // Bot
  const bot = createBot(manager)

  // HTTP health-check server
  const server = http.createServer((_req, res) => {
    const sessions = manager.list()
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(
      JSON.stringify({
        status: "ok",
        service: "a2a-telegram-bot",
        activeSessions: sessions.length,
      })
    )
  })
  server.listen(config.port, () => {
    console.log(`[a2a-telegram-bot] Health check listening on port ${config.port}`)
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

  // Start long-polling
  console.log("[a2a-telegram-bot] Bot running (long-polling mode)")
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
