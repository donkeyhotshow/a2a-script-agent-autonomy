"use client";

import React from "react";
import { type Session } from "@/lib/mock-data";

interface SessionHeaderProps {
  session: Session;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomClosed: boolean;
  onLeftToggle: () => void;
  onRightToggle: () => void;
  onBottomToggle: () => void;
  onValidationOpen?: () => void;
}

export default function SessionHeader({
  session,
  leftCollapsed,
  rightCollapsed,
  bottomClosed,
  onLeftToggle,
  onRightToggle,
  onBottomToggle,
  onValidationOpen,
}: SessionHeaderProps) {
  return (
    <div className="border-b border-border bg-background px-3 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {leftCollapsed && (
            <button
              onClick={onLeftToggle}
              className="px-1.5 py-0.5 hover:bg-foreground/10 rounded text-xs transition-colors"
              title="Show left sidebar"
            >
              ≡
            </button>
          )}
          <h1 className="text-sm font-semibold truncate">{session.name}</h1>
          <span className={`inline-block w-1 h-1 rounded-full flex-shrink-0 ${
            session.status === "running"
              ? "bg-green-500"
              : session.status === "waiting"
              ? "bg-yellow-500"
              : session.status === "validating"
              ? "bg-blue-500"
              : session.status === "completed"
              ? "bg-gray-500"
              : "bg-red-500"
          }`} />
          <span className="text-xs text-muted-foreground flex-shrink-0">{session.status}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onLeftToggle}
            className="px-1 py-0.5 text-xs rounded hover:bg-foreground/10 transition-colors"
            title={leftCollapsed ? "Show sessions" : "Hide sessions"}
          >
            ☰
          </button>
          <button
            onClick={onRightToggle}
            className="px-1 py-0.5 text-xs rounded hover:bg-foreground/10 transition-colors"
            title={rightCollapsed ? "Show inspector" : "Hide inspector"}
          >
            ⓘ
          </button>
          <button
            onClick={onBottomToggle}
            className="px-1 py-0.5 text-xs rounded hover:bg-foreground/10 transition-colors"
            title={bottomClosed ? "Show logs" : "Hide logs"}
          >
            ◾
          </button>
          {session.currentPhase === "validate" && (
            <button
              onClick={onValidationOpen}
              className="px-2 py-0.5 text-xs font-medium bg-foreground text-background rounded hover:opacity-80 transition-opacity"
            >
              Validate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
