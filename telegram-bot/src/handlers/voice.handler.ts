/**
 * handlers/voice.handler.ts — Handles voice messages.
 * If OPENAI_API_KEY is set and feature is enabled: transcribes audio via Whisper API
 * then routes the transcript through the message handler logic.
 * Otherwise: politely informs the user voice isn't enabled.
 */
import { type Bot } from "grammy"
import { type SessionManager } from "../session/manager.js"
import { config } from "../config.js"
import { sendTask } from "../bridge/a2a-client.js"
import { pollUntilDone } from "../bridge/poller.js"
import { formatAgentResponse } from "../ui/formatter.js"
import { ProgressMessage } from "../ui/progress.js"
import { enqueue } from "../session/queue.js"
import { watchdogRegister, watchdogCancel } from "../watchdog.js"

export function registerVoiceHandler(bot: Bot, manager: SessionManager): void {
  bot.on("message:voice", async (ctx) => {
    if (!config.features.voiceTranscription || !config.openaiApiKey) {
      await ctx.reply(
        "🎤 Voice transcription is not enabled\\. Set `OPENAI_API_KEY` and `FEATURE_VOICE=true`\\.",
        { parse_mode: "MarkdownV2" }
      )
      return
    }

    const chatId = ctx.chat.id
    const fileId = ctx.message.voice.file_id

    await enqueue(chatId, async () => {
      const progress = new ProgressMessage(ctx)
      await progress.init("_🎤 Transcribing audio\\.\\.\\._")

      let transcript: string
      try {
        // Download audio file from Telegram
        const file = await ctx.api.getFile(fileId)
        const fileUrl = `https://api.telegram.org/file/bot${config.telegram.botToken}/${file.file_path}`
        const audioRes = await fetch(fileUrl)
        const audioBuffer = await audioRes.arrayBuffer()

        // Send to OpenAI Whisper
        const formData = new FormData()
        formData.append("file", new Blob([audioBuffer], { type: "audio/ogg" }), "voice.ogg")
        formData.append("model", "whisper-1")

        const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${config.openaiApiKey}` },
          body: formData,
        })

        if (!whisperRes.ok) {
          throw new Error(`Whisper API error: HTTP ${whisperRes.status}`)
        }
        const whisperData = (await whisperRes.json()) as { text?: string }
        transcript = whisperData.text ?? ""
        if (!transcript.trim()) throw new Error("Empty transcript from Whisper")
      } catch (err) {
        console.error("[voice] Transcription error:", err)
        await progress.delete()
        await ctx.reply("❌ Failed to transcribe audio\\.", { parse_mode: "MarkdownV2" })
        return
      }

      await progress.update(`_🎤 Heard: "${transcript}"_`, true)

      const state = await manager.getOrCreate(chatId)
      try {
        await sendTask(state.sessionId, transcript)
        manager.update(chatId, { messageCount: state.messageCount + 1 })
      } catch (err) {
        console.error("[voice] sendTask error:", err)
        await progress.delete()
        await ctx.reply("❌ Failed to send transcription to agent\\.", {
          parse_mode: "MarkdownV2",
        })
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
        console.error("[voice] poll error:", err)
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
        manager.update(chatId, { awaitingChoice: true, awaitingApproval: formatted.isWaiting ?? false })
        await ctx.reply(formatted.text, { parse_mode: "MarkdownV2", reply_markup: formatted.keyboard })
      } else {
        await ctx.reply(formatted.text, { parse_mode: "MarkdownV2" })
      }
    })
  })
}
