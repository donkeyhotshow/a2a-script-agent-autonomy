"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Activity,
  FileCode,
  GitBranch,
  FileText,
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"

type TabType = "traces" | "artifacts" | "diffs" | "logs"

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

interface WorkbenchProps {
  traces: TraceStep[]
  artifacts: Artifact[]
  diffs: Diff[]
  logs: string[]
}

function TraceItem({ step, depth = 0 }: { step: TraceStep; depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = step.children && step.children.length > 0

  const StatusIcon = {
    pending: Clock,
    running: Circle,
    completed: CheckCircle2,
    error: XCircle,
  }[step.status]

  const statusColor = {
    pending: "text-muted-foreground",
    running: "text-yellow-500 animate-pulse",
    completed: "text-green-500",
    error: "text-red-500",
  }[step.status]

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-accent/50",
          depth > 0 && "ml-4"
        )}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-4 w-4 items-center justify-center text-muted-foreground"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <StatusIcon className={cn("h-4 w-4", statusColor)} />
        <span className="flex-1 truncate text-foreground">{step.name}</span>
        {step.duration && (
          <span className="text-xs text-muted-foreground">{step.duration}</span>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="border-l border-border ml-5">
          {step.children!.map((child) => (
            <TraceItem key={child.id} step={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Workbench({ traces, artifacts, diffs, logs }: WorkbenchProps) {
  const [activeTab, setActiveTab] = useState<TabType>("traces")

  const tabs: { id: TabType; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "traces", label: "Traces", icon: Activity, count: traces.length },
    { id: "artifacts", label: "Artifacts", icon: FileText, count: artifacts.length },
    { id: "diffs", label: "Diffs", icon: GitBranch, count: diffs.length },
    { id: "logs", label: "Logs", icon: FileCode },
  ]

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
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

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "traces" && (
          <div className="space-y-1">
            {traces.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No traces yet
              </p>
            ) : (
              traces.map((trace) => <TraceItem key={trace.id} step={trace} />)
            )}
          </div>
        )}

        {activeTab === "artifacts" && (
          <div className="space-y-2">
            {artifacts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No artifacts yet
              </p>
            ) : (
              artifacts.map((artifact) => (
                <div
                  key={artifact.id}
                  className="flex items-center gap-3 rounded-md border border-border p-3 transition-colors hover:bg-accent/50"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{artifact.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {artifact.type} - {artifact.size}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "diffs" && (
          <div className="space-y-3">
            {diffs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No diffs yet
              </p>
            ) : (
              diffs.map((diff) => (
                <div
                  key={diff.id}
                  className="overflow-hidden rounded-md border border-border"
                >
                  <div className="flex items-center justify-between border-b border-border bg-accent/50 px-3 py-2">
                    <span className="font-mono text-sm text-foreground">
                      {diff.file}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-500">+{diff.additions}</span>
                      <span className="text-red-500">-{diff.deletions}</span>
                    </div>
                  </div>
                  <pre className="overflow-x-auto bg-background p-3 font-mono text-xs text-foreground">
                    {diff.content}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="rounded-md border border-border bg-background p-3">
            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No logs yet
              </p>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                {logs.join("\n")}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
