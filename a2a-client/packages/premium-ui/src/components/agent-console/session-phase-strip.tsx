"use client";

import React from "react";
import { type SessionPhase } from "@/lib/mock-data";

interface SessionPhaseStripProps {
  currentPhase: SessionPhase;
  phases: SessionPhase[];
}

export default function SessionPhaseStrip({
  currentPhase,
  phases,
}: SessionPhaseStripProps) {
  const currentIndex = phases.indexOf(currentPhase);

  return (
    <div className="px-3 py-0.5 bg-background">
      <div className="flex items-center gap-0.5 text-xs">
        {phases.map((phase, idx) => {
          const isComplete = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <React.Fragment key={phase}>
              <span
                className={`px-0.5 py-0.5 rounded text-xs font-medium transition-colors inline-block ${
                  isCurrent
                    ? "bg-foreground text-background"
                    : isComplete
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                {phase.slice(0, 2)}
              </span>
              {idx < phases.length - 1 && (
                <span className="text-muted-foreground">·</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
