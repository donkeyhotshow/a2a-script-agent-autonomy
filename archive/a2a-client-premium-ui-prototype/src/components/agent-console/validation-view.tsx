"use client";

import React from "react";
import { Check, X, AlertCircle } from "lucide-react";

interface ValidationViewProps {
  sessionId: string;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

export default function ValidationView({
  onApprove,
  onReject,
  onClose,
}: ValidationViewProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Validation & Delivery</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* DONECRITERIA Checklist */}
          <div className="border border-border rounded-lg p-4 bg-muted/20">
            <h3 className="font-semibold text-sm mb-4">Delivery Criteria</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Implementation complete</p>
                  <p className="text-xs text-muted-foreground">
                    All required functions implemented
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Documentation updated</p>
                  <p className="text-xs text-muted-foreground">
                    README and inline docs are current
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Manual review required</p>
                  <p className="text-xs text-muted-foreground">
                    Complex algorithm changes need human sign-off
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Branch isolation verified</p>
                  <p className="text-xs text-muted-foreground">
                    No unintended changes detected
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Test Summary */}
          <div className="border border-border rounded-lg p-4 bg-muted/20">
            <h3 className="font-semibold text-sm mb-4">Test Results</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-background rounded border border-border">
                <div className="text-xs text-muted-foreground mb-1">Unit</div>
                <div className="text-lg font-semibold text-green-600">
                  34/34
                </div>
              </div>
              <div className="p-3 bg-background rounded border border-border">
                <div className="text-xs text-muted-foreground mb-1">
                  Integration
                </div>
                <div className="text-lg font-semibold text-green-600">12/12</div>
              </div>
              <div className="p-3 bg-background rounded border border-border">
                <div className="text-xs text-muted-foreground mb-1">
                  Simulation
                </div>
                <div className="text-lg font-semibold text-green-600">8/8</div>
              </div>
              <div className="p-3 bg-background rounded border border-border">
                <div className="text-xs text-muted-foreground mb-1">
                  Regression
                </div>
                <div className="text-lg font-semibold text-green-600">
                  45/45
                </div>
              </div>
            </div>
          </div>

          {/* Validation Status */}
          <div className="border border-border rounded-lg p-4 bg-green-500/5 border-green-500/20">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-green-700 dark:text-green-400">
                  Ready for Delivery
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  All validation checks passed. Branch is isolated and ready
                  for merge.
                </p>
              </div>
            </div>
          </div>

          {/* Branch Integrity */}
          <div className="border border-border rounded-lg p-4 bg-muted/20">
            <h3 className="font-semibold text-sm mb-3">Branch Integrity</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Base Branch</span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  main
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Working Branch</span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  feature/api-refactor
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Files Changed</span>
                <span className="font-semibold">7</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Lines Added/Removed</span>
                <span className="font-semibold">+342/-156</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Conflicts</span>
                <span className="text-green-600 font-semibold">None</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-muted/30 border-t border-border p-4 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onReject}
            className="px-4 py-2 text-sm border border-red-500 text-red-600 dark:text-red-400 rounded hover:bg-red-500/10"
          >
            Reject & Block
          </button>
          <button
            onClick={onApprove}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Approve & Merge
          </button>
        </div>
      </div>
    </div>
  );
}
