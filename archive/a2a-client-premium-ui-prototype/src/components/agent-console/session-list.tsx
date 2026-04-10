"use client";

import React from "react";
import { type SessionStatus } from "@/lib/mock-data";

interface UiSession {
  id: string;
  name: string;
  status: SessionStatus;
  currentPhase: string;
}

interface SessionListProps {
  sessions: UiSession[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onNew: () => void;
  apiOk: boolean | null;
}

const STATUS_DOT: Record<string, string> = {
  running:    "bg-green-500",
  waiting:    "bg-yellow-500",
  validating: "bg-blue-500",
  completed:  "bg-[#444]",
  failed:     "bg-red-500",
  stopped:    "bg-[#444]",
  created:    "bg-yellow-600",
  active:     "bg-green-500",
};

export default function SessionList({ sessions, selectedId, onSelect, onClose, onNew, apiOk }: SessionListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#555] uppercase tracking-wider">Sessions</span>
          {/* API status dot */}
          <span
            title={apiOk === null ? "connecting" : apiOk ? "Client API connected" : "offline  mock data"}
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${apiOk === null ? "bg-yellow-600 animate-pulse" : apiOk ? "bg-green-500" : "bg-red-500"}`}
          />
        </div>
        <button onClick={onClose} className="text-[#444] hover:text-[#888] transition-colors text-xs"></button>
      </div>

      {/* New session */}
      <div className="px-2 py-1.5 border-b border-[#161616]">
        <button
          onClick={onNew}
          disabled={!apiOk}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-[#555] hover:text-[#999] hover:bg-[#1a1a1a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="text-sm leading-none">+</span>
          <span>New session</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.length === 0 && (
          <div className="px-3 py-4 text-[11px] text-[#444] text-center">No sessions</div>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors ${
              s.id === selectedId ? "bg-[#1a1a1a] text-[#e2e2e2]" : "text-[#777] hover:bg-[#161616] hover:text-[#bbb]"
            }`}
          >
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[s.status] ?? "bg-[#444]"}`} />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate leading-snug">{s.name}</div>
              <div className="text-[10px] text-[#444] mt-0.5 font-mono">{s.currentPhase}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
