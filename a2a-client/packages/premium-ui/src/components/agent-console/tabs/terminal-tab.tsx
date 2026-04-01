"use client";

import React, { useState } from "react";
import { getTerminalLogs } from "@/lib/mock-data";

interface TerminalTabProps {
  sessionId: string;
}

const SEVERITY_COLOR = {
  info: "text-blue-400",
  debug: "text-gray-500",
  warn: "text-yellow-400",
  error: "text-red-400",
};

export default function TerminalTab({ sessionId }: TerminalTabProps) {
  const logs = getTerminalLogs(sessionId);
  const [filterLevel, setFilterLevel] = useState<"all" | "debug" | "info" | "warn" | "error">(
    "all"
  );
  const [followMode, setFollowMode] = useState(true);

  const filteredLogs =
    filterLevel === "all"
      ? logs
      : logs.filter((log) => log.severity === filterLevel);

  return (
    <div className="flex flex-col h-full bg-background text-foreground px-2 py-1">
      {/* Controls */}
      <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-border text-xs">
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as any)}
          className="px-1.5 py-0.5 text-xs rounded bg-background border border-border hover:border-foreground/20 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"
        >
          <option value="all">All</option>
          <option value="debug">D</option>
          <option value="info">I</option>
          <option value="warn">W</option>
          <option value="error">E</option>
        </select>

        <label className="flex items-center gap-0.5 cursor-pointer ml-auto text-muted-foreground hover:text-foreground transition-colors">
          <input
            type="checkbox"
            checked={followMode}
            onChange={(e) => setFollowMode(e.target.checked)}
            className="w-3 h-3"
          />
          <span className="text-xs">F</span>
        </label>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto space-y-0 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-muted-foreground p-2">No logs</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="px-1.5 py-0.5 border-b border-border last:border-b-0">
              <span className={SEVERITY_COLOR[log.severity]}>
                [{log.severity[0].toUpperCase()}]
              </span>
              <span className="text-muted-foreground ml-1">{log.timestamp}</span>
              <span className="text-foreground ml-1">{log.message}</span>
              {log.tags && log.tags.length > 0 && (
                <span className="text-muted-foreground ml-1 text-xs">
                  {log.tags.map((tag) => `#${tag}`).join(" ")}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
