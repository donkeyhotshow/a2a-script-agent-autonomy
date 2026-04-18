"use client"

import { useState, useCallback, useRef } from "react"
import {
  createSession,
  listSessions,
  postNext,
  pollAsync,
  stopSession,
  type SessionDTO,
  type AsyncPollResult,
} from "@/lib/api-client"

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  agent?: string
  isError?: boolean
}

const POLL_INTERVAL_MS = 800
const MAX_POLL_ATTEMPTS = 120 // 96 seconds (120 × 800ms)

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const VALID_STATUSES = new Set(["idle", "active", "completed", "error", "stopped"])

function toSessionStatus(raw: string | undefined): SessionDTO["status"] {
  if (raw && VALID_STATUSES.has(raw)) return raw as SessionDTO["status"]
  return "idle"
}

function isPollingComplete(result: AsyncPollResult): boolean {
  return !result.asyncPending || result.completed === true || result.status === "idle"
}

function extractMessage(result: AsyncPollResult): string {
  if (result.error) return `Error: ${result.error}`
  if (result.message) return result.message
  if (result.result) {
    const r = result.result as Record<string, unknown>
    if (typeof r.message === "string") return r.message
    if (typeof r.content === "string") return r.content
    if (typeof r.text === "string") return r.text
    return JSON.stringify(result.result, null, 2)
  }
  if (result.execute) {
    return `Executing action…\n\`\`\`json\n${JSON.stringify(result.execute, null, 2)}\n\`\`\``
  }
  if (result.completed) return "Task completed."
  return "Processing…"
}

export function useA2ASession() {
  const [sessions, setSessions] = useState<SessionDTO[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const pollingRef = useRef(false)
  const abortRef = useRef(false)

  function appendMessage(msg: Omit<Message, "id">) {
    setMessages((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }])
  }

  const loadSessions = useCallback(async () => {
    try {
      const list = await listSessions()
      setSessions(list)
      setSessionsLoaded(true)
    } catch {
      // Backend may not be running; start with empty list
      setSessionsLoaded(true)
    }
  }, [])

  const pollUntilDone = useCallback(
    async (sessionId: string) => {
      pollingRef.current = true
      abortRef.current = false
      setIsLoading(true)

      let attempts = 0
      let lastResult: AsyncPollResult | null = null

      while (attempts < MAX_POLL_ATTEMPTS && !abortRef.current) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        attempts++
        try {
          lastResult = await pollAsync(sessionId)
        } catch (err) {
          appendMessage({
            role: "assistant",
            content: `Poll error: ${err instanceof Error ? err.message : String(err)}`,
            timestamp: formatTime(),
            isError: true,
          })
          break
        }

        if (isPollingComplete(lastResult)) {
          const content = extractMessage(lastResult)
          appendMessage({
            role: "assistant",
            content,
            timestamp: formatTime(),
            agent: "A2A Agent",
            isError: !!lastResult.error,
          })
          // Update session status
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId
                ? { ...s, status: lastResult?.error ? "error" : "completed" }
                : s
            )
          )
          break
        }
      }

      if (attempts >= MAX_POLL_ATTEMPTS && pollingRef.current) {
        appendMessage({
          role: "assistant",
          content: "Request timed out waiting for agent response.",
          timestamp: formatTime(),
          isError: true,
        })
      }

      pollingRef.current = false
      setIsLoading(false)
    },
    [appendMessage]
  )

  const handleNewSession = useCallback(async () => {
    setError(null)
    const title = `Session ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    try {
      const session = await createSession(title)
      const newSession: SessionDTO = { ...session, status: "idle" }
      setSessions((prev) => [newSession, ...prev])
      setActiveSessionId(newSession.id)
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! I am the A2A Agent Orchestrator. I can help you with coding tasks, debugging, and building features. What would you like me to work on today?",
          timestamp: formatTime(),
          agent: "Orchestrator",
        },
      ])
    } catch (err) {
      // Fallback: create a local-only session when backend is not reachable
      const localId = `local-${Date.now()}`
      setSessions((prev) => [{ id: localId, title, status: "idle" }, ...prev])
      setActiveSessionId(localId)
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! I am the A2A Agent Orchestrator. (Backend not connected — responses will be simulated.)",
          timestamp: formatTime(),
          agent: "Orchestrator",
        },
      ])
      console.warn("[useA2ASession] createSession failed, using local fallback:", err)
    }
  }, [])

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id)
    setMessages([])
    setError(null)
  }, [])

  const handleStopSession = useCallback(async () => {
    if (!activeSessionId) return
    abortRef.current = true
    try {
      await stopSession(activeSessionId)
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, status: "stopped" } : s))
      )
      appendMessage({
        role: "system",
        content: "Session stopped by user.",
        timestamp: formatTime(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [activeSessionId, appendMessage])

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeSessionId) return
      setError(null)

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: formatTime(),
      }
      setMessages((prev) => [...prev, userMsg])

      // Mark session active
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, status: "active" } : s))
      )

      // Skip if local-only (no backend)
      if (activeSessionId.startsWith("local-")) {
        setTimeout(() => {
          appendMessage({
            role: "assistant",
            content: `I understand you want to: "${content}"\n\n(Backend not connected — this is a simulated response.)`,
            timestamp: formatTime(),
            agent: "Simulated Agent",
          })
          setIsLoading(false)
        }, 1000)
        setIsLoading(true)
        return
      }

      try {
        await postNext(activeSessionId, { task: content })
        await pollUntilDone(activeSessionId)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        appendMessage({
          role: "assistant",
          content: `Failed to send message: ${msg}`,
          timestamp: formatTime(),
          isError: true,
        })
        setIsLoading(false)
      }
    },
    [activeSessionId, appendMessage, pollUntilDone]
  )

  return {
    sessions,
    activeSessionId,
    messages,
    isLoading,
    error,
    sessionsLoaded,
    loadSessions,
    handleNewSession,
    handleSelectSession,
    handleStopSession,
    handleSendMessage,
  }
}
