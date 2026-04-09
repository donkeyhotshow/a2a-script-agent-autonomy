"use client";

import React, { useState } from "react";
import { getSession, getMessages, getSteps, getArtifacts } from "@/lib/mock-data";

interface RawStateTabProps {
  sessionId: string;
}

export default function RawStateTab({ sessionId }: RawStateTabProps) {
  const session = getSession(sessionId);
  const messages = getMessages(sessionId);
  const steps = getSteps(sessionId);
  const artifacts = getArtifacts(sessionId);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const state = {
    session,
    messages,
    steps,
    artifacts,
    _metadata: {
      sessionId,
      fetchedAt: new Date().toISOString(),
      messageCount: messages.length,
      stepCount: steps.length,
      artifactCount: artifacts.length,
    },
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground">Session State</h3>
        <button
          onClick={() => handleCopy("state")}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            copiedId === "state"
              ? "bg-green-600 text-white"
              : "bg-accent text-accent-foreground hover:opacity-90"
          }`}
        >
          {copiedId === "state" ? "✓ Copied" : "📋 Copy"}
        </button>
      </div>

      <div className="bg-slate-900 rounded p-4 overflow-auto max-h-96">
        <pre className="text-slate-100 text-xs font-mono whitespace-pre-wrap break-words">
          {JSON.stringify(state, null, 2)}
        </pre>
      </div>
    </div>
  );
}
