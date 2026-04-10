"use client";

import React from "react";
import { getStorageArtifacts } from "@/lib/mock-data";

interface StorageTabProps {
  sessionId: string;
}

export default function StorageTab({ sessionId }: StorageTabProps) {
  const artifacts = getStorageArtifacts(sessionId);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // Group by type
  const grouped = artifacts.reduce(
    (acc, artifact) => {
      const type = artifact.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(artifact);
      return acc;
    },
    {} as Record<string, typeof artifacts>
  );

  return (
    <div className="p-4 space-y-6">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            {type}
          </h3>
          <div className="space-y-2">
            {items.map((artifact) => (
              <div
                key={artifact.id}
                className="p-2 rounded border border-border bg-muted/30 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">{artifact.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${
                      artifact.status === "active"
                        ? "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-300"
                        : artifact.status === "archived"
                        ? "bg-gray-100 text-gray-900 dark:bg-gray-900/30 dark:text-gray-300"
                        : "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-300"
                    }`}
                  >
                    {artifact.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-xs">
                  <span>Size: {formatSize(artifact.size)}</span>
                  <span>•</span>
                  <span>{new Date(artifact.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button className="px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs hover:opacity-90">
                    📥 Download
                  </button>
                  <button className="px-2 py-0.5 rounded border border-border text-xs hover:bg-muted">
                    👁 Preview
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
