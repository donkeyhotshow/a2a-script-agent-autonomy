"use client";

import React, { useState } from "react";
import { getSteps } from "@/lib/mock-data";
import StepCard from "./step-card";

interface TaskFlowTabProps {
  sessionId: string;
}

export default function TaskFlowTab({ sessionId }: TaskFlowTabProps) {
  const steps = getSteps(sessionId);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">
        No task flow steps yet
      </div>
    );
  }

  return (
    <div className="px-2 py-1 space-y-1">
      {/* Timeline */}
      <div className="relative pl-2">
        {/* Vertical line */}
        <div className="absolute left-0 top-1 bottom-0 w-px bg-border" />

        {/* Steps */}
        <div className="space-y-1">
          {steps.map((step) => (
            <div key={step.id} className="relative">
              {/* Timeline dot */}
              <div
                className={`absolute -left-3 top-2 w-2 h-2 rounded-full ${
                  step.status === "completed"
                    ? "bg-green-500"
                    : step.status === "running"
                    ? "bg-blue-500 animate-pulse"
                    : step.status === "failed"
                    ? "bg-red-500"
                    : "bg-foreground/30"
                }`}
              />

              {/* Step card */}
              <StepCard
                step={step}
                isSelected={selectedStep === step.id}
                onSelect={() => setSelectedStep(selectedStep === step.id ? null : step.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
