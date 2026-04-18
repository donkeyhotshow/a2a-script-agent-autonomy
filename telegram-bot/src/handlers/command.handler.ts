/**
 * handlers/command.handler.ts — All /slash command handlers.
 * Registered on the grammy Bot instance via registerCommandHandlers().
 */
import { type Bot, InlineKeyboard } from "grammy"
import { type SessionManager } from "../session/manager.js"
import { formatSessionStatus, escapeMarkdownV2 } from "../ui/formatter.js"

export function registerCommandHandlers(bot: Bot, manager: SessionManager): void {
  // ── /start ────────────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const chatId = ctx.chat.id
    try {
      await manager.createNew(chatId)
      await ctx.reply(
        "👋 *A2A Agent Orchestrator*\n\nSession started\\. Send me a task and I'll get to work\\!",
        { parse_mode: "MarkdownV2" }
      )
    } catch (err) {
      console.error("[cmd] /start error:", err)
      await ctx.reply("❌ Failed to start session\\. Is the A2A server running?", {
        parse_mode: "MarkdownV2",
      })
    }
  })

  // ── /new ─────────────────────────────────────────────────────────────────
  bot.command("new", async (ctx) => {
    const chatId = ctx.chat.id
    try {
      await manager.createNew(chatId)
      await ctx.reply("🆕 New session started\\. Send me a task\\!", {
        parse_mode: "MarkdownV2",
      })
    } catch (err) {
      console.error("[cmd] /new error:", err)
      await ctx.reply("❌ Failed to create new session\\.", { parse_mode: "MarkdownV2" })
    }
  })

  // ── /stop ─────────────────────────────────────────────────────────────────
  bot.command("stop", async (ctx) => {
    const chatId = ctx.chat.id
    const state = manager.get(chatId)
    if (!state) {
      await ctx.reply("No active session\\.", { parse_mode: "MarkdownV2" })
      return
    }
    await manager.clear(chatId)
    await ctx.reply("🛑 Session stopped\\.", { parse_mode: "MarkdownV2" })
  })

  // ── /status ───────────────────────────────────────────────────────────────
  bot.command("status", async (ctx) => {
    const chatId = ctx.chat.id
    const state = manager.get(chatId)
    if (!state) {
      await ctx.reply("No active session\\. Use /start to create one\\.", {
        parse_mode: "MarkdownV2",
      })
      return
    }
    try {
      const snap = await manager.hydrateStage(chatId)
      await ctx.reply(
        formatSessionStatus({
          id: state.sessionId,
          status: snap?.status,
          stage: snap?.stage ?? state.stage,
          messageCount: snap?.messageCount ?? state.messageCount,
        }),
        { parse_mode: "MarkdownV2" }
      )
    } catch (err) {
      console.error("[cmd] /status error:", err)
      await ctx.reply("❌ Failed to fetch session status\\.", { parse_mode: "MarkdownV2" })
    }
  })

  // ── /sessions ─────────────────────────────────────────────────────────────
  bot.command("sessions", async (ctx) => {
    const all = manager.list()
    if (all.length === 0) {
      await ctx.reply("No active sessions\\.", { parse_mode: "MarkdownV2" })
      return
    }
    const lines = all.map(
      ({ chatId, state }, i) =>
        `${i + 1}\\. Chat ${chatId} — stage: \\\`${escapeMarkdownV2(state.stage)}\\\``
    )
    await ctx.reply(["*Active Sessions*", ...lines].join("\n"), {
      parse_mode: "MarkdownV2",
    })
  })

  // ── /verbose ──────────────────────────────────────────────────────────────
  bot.command("verbose", async (ctx) => {
    const chatId = ctx.chat.id
    const arg = ctx.match?.trim()
    const level = arg ? parseInt(arg, 10) : null
    if (level === null || ![0, 1, 2].includes(level)) {
      await ctx.reply("Usage: /verbose 0|1|2", { parse_mode: "MarkdownV2" })
      return
    }
    manager.update(chatId, { verboseLevel: level as 0 | 1 | 2 })
    await ctx.reply(`Verbose level set to *${level}*`, { parse_mode: "MarkdownV2" })
  })

  // ── /actions ──────────────────────────────────────────────────────────────
  bot.command("actions", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🆕 New session", "action:new")
      .text("🛑 Stop", "action:stop")
      .row()
      .text("📊 Status", "action:status")
      .text("❓ Help", "action:help")
    await ctx.reply("Quick actions:", { reply_markup: keyboard })
  })

  // ── /help ─────────────────────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    const help = [
      "*A2A Telegram Bot — Commands*",
      "",
      "/start — Create a new A2A session",
      "/new — Stop current session and start fresh",
      "/stop — Stop the active session",
      "/status — Show current session status",
      "/sessions — List all active sessions",
      "/verbose 0|1|2 — Set verbosity level for this chat",
      "/actions — Quick\\-action inline buttons",
      "/help — Show this message",
      "",
      "Send any text message to interact with the agent\\.",
      "Use the inline buttons when the agent presents choices\\.",
    ].join("\n")
    await ctx.reply(help, { parse_mode: "MarkdownV2" })
  })
}
