"use client";

import React from "react";
import TerminalTab from "./tabs/terminal-tab";
import StorageTab from "./tabs/storage-tab";
import RawStateTab from "./tabs/raw-state-tab";

interface BottomPanelProps {
  selectedSession: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
}

export default function BottomPanel({
  selectedSession,
  activeTab,
  onTabChange,
  onClose,
}: BottomPanelProps) {
  const tabs = [
    { id: "terminal", label: "Term" },
    { id: "storage", label: "Store" },
    { id: "rawstate", label: "Raw" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 py-1 border-b border-border flex items-center justify-between bg-background">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-1.5 py-0.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-b-foreground text-foreground"
                  : "border-b-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-0 hover:opacity-60 transition-opacity text-xs"
          title="Close bottom panel"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-background font-mono text-xs">
        {activeTab === "terminal" && <TerminalTab sessionId={selectedSession} />}
        {activeTab === "storage" && <StorageTab sessionId={selectedSession} />}
        {activeTab === "rawstate" && <RawStateTab sessionId={selectedSession} />}
      </div>
    </div>
  );
}
