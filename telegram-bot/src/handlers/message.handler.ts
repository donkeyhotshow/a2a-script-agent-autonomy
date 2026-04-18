/**
 * handlers/message.handler.ts — Handles plain text messages from users.
 * Routes to sendTask or sendMessage based on session stage.
 */
import { type Bot } from "grammy"
import { type SessionManager } from "../session/manager.js"
import { sendTask, sendMessage } from "../bridge/a2a-client.js"
import { pollUntilDone } from "../bridge/poller.js"
import { formatAgentResponse } from "../ui/formatter.js"
import { ProgressMessage } from "../ui/progress.js"
import { enqueue } from "../session/queue.js"
import { watchdogRegister, watchdogCancel } from "../watchdog.js"
import { injectMemory, recordExchange } from "../memory/injector.js"

export function registerMessageHandler(bot: Bot, manager: SessionManager): void {
  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text
    if (text.startsWith("/")) return // handled by command router

    const chatId = ctx.chat.id

    await enqueue(chatId, async () => {
      // Get or create session
      let state = await manager.getOrCreate(chatId)

      // Guard: if agent asked for a choice, reject free text
      if (state.awaitingChoice) {
        await ctx.reply("👆 Please use the buttons above to make your selection\\.", {
          parse_mode: "MarkdownV2",
        })
        return
      }

      const progress = new ProgressMessage(ctx)
      await progress.init()

      // Optionally inject episodic memory context
      const augmentedTask = await injectMemory(chatId, text)

      try {
        // Determine beat: sendTask for new/dialog-input stage, sendMessage otherwise
        const useTaskBeat =
          state.stage === "init" ||
          state.stage === "dialog-input" ||
          state.stage === "complete"

        if (useTaskBeat) {
          await sendTask(state.sessionId, augmentedTask)
        } else {
          await sendMessage(state.sessionId, augmentedTask)
        }
        manager.update(chatId, {
          messageCount: state.messageCount + 1,
        })
      } catch (err) {
        console.error("[message] send error:", err)
        await progress.delete()
        await ctx.reply("❌ Failed to send message to the agent\\.", {
          parse_mode: "MarkdownV2",
        })
        return
      }

      // Watchdog registration
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
        console.error("[message] poll error:", err)
        await progress.delete()
        await ctx.reply("❌ Lost connection to agent while waiting\\.", {
          parse_mode: "MarkdownV2",
        })
        return
      } finally {
        watchdogCancel(chatId)
      }

      // Update state from poll result
      state = manager.get(chatId) ?? state
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

      // Record exchange in episodic memory
      const responseText =
        finalResult.execute?.form?.message ?? finalResult.execute?.message ?? ""
      if (responseText) {
        await recordExchange(chatId, text, responseText)
      }
    })
  })
}
