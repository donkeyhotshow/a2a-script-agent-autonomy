"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Activity,
  Database,
  ListChecks,
  FileText,
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react"
import type { AsyncPollResult } from "@/hooks/use-a2a-session"

type TabType = "activity" | "slots" | "choices" | "raw"

// ── Derived types from poll result ────────────────────────────────────────────

interface ActivityItem {
  id: string
  label: string
  status: "pending" | "running" | "completed" | "error"
  detail?: string
}

interface SlotEntry {
  key: string
  value: string
}

interface FormChoice {
  id: string
  label: string
  description?: string
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const [open, setOpen] = useState(false)

  const StatusIcon =
    item.status === "pending"
      ? Clock
      : item.status === "running"
      ? Circle
      : item.status === "error"
      ? XCircle
      : CheckCircle2

  const statusColor =
    item.status === "pending"
      ? "text-muted-foreground"
      : item.status === "running"
      ? "text-yellow-500 animate-pulse"
      : item.status === "error"
      ? "text-red-500"
      : "text-green-500"

  return (
    <div>
      <div
        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent/50"
        onClick={() => item.detail && setOpen((v) => !v)}
      >
        {item.detail ? (
          <button className="flex h-4 w-4 items-center justify-center text-muted-foreground">
            {open ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <StatusIcon className={cn("h-4 w-4 flex-shrink-0", statusColor)} />
        <span className="flex-1 truncate text-foreground">{item.label}</span>
      </div>
      {open && item.detail && (
        <pre className="ml-10 whitespace-pre-wrap rounded bg-background p-2 font-mono text-xs text-muted-foreground">
          {item.detail}
        </pre>
      )}
    </div>
  )
}

// ── Data derivation ───────────────────────────────────────────────────────────

function deriveActivity(
  result: AsyncPollResult | null,
  isLoading: boolean
): ActivityItem[] {
  const items: ActivityItem[] = []

  if (isLoading && !result) {
    items.push({ id: "thinking", label: "Agent is thinking…", status: "running" })
    return items
  }
  if (!result) return items

  // Operation history from context.operationHistory
  const ctx = result.context as Record<string, unknown> | undefined
  const opHistory = ctx?.["operationHistory"]
  if (Array.isArray(opHistory)) {
    opHistory.forEach((op: unknown, i: number) => {
      if (!op || typeof op !== "object") return
      const o = op as Record<string, unknown>
      const label =
        typeof o["type"] === "string"
          ? o["type"]
          : typeof o["action"] === "string"
          ? o["action"]
          : `Step ${i + 1}`
      const rawStatus = typeof o["status"] === "string" ? o["status"] : "completed"
      const status: ActivityItem["status"] =
        rawStatus === "running"
          ? "running"
          : rawStatus === "error" || rawStatus === "failed"
          ? "error"
          : rawStatus === "pending"
          ? "pending"
          : "completed"
      const detail =
        typeof o["detail"] === "string"
          ? o["detail"]
          : typeof o["output"] === "string"
          ? o["output"]
          : undefined
      items.push({ id: `op-${i}`, label, status, detail })
    })
    return items
  }

  // Fallback: synthesize one row from execute info
  if (result.execute) {
    const execMsg =
      (result.execute["message"] as string | undefined) ?? "Executing action"
    items.push({
      id: "exec",
      label: execMsg,
      status: isLoading ? "running" : "completed",
      detail: JSON.stringify(result.execute, null, 2),
    })
  } else if (result.completed) {
    items.push({ id: "done", label: "Task completed", status: "completed" })
  } else if (result.error) {
    items.push({
      id: "err",
      label: `Error: ${result.error}`,
      status: "error",
    })
  } else if (isLoading) {
    items.push({ id: "thinking", label: "Agent is thinking…", status: "running" })
  }

  return items
}

function deriveSlots(result: AsyncPollResult | null): SlotEntry[] {
  if (!result) return []
  const ctx = result.context as Record<string, unknown> | undefined
  const wb = ctx?.["workbench"] as Record<string, unknown> | undefined
  const slots = wb?.["slots"] as Record<string, unknown> | undefined
  if (!slots || typeof slots !== "object") return []
  return Object.entries(slots).map(([key, value]) => ({
    key,
    value:
      typeof value === "string"
        ? value
        : JSON.stringify(value, null, 2),
  }))
}

function deriveChoices(result: AsyncPollResult | null): FormChoice[] {
  if (!result?.execute) return []
  const exec = result.execute as Record<string, unknown>
  const form = exec["form"] as Record<string, unknown> | undefined
  const choices = form?.["choices"] as Array<Record<string, unknown>> | undefined
  if (!Array.isArray(choices)) return []
  return choices.map((c, i) => ({
    id: typeof c["id"] === "string" ? c["id"] : String(i),
    label: typeof c["label"] === "string" ? c["label"] : String(i),
    description: typeof c["description"] === "string" ? c["description"] : undefined,
  }))
}

// ── Main component ────────────────────────────────────────────────────────────

interface WorkbenchProps {
  lastPollResult: AsyncPollResult | null
  isLoading: boolean
}

export function Workbench({ lastPollResult, isLoading }: WorkbenchProps) {
  const [activeTab, setActiveTab] = useState<TabType>("activity")

  const activity = deriveActivity(lastPollResult, isLoading)
  const slots = deriveSlots(lastPollResult)
  const choices = deriveChoices(lastPollResult)

  const tabs: {
    id: TabType
    label: string
    icon: React.ElementType
    count?: number
  }[] = [
    { id: "activity", label: "Activity", icon: Activity, count: activity.length },
    { id: "slots", label: "Slots", icon: Database, count: slots.length },
    { id: "choices", label: "Choices", icon: ListChecks, count: choices.length },
    { id: "raw", label: "Raw", icon: FileText },
  ]

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      {/* Tab bar */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 rounded-full bg-accent px-1.5 py-0.5 text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Activity — operation history or thinking state */}
        {activeTab === "activity" && (
          <div className="space-y-1">
            {activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No activity yet
              </p>
            ) : (
              activity.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))
            )}
            {isLoading && activity.length > 0 && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Polling…</span>
              </div>
            )}
          </div>
        )}

        {/* Slots — workbench key-value storage */}
        {activeTab === "slots" && (
          <div className="space-y-2">
            {slots.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No slot data yet
              </p>
            ) : (
              slots.map((slot) => (
                <div
                  key={slot.key}
                  className="overflow-hidden rounded-md border border-border"
                >
                  <div className="border-b border-border bg-accent/50 px-3 py-1.5">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {slot.key}
                    </span>
                  </div>
                  <pre className="overflow-x-auto bg-background p-2 font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                    {slot.value}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}

        {/* Choices — agent form choices waiting for user input */}
        {activeTab === "choices" && (
          <div className="space-y-2">
            {choices.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No choices pending
              </p>
            ) : (
              <>
                {(() => {
                  const exec = lastPollResult?.execute as Record<string, unknown> | undefined
                  const form = exec?.["form"] as Record<string, unknown> | undefined
                  const formMsg = typeof form?.["message"] === "string" ? form["message"] : null
                  return formMsg ? (
                    <p className="mb-3 text-sm text-foreground">{formMsg}</p>
                  ) : null
                })()}
                {choices.map((choice) => (
                  <div
                    key={choice.id}
                    className="rounded-md border border-border p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="font-medium text-sm text-foreground">{choice.label}</div>
                    {choice.description && (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {choice.description}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Raw — full poll result JSON */}
        {activeTab === "raw" && (
          <div className="rounded-md border border-border bg-background p-3">
            {!lastPollResult ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No data yet
              </p>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                {JSON.stringify(lastPollResult, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
