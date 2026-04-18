/**
 * bot.ts — grammy bot setup: command handlers, message handlers, callback queries.
 */
import { Bot, Context, GrammyError, HttpError } from "grammy"
import { env } from "./env.js"
import { type SessionStore } from "./session-store.js"
import {
  createSession,
  sendTask,
  sendChoice,
  sendMessage,
  getSession,
  stopSession,
} from "./a2a-client.js"
import { pollUntilDone } from "./poller.js"
import { formatAgentResponse, formatSessionStatus } from "./formatter.js"

// ── Access guard ──────────────────────────────────────────────────────────────

function isAllowed(chatId: number): boolean {
  if (env.ALLOWED_CHAT_IDS.length === 0) return true
  return env.ALLOWED_CHAT_IDS.includes(chatId)
}

// ── Per-chat state (tracks whether agent expects a choice reply) ──────────────

const awaitingChoice = new Set<number>()

// ── Bot factory ───────────────────────────────────────────────────────────────

export function createBot(store: SessionStore): Bot {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN)

  // ── /start ──────────────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !isAllowed(chatId)) return

    try {
      const sessionId = await createSession()
      await store.set(chatId, sessionId)
      awaitingChoice.delete(chatId)

      await ctx.reply(
        "👋 *A2A Agent Orchestrator*\n\nSession started\\. Send me a task and I'll get to work\\!",
        { parse_mode: "MarkdownV2" }
      )
    } catch (err) {
      console.error("[bot] /start error:", err)
      await ctx.reply("❌ Failed to start session. Is the A2A server running?")
    }
  })

  // ── /new ────────────────────────────────────────────────────────────────────
  bot.command("new", async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !isAllowed(chatId)) return

    const oldSessionId = await store.get(chatId)
    if (oldSessionId) {
      try {
        await stopSession(oldSessionId)
      } catch {
        // Ignore errors when stopping old session
      }
    }

    try {
      const sessionId = await createSession()
      await store.set(chatId, sessionId)
      awaitingChoice.delete(chatId)

      await ctx.reply("🆕 New session started\\. Send me a task\\!", {
        parse_mode: "MarkdownV2",
      })
    } catch (err) {
      console.error("[bot] /new error:", err)
      await ctx.reply("❌ Failed to create new session.")
    }
  })

  // ── /stop ───────────────────────────────────────────────────────────────────
  bot.command("stop", async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !isAllowed(chatId)) return

    const sessionId = await store.get(chatId)
    if (!sessionId) {
      await ctx.reply("No active session to stop.")
      return
    }

    try {
      await stopSession(sessionId)
    } catch {
      // Ignore stop errors
    }
    await store.delete(chatId)
    awaitingChoice.delete(chatId)
    await ctx.reply("🛑 Session stopped.")
  })

  // ── /status ─────────────────────────────────────────────────────────────────
  bot.command("status", async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !isAllowed(chatId)) return

    const sessionId = await store.get(chatId)
    if (!sessionId) {
      await ctx.reply("No active session. Use /start to create one.")
      return
    }

    try {
      const snapshot = await getSession(sessionId)
      await ctx.reply(formatSessionStatus(snapshot), { parse_mode: "MarkdownV2" })
    } catch (err) {
      console.error("[bot] /status error:", err)
      await ctx.reply("❌ Failed to fetch session status.")
    }
  })

  // ── /help ───────────────────────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    const help = [
      "*Available Commands*",
      "",
      "/start — Create a new A2A session",
      "/new — Stop current session and start fresh",
      "/stop — Stop the active session",
      "/status — Show current session status",
      "/help — Show this message",
      "",
      "Send any text to interact with the agent\\.",
      "Use the inline buttons when the agent presents choices\\.",
    ].join("\n")
    await ctx.reply(help, { parse_mode: "MarkdownV2" })
  })

  // ── Text messages ────────────────────────────────────────────────────────────
  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id
    if (!isAllowed(chatId)) return

    const text = ctx.message.text
    if (text.startsWith("/")) return // Already handled by command handlers

    // Guard: if agent asked for choice, reject free text
    if (awaitingChoice.has(chatId)) {
      await ctx.reply("👆 Please use the buttons above to make your selection.")
      return
    }

    // Get or create session
    let sessionId = await store.get(chatId)
    if (!sessionId) {
      try {
        sessionId = await createSession()
        await store.set(chatId, sessionId)
      } catch (err) {
        console.error("[bot] createSession on message error:", err)
        await ctx.reply("❌ Could not start a session. Is the A2A server running?")
        return
      }
    }

    // Show typing indicator
    await ctx.replyWithChatAction("typing")

    try {
      await sendTask(sessionId, text)
    } catch (err) {
      console.error("[bot] sendTask error:", err)
      await ctx.reply("❌ Failed to send your message to the agent.")
      return
    }

    // Poll for response
    let typingInterval: ReturnType<typeof setInterval> | null = null

    let finalResult
    try {
      typingInterval = setInterval(() => {
        ctx.replyWithChatAction("typing").catch(() => {})
      }, 4000)
      finalResult = await pollUntilDone(sessionId)
    } catch (err) {
      console.error("[bot] pollUntilDone error:", err)
      await ctx.reply("❌ Lost connection to agent while waiting for response.")
      return
    } finally {
      if (typingInterval) clearInterval(typingInterval)
    }

    const formatted = formatAgentResponse(finalResult, sessionId)
    if (formatted.keyboard) {
      awaitingChoice.add(chatId)
      await ctx.reply(formatted.text, {
        parse_mode: "MarkdownV2",
        reply_markup: formatted.keyboard,
      })
    } else {
      awaitingChoice.delete(chatId)
      await ctx.reply(formatted.text, { parse_mode: "MarkdownV2" })
    }
  })

  // ── Callback queries (inline button clicks) ──────────────────────────────────
  bot.on("callback_query:data", async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !isAllowed(chatId)) {
      await ctx.answerCallbackQuery()
      return
    }

    const data = ctx.callbackQuery.data
    // Pattern: "choice:<sessionId>:<choiceId>"
    const match = data.match(/^choice:([^:]+):(.+)$/)
    if (!match) {
      await ctx.answerCallbackQuery({ text: "Unknown action" })
      return
    }

    const [, callbackSessionId, choiceId] = match as [string, string, string]

    const sessionId = await store.get(chatId)
    if (!sessionId || sessionId !== callbackSessionId) {
      await ctx.answerCallbackQuery({ text: "This button is no longer active." })
      return
    }

    await ctx.answerCallbackQuery({ text: `Selected: ${choiceId}` })
    awaitingChoice.delete(chatId)

    // Edit the original message to remove keyboard
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined })
    } catch {
      // May fail if message is too old
    }

    await ctx.replyWithChatAction("typing")

    try {
      await sendChoice(sessionId, choiceId)
    } catch (err) {
      console.error("[bot] sendChoice error:", err)
      await ctx.reply("❌ Failed to submit your choice.")
      return
    }

    let typingInterval: ReturnType<typeof setInterval> | null = null

    let finalResult
    try {
      typingInterval = setInterval(() => {
        ctx.replyWithChatAction("typing").catch(() => {})
      }, 4000)
      finalResult = await pollUntilDone(sessionId)
    } catch (err) {
      console.error("[bot] pollUntilDone after choice error:", err)
      await ctx.reply("❌ Lost connection to agent after submitting choice.")
      return
    } finally {
      if (typingInterval) clearInterval(typingInterval)
    }

    const formatted = formatAgentResponse(finalResult, sessionId)
    if (formatted.keyboard) {
      awaitingChoice.add(chatId)
      await ctx.reply(formatted.text, {
        parse_mode: "MarkdownV2",
        reply_markup: formatted.keyboard,
      })
    } else {
      awaitingChoice.delete(chatId)
      await ctx.reply(formatted.text, { parse_mode: "MarkdownV2" })
    }
  })

  // ── Error handler ────────────────────────────────────────────────────────────
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
