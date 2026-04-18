"use client"

import { useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { ChatPanel } from "@/components/chat-panel"
import { Workbench } from "@/components/workbench"
import { useA2ASession } from "@/hooks/use-a2a-session"

export default function Home() {
  const {
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
  } = useA2ASession()

  // Load sessions from backend on mount
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Map SessionDTO to the shape expected by Sidebar
  const sidebarSessions = sessions.map((s) => ({
    id: s.id,
    name: s.title ?? s.id,
    status: (s.status ?? "idle") as "active" | "completed" | "error" | "idle" | "stopped",
    timestamp: s.updatedAt ? new Date(s.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
  }))

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        sessions={sidebarSessions}
        activeSession={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        isLoading={!sessionsLoaded}
      />

      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onStop={handleStopSession}
            isLoading={isLoading}
            error={error}
            hasSession={!!activeSessionId}
          />
        </div>

        <div className="w-[400px] flex-shrink-0">
          <Workbench
            traces={[]}
            artifacts={[]}
            diffs={[]}
            logs={messages
              .filter((m) => m.role !== "user")
              .map(
                (m) =>
                  `[${m.timestamp}] ${m.agent ?? m.role.toUpperCase()}: ${m.content.slice(0, 120)}${m.content.length > 120 ? "…" : ""}`
              )}
          />
        </div>
      </main>
    </div>
  )
}
