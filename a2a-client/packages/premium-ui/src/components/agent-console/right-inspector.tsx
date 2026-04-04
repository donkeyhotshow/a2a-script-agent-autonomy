"use client";

import React from "react";
import TaskFlowTab from "./tabs/task-flow-tab";
import EvidenceTab from "./tabs/evidence-tab";
import WaitingTab from "./tabs/waiting-tab";

interface RightInspectorProps {
  selectedSession: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCollapse: () => void;
}

export default function RightInspector({
  selectedSession,
  activeTab,
  onTabChange,
  onCollapse,
}: RightInspectorProps) {
  const tabs = [
    { id: "taskflow", label: "Flow" },
    { id: "evidence", label: "Evd" },
    { id: "waiting", label: "Wait" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground">Inspect</h2>
        <button
          onClick={onCollapse}
          className="p-0 hover:opacity-60 transition-opacity text-xs"
          title="Collapse inspector"
        >
          ✕
        </button>
      </div>

      {/* Tab selector */}
      <div className="border-b border-border flex bg-background">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-2 py-1 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-b-foreground text-foreground"
                : "border-b-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "taskflow" && <TaskFlowTab sessionId={selectedSession} />}
        {activeTab === "evidence" && <EvidenceTab sessionId={selectedSession} />}
        {activeTab === "waiting" && <WaitingTab sessionId={selectedSession} />}
      </div>
    </div>
  );
}
