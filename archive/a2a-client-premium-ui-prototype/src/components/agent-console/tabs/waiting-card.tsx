"use client";

import React, { useState } from "react";
import { type WaitingState } from "@/lib/mock-data";

interface WaitingCardProps {
  waitingState: WaitingState;
}

export default function WaitingCard({ waitingState }: WaitingCardProps) {
  const [action, setAction] = useState<string | null>(null);
  const isCritical = ["DATA_ACCESS", "EXTERNAL_CALL", "CRITICAL_PATH"].includes(
    waitingState.humanlayerApprovalType
  );

  const reasonLabels = {
    HUMAN_APPROVAL: "Human Approval Required",
    DATA_ACCESS: "External Data Access",
    EXTERNAL_CALL: "External API Call",
    CRITICAL_PATH: "Critical Path Approval",
    VALIDATION: "Validation Required",
  };

  return (
    <div
      className={`rounded border px-2 py-1.5 space-y-1.5 text-xs ${
        isCritical
          ? "border-red-500/30 bg-red-500/5"
          : "border-yellow-500/30 bg-yellow-500/5"
      }`}
    >
      {/* Header */}
      <div>
        <h3 className={`text-xs font-medium ${isCritical ? "text-red-700 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"}`}>
          {reasonLabels[waitingState.reason]}
        </h3>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-1 text-xs">
        <div>
          <p className="text-muted-foreground font-medium text-xs">Created</p>
          <p className="mt-0 text-xs">{new Date(waitingState.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground font-medium text-xs">Expires</p>
          <p className="mt-0 text-xs">{new Date(waitingState.expiresAt).toLocaleString()}</p>
        </div>
        <div className="col-span-2">
          <p className="text-muted-foreground font-medium text-xs">Target</p>
          <p className="mt-0 font-mono bg-foreground/5 px-1 py-0.5 rounded text-xs">{waitingState.resumeTarget}</p>
        </div>
      </div>

      {/* Required inputs */}
      {waitingState.requiredInputs.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-0.5">Inputs</p>
          <div className="space-y-0.5">
            {waitingState.requiredInputs.map((input, idx) => (
              <div key={idx} className="text-xs bg-foreground/5 px-1 py-0.5 rounded">
                □ {input}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Triggered criteria */}
      {waitingState.triggeredCriteria.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">
            Triggered Criteria ({waitingState.triggeredCriteria.length})
          </p>
          <div className="space-y-1">
            {waitingState.triggeredCriteria.map((criterion, idx) => (
              <div key={idx} className="text-xs bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
                ✓ {criterion}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="pt-1 border-t border-current border-opacity-10 flex flex-col gap-0.5">
        {action ? (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{action}</span>
          </div>
        ) : (
          <>
            <button
              onClick={() => setAction("Approve")}
              className={`px-2 py-1 rounded font-medium text-xs transition-colors ${
                isCritical
                  ? "bg-red-600 text-white hover:opacity-90"
                  : "bg-green-600 text-white hover:opacity-90"
              }`}
            >
              Ok
            </button>
            <button
              onClick={() => setAction("Reject")}
              className="px-2 py-1 rounded font-medium text-xs bg-foreground/10 text-foreground hover:bg-foreground/15 transition-colors"
            >
              X
            </button>
            <button
              onClick={() => setAction("Provide Input")}
              className="px-2 py-1 rounded font-medium text-xs bg-foreground/10 text-foreground hover:bg-foreground/15 transition-colors"
            >
              ⚙
            </button>
            <button
              onClick={() => setAction("Resume")}
              className="px-2 py-1 rounded font-medium text-xs bg-foreground/10 text-foreground hover:bg-foreground/15 transition-colors"
            >
              ▶
            </button>
          </>
        )}
      </div>
    </div>
  );
}
