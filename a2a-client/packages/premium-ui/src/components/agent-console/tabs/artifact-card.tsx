"use client";

import React, { useState } from "react";
import { type Artifact } from "@/lib/mock-data";

interface ArtifactCardProps {
  artifact: Artifact;
}

const SEVERITY_COLOR = {
  info: "border-blue-500/20 bg-blue-500/5",
  warning: "border-yellow-500/20 bg-yellow-500/5",
  critical: "border-red-500/20 bg-red-500/5",
};

const SEVERITY_TEXT = {
  info: "text-blue-700 dark:text-blue-400",
  warning: "text-yellow-700 dark:text-yellow-400",
  critical: "text-red-700 dark:text-red-400",
};

export default function ArtifactCard({ artifact }: ArtifactCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded px-1.5 py-1 transition-colors cursor-pointer text-xs ${SEVERITY_COLOR[artifact.severity]} ${
        expanded ? "ring-1 ring-foreground/30" : ""
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-1">
        <h4 className={`font-medium flex-1 ${SEVERITY_TEXT[artifact.severity]}`}>
          {artifact.type.replace(/_/g, " ")}
        </h4>
        <span>{expanded ? "▼" : "▶"}</span>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-1">{artifact.summary}</p>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-1 pt-1 border-t border-current border-opacity-10 space-y-0.5">
          <div className="font-mono text-muted-foreground text-xs bg-foreground/5 p-1 rounded max-h-32 overflow-y-auto">
            {JSON.stringify(artifact.data, null, 2)}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(JSON.stringify(artifact.data, null, 2));
            }}
            className="px-1.5 py-0.5 text-xs rounded bg-foreground/10 hover:bg-foreground/15 transition-colors"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
