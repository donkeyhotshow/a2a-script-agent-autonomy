"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Send, Bot, User, Loader2, Paperclip, Square, AlertCircle } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
  agent?: string
  isError?: boolean
}

interface ChatPanelProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  onStop?: () => void
  isLoading?: boolean
  error?: string | null
  hasSession?: boolean
}

export function ChatPanel({ messages, onSendMessage, onStop, isLoading, error, hasSession = true }: ChatPanelProps) {
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-medium text-foreground">Agent Chat</h2>
        <div className="flex items-center gap-3">
          {isLoading && onStop && (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-red-500 hover:text-red-500"
            >
              <Square className="h-3 w-3" />
              Stop
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {messages.length} messages
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-border bg-destructive/10 px-4 py-2 text-xs text-red-400">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {!hasSession ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground">No session selected</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create a new session from the sidebar to start talking to the agent.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium text-foreground">
              Start a conversation
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Send a message to begin interacting with the A2A agent orchestrator.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" && "flex-row-reverse"
                )}
              >
                {message.role !== "system" && (
                  <div
                    className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.isError
                        ? "bg-red-900 text-red-300"
                        : "bg-accent text-accent-foreground"
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-lg px-4 py-2",
                    message.role === "user"
                      ? "max-w-[80%] bg-primary text-primary-foreground"
                      : message.role === "system"
                      ? "max-w-full w-full bg-muted/50 text-muted-foreground text-xs italic"
                      : message.isError
                      ? "max-w-[80%] bg-red-950 text-red-300"
                      : "max-w-[80%] bg-accent text-foreground"
                  )}
                >
                  {message.agent && (
                    <div className="mb-1 text-xs font-medium opacity-70">
                      {message.agent}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                  <div className="mt-1 text-xs opacity-50">{message.timestamp}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-lg bg-accent px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Agent is thinking…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border p-4"
      >
        <div className="flex items-end gap-2 rounded-lg border border-input bg-background p-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Attach file (coming soon)"
            disabled
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={hasSession ? "Send a message… (Enter to send, Shift+Enter for new line)" : "Select or create a session first"}
            rows={1}
            disabled={!hasSession || isLoading}
            className="max-h-[200px] min-h-[36px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || !hasSession}
            className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
