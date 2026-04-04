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
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight transition-colors inline-flex items-center gap-1 ${
                  isCurrent
                    ? "bg-foreground text-background"
                    : isComplete
                    ? "text-green-600 bg-green-500/10"
                    : "text-muted-foreground"
                }`}
              >
                {phase.toUpperCase()}
                {isCurrent && <PhaseTimer />}
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

function PhaseTimer() {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  
  if (elapsed < 1) return null;
  return <span className="opacity-60 font-mono text-[9px]">{elapsed}s</span>;
}
