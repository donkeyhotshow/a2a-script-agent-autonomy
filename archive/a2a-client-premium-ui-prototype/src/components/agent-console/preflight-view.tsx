"use client";

import React from "react";

interface PreflightViewProps {
  sessionId: string;
  onApprove: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function PreflightView({
  onApprove,
  onSkip,
  onClose,
}: PreflightViewProps) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Preflight Dry Run</h2>
          <button onClick={onClose} className="p-0 hover:opacity-60 transition-opacity text-xs">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* PREFLIGHT_IMPROVEMENT Card */}
          <div className="border border-border rounded px-3 py-2 bg-blue-500/5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-sm">Dry Run Analysis</h3>
              <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded">
                info
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <p>
                <span className="font-medium">Issues:</span> 2 potential risks detected
              </p>
              <p className="font-medium">Suggestions:</p>
              <ul className="list-disc list-inside ml-2 space-y-0.5 text-muted-foreground">
                <li>Add validation for external API rate limits</li>
                <li>Verify database transaction rollback capability</li>
              </ul>
              <p>
                <span className="font-medium">Confidence Gain:</span> +8.5%
              </p>
            </div>
          </div>

          {/* DRYRUN_PLANGRAPH */}
          <div className="border border-border rounded px-3 py-2">
            <h3 className="font-medium text-sm mb-2">Execution Plan</h3>
            <div className="text-xs space-y-1">
              <div className="p-1.5 bg-foreground/5 rounded border border-border font-mono text-muted-foreground">
                <div>scan → generate → enrich (api_call_external) →</div>
                <div>self-correct → execute (file_write)</div>
              </div>
              <p>
                <span className="font-medium">Approval Type:</span> EXTERNAL_CALL
              </p>
              <p>
                <span className="font-medium">
                  Unverifiable Operations:
                </span>
                1 (external API query)
              </p>
            </div>
          </div>

          {/* DRYRUN_DELTA */}
          <div className="border border-border rounded-lg p-4 bg-muted/20">
            <h3 className="font-semibold text-sm mb-3">Expected Changes</h3>
            <div className="space-y-1 text-sm text-muted-foreground font-mono text-xs">
              <div>+ /docs/implementation_guide.md (342 lines)</div>
              <div>~ /src/utils/api.ts (12 changes)</div>
              <div>+ /tests/integration/api.test.ts (89 lines)</div>
            </div>
          </div>

          {/* Confidence Band */}
          <div className="border border-border rounded-lg p-4 bg-muted/20">
            <h3 className="font-semibold text-sm mb-3">Predicted Confidence</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '78%'}}></div>
              </div>
              <span className="text-sm font-semibold">78%</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-background border-t border-border px-4 py-3 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-border rounded hover:bg-foreground/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSkip}
            className="px-3 py-1.5 text-xs border border-border rounded hover:bg-foreground/5 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={onApprove}
            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:opacity-90 transition-opacity"
          >
            Approve & Run
          </button>
        </div>
      </div>
    </div>
  );
}
