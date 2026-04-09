"use client";

import React from "react";
import { type Step, getArtifact } from "@/lib/mock-data";

interface StepCardProps {
  step: Step;
  isSelected: boolean;
  onSelect: () => void;
}

const STATUS_COLOR = {
  pending: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  running: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  skipped: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

export default function StepCard({
  step,
  isSelected,
  onSelect,
}: StepCardProps) {
  const duration =
    step.startedAt && step.completedAt
      ? new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()
      : null;

  const durationStr = duration
    ? `${Math.round(duration / 1000)}s`
    : "";

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-1.5 py-1 rounded border transition-colors text-xs ${
        isSelected
          ? "border-foreground bg-foreground/5"
          : "border-border hover:border-foreground/20 hover:bg-foreground/3"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <h4 className="font-medium capitalize flex-1">{step.title}</h4>
        <span className={`px-1 py-0.5 rounded text-xs whitespace-nowrap font-medium ${STATUS_COLOR[step.status]}`}>
          {step.status.slice(0, 3)}
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>{step.phase.slice(0, 3)}</span>
        {durationStr && (
          <>
            <span>•</span>
            <span>{durationStr}</span>
          </>
        )}
      </div>

      {/* Artifacts */}
      {isSelected && step.artifactIds.length > 0 && (
        <div className="mt-1 pt-1 border-t border-border text-xs">
          <div className="text-muted-foreground font-medium mb-0.5">Art:</div>
          <div className="flex flex-wrap gap-0.5">
            {step.artifactIds.map((id) => {
              const artifact = getArtifact(id);
              if (!artifact) return null;
              return (
                <div key={artifact.id} className="px-1 py-0.5 rounded bg-foreground/5 text-muted-foreground font-mono text-xs">
                  {artifact.type.slice(0, 6)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </button>
  );
}
