"use client"

import { cn } from "@/lib/utils"
import {
  Bot,
  MessageSquare,
  Settings,
  FileCode,
  History,
  Plus,
  ChevronRight,
} from "lucide-react"

interface Session {
  id: string
  name: string
  status: "active" | "completed" | "error"
  timestamp: string
}

interface SidebarProps {
  sessions: Session[]
  activeSession: string | null
  onSelectSession: (id: string) => void
  onNewSession: () => void
}

export function Sidebar({
  sessions,
  activeSession,
  onSelectSession,
  onNewSession,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <Bot className="h-6 w-6 text-primary" />
        <h1 className="font-semibold text-foreground">A2A Orchestrator</h1>
      </div>

      <div className="p-3">
        <button
          onClick={onNewSession}
          className="flex w-full items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Sessions
        </div>
        <ul className="space-y-1">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  activeSession === session.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate text-left">{session.name}</span>
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    session.status === "active" && "bg-green-500",
                    session.status === "completed" && "bg-blue-500",
                    session.status === "error" && "bg-red-500"
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border p-2">
        <ul className="space-y-1">
          <li>
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
              <History className="h-4 w-4" />
              History
              <ChevronRight className="ml-auto h-4 w-4" />
            </button>
          </li>
          <li>
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
              <FileCode className="h-4 w-4" />
              Agents
              <ChevronRight className="ml-auto h-4 w-4" />
            </button>
          </li>
          <li>
            <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
              <Settings className="h-4 w-4" />
              Settings
              <ChevronRight className="ml-auto h-4 w-4" />
            </button>
          </li>
        </ul>
      </div>
    </aside>
  )
}
