/**
 * handlers/callback.handler.ts — Handles inline button callback queries.
 * Pattern: "choice:<sessionId>:<choiceId>" or "action:<actionName>"
 */
import { type Bot } from "grammy"
import { type SessionManager } from "../session/manager.js"
import { sendChoice } from "../bridge/a2a-client.js"
import { pollUntilDone } from "../bridge/poller.js"
import { formatAgentResponse } from "../ui/formatter.js"
import { ProgressMessage } from "../ui/progress.js"
import { enqueue } from "../session/queue.js"
import { watchdogRegister, watchdogCancel } from "../watchdog.js"

export function registerCallbackHandler(bot: Bot, manager: SessionManager): void {
  bot.on("callback_query:data", async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId) {
      await ctx.answerCallbackQuery()
      return
    }

    const data = ctx.callbackQuery.data

    // ── Quick action buttons (from /actions command) ───────────────────────
    if (data.startsWith("action:")) {
      const action = data.slice("action:".length)
      await ctx.answerCallbackQuery()
      switch (action) {
        case "new":
          try {
            await manager.createNew(chatId)
            await ctx.reply("🆕 New session started\\. Send me a task\\!", {
              parse_mode: "MarkdownV2",
            })
          } catch {
            await ctx.reply("❌ Failed to create new session\\.", { parse_mode: "MarkdownV2" })
          }
          break
        case "stop": {
          const state = manager.get(chatId)
          if (!state) {
            await ctx.reply("No active session\\.", { parse_mode: "MarkdownV2" })
          } else {
            await manager.clear(chatId)
            await ctx.reply("🛑 Session stopped\\.", { parse_mode: "MarkdownV2" })
          }
          break
        }
        case "status": {
          const state = manager.get(chatId)
          if (!state) {
            await ctx.reply("No active session\\.", { parse_mode: "MarkdownV2" })
          } else {
            const snap = await manager.hydrateStage(chatId)
            await ctx.reply(
              `*Status*\nStage: \`${snap?.stage ?? state.stage}\`\nMessages: ${state.messageCount}`,
              { parse_mode: "MarkdownV2" }
            )
          }
          break
        }
        case "help":
          await ctx.reply(
            "/start /new /stop /status /verbose /actions /help",
            { parse_mode: "MarkdownV2" }
          )
          break
      }
      return
    }

    // ── Choice callbacks — pattern: "choice:<sessionId>:<choiceId>" ────────
    const match = data.match(/^choice:([^:]+):(.+)$/)
    if (!match) {
      await ctx.answerCallbackQuery({ text: "Unknown action" })
      return
    }

    const [, callbackSessionId, choiceId] = match as [string, string, string]

    const state = manager.get(chatId)
    if (!state || state.sessionId !== callbackSessionId) {
      await ctx.answerCallbackQuery({ text: "This button is no longer active." })
      return
    }

    await ctx.answerCallbackQuery({ text: `Selected: ${choiceId}` })

    // Remove keyboard from original message
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined })
    } catch {
      // OK if message is too old
    }

    manager.update(chatId, { awaitingChoice: false, awaitingApproval: false })

    await enqueue(chatId, async () => {
      const progress = new ProgressMessage(ctx)
      await progress.init("_⚙️ Submitting choice\\.\\.\\._")

      try {
        await sendChoice(state.sessionId, choiceId)
      } catch (err) {
        console.error("[callback] sendChoice error:", err)
        await progress.delete()
        await ctx.reply("❌ Failed to submit your choice\\.", { parse_mode: "MarkdownV2" })
        return
      }

      const abortCtrl = watchdogRegister(chatId, state.sessionId, async (msg) => {
        void ctx.reply(msg, { parse_mode: "MarkdownV2" })
      })

      let finalResult
      try {
        finalResult = await pollUntilDone(state.sessionId, (partial) => {
          if (abortCtrl.signal.aborted) return
          const msg = partial.execute?.form?.message ?? partial.execute?.message
          if (msg) progress.update(msg).catch(() => {})
        })
      } catch (err) {
        console.error("[callback] poll error:", err)
        await progress.delete()
        await ctx.reply("❌ Lost connection to agent\\.", { parse_mode: "MarkdownV2" })
        return
      } finally {
        watchdogCancel(chatId)
      }

      manager.update(chatId, {
        stage: finalResult.stage ?? state.stage,
        awaitingChoice: false,
        awaitingApproval: false,
      })

      const formatted = formatAgentResponse(finalResult, state.sessionId)
      await progress.delete()

      if (formatted.keyboard) {
        manager.update(chatId, {
          awaitingChoice: true,
          awaitingApproval: formatted.isWaiting ?? false,
        })
        await ctx.reply(formatted.text, {
          parse_mode: "MarkdownV2",
          reply_markup: formatted.keyboard,
        })
      } else {
        await ctx.reply(formatted.text, { parse_mode: "MarkdownV2" })
      }
    })
  })
}
