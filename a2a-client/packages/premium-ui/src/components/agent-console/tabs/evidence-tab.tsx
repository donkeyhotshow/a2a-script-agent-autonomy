"use client";

import React from "react";
import { getArtifacts } from "@/lib/mock-data";
import ArtifactCard from "./artifact-card";

interface EvidenceTabProps {
  sessionId: string;
}

export default function EvidenceTab({ sessionId }: EvidenceTabProps) {
  const artifacts = getArtifacts(sessionId);

  if (artifacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">
        No evidence artifacts yet
      </div>
    );
  }

  // Group by severity
  const critical = artifacts.filter((a) => a.severity === "critical");
  const warning = artifacts.filter((a) => a.severity === "warning");
  const info = artifacts.filter((a) => a.severity === "info");

  return (
    <div className="px-2 py-1 space-y-1.5">
      {critical.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-red-700 dark:text-red-400 mb-0.5">
            Crit
          </h3>
          <div className="space-y-1">
            {critical.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        </div>
      )}

      {warning.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-0.5">
            Warn
          </h3>
          <div className="space-y-1">
            {warning.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        </div>
      )}

      {info.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-0.5">
            Info
          </h3>
          <div className="space-y-1">
            {info.map((artifact) => (
              <ArtifactCard key={artifact.id} artifact={artifact} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
