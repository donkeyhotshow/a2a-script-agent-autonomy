"use client"

import { useState, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import { ChatPanel } from "@/components/chat-panel"
import { Workbench } from "@/components/workbench"

interface Session {
  id: string
  name: string
  status: "active" | "completed" | "error"
  timestamp: string
}

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  agent?: string
}

interface TraceStep {
  id: string
  name: string
  status: "pending" | "running" | "completed" | "error"
  duration?: string
  children?: TraceStep[]
}

interface Artifact {
  id: string
  name: string
  type: string
  size: string
}

interface Diff {
  id: string
  file: string
  additions: number
  deletions: number
  content: string
}

const initialSessions: Session[] = [
  { id: "1", name: "Fix authentication bug", status: "active", timestamp: "2 min ago" },
  { id: "2", name: "Add user dashboard", status: "completed", timestamp: "1 hour ago" },
  { id: "3", name: "Refactor API routes", status: "error", timestamp: "2 hours ago" },
]

const demoTraces: TraceStep[] = [
  {
    id: "t1",
    name: "Task Analysis",
    status: "completed",
    duration: "1.2s",
    children: [
      { id: "t1-1", name: "Parse requirements", status: "completed", duration: "0.3s" },
      { id: "t1-2", name: "Identify scope", status: "completed", duration: "0.9s" },
    ],
  },
  {
    id: "t2",
    name: "Code Generation",
    status: "running",
    children: [
      { id: "t2-1", name: "Generate components", status: "completed", duration: "2.1s" },
      { id: "t2-2", name: "Apply styling", status: "running" },
      { id: "t2-3", name: "Write tests", status: "pending" },
    ],
  },
]

const demoArtifacts: Artifact[] = [
  { id: "a1", name: "auth-component.tsx", type: "TypeScript", size: "2.4 KB" },
  { id: "a2", name: "user-schema.sql", type: "SQL", size: "1.1 KB" },
]

const demoDiffs: Diff[] = [
  {
    id: "d1",
    file: "components/auth/login.tsx",
    additions: 45,
    deletions: 12,
    content: `@@ -1,5 +1,8 @@
+import { useState } from 'react'
+import { validateEmail } from '@/lib/utils'
+
 export function LoginForm() {
-  const handleSubmit = () => {}
+  const [email, setEmail] = useState('')
+  const [isValid, setIsValid] = useState(true)
+
+  const handleSubmit = async () => {
+    if (!validateEmail(email)) {
+      setIsValid(false)
+      return
+    }
+    // ... rest of implementation
+  }`,
  },
]

const demoLogs: string[] = [
  "[2024-01-15 10:23:45] Agent initialized",
  "[2024-01-15 10:23:46] Analyzing task requirements...",
  "[2024-01-15 10:23:48] Found 3 relevant files",
  "[2024-01-15 10:23:50] Generating code modifications...",
]

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [activeSession, setActiveSession] = useState<string | null>("1")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "m1",
      role: "assistant",
      content: "Hello! I am the A2A Agent Orchestrator. I can help you with coding tasks, debugging, and building features. What would you like me to work on today?",
      timestamp: "10:23 AM",
      agent: "Orchestrator",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleNewSession = useCallback(() => {
    const newSession: Session = {
      id: Date.now().toString(),
      name: "New Session",
      status: "active",
      timestamp: "Just now",
    }
    setSessions((prev) => [newSession, ...prev])
    setActiveSession(newSession.id)
    setMessages([])
  }, [])

  const handleSelectSession = useCallback((id: string) => {
    setActiveSession(id)
  }, [])

  const handleSendMessage = useCallback((content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I understand you want to: "${content}"\n\nLet me analyze the codebase and create a plan for this task. I will:\n\n1. Search for relevant files\n2. Analyze the current implementation\n3. Generate the necessary code changes\n4. Apply and test the modifications\n\nStarting analysis now...`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        agent: "Coding Agent",
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
      />

      <main className="flex flex-1">
        <div className="flex-1">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>

        <div className="w-[400px]">
          <Workbench
            traces={demoTraces}
            artifacts={demoArtifacts}
            diffs={demoDiffs}
            logs={demoLogs}
          />
        </div>
      </main>
    </div>
  )
}
