"use client";

import React, { useState } from "react";
import { type Artifact } from "@/lib/mock-data";
import { useQueryState } from 'nuqs';

interface EvidenceChipProps {
  artifact: Artifact;
}

const ARTIFACT_ICONS: Record<string, string> = {
  CONFIDENCE_TRACE: "📊",
  EXECUTION_DECISION: "⚡",
  WAITING_STATE: "⏸",
  WAITING_STATE_EVENT: "⏸",
  LOOP_SIGNAL: "🔄",
  TRACE_RISK: "⚠️",
  DRYRUN_PLANGRAPH: "🔍",
  DRYRUN_DELTA: "📝",
  MEMORY_INFLUENCE: "💭",
  EPISODIC_ENTRY: "📖",
  EPISODIC_RECALL_RESULT: "🧠",
  DONECRITERIA_RESULT: "✅",
  VALIDATION_SUMMARY: "🛡️",
  BRANCH_INTEGRITY: "🌳",
  PREFLIGHT_IMPROVEMENT: "✈️",
  BLOCKER_SET: "🚫",
  ORCHESTRATOR_CYCLE: "🎼",
  SESSION_END_RECORD: "📋",
};

export default function EvidenceChip({ artifact }: EvidenceChipProps) {
  const [, setInspector] = useQueryState('inspector');
  const [showPreview, setShowPreview] = useState(false);
  const icon = ARTIFACT_ICONS[artifact.type] || "📎";

  const severityColor = {
    info: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    warning: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    critical: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  };

  return (
    <>
      <button
        onClick={() => setInspector(artifact.id)}
        className={`px-2 py-0.5 rounded text-xs font-medium border flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer ${
          severityColor[artifact.severity]
        }`}
      >
        <span className="text-xs">{icon}</span>
        <span className="truncate">{artifact.type.replace(/_/g, " ")}</span>
      </button>

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded max-w-2xl max-h-96 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <h3 className="font-medium text-sm">{artifact.type.replace(/_/g, " ")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{artifact.summary}</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="p-0 hover:opacity-60 transition-opacity text-xs">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <pre className="text-xs font-mono bg-foreground/5 p-2 rounded overflow-x-auto">
                {JSON.stringify(artifact.data, null, 2)}
              </pre>
            </div>

            <div className="border-t border-border px-4 py-2 flex gap-2 justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(artifact.data, null, 2));
                }}
                className="px-2.5 py-1 text-xs rounded border border-border hover:bg-foreground/5 transition-colors"
              >
                Copy
              </button>
              <button
                onClick={() => setShowPreview(false)}
                className="px-2.5 py-1 text-xs rounded bg-foreground text-background hover:opacity-80 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
