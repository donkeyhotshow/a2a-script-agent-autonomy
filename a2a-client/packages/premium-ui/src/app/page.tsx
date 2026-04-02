"use client";

import AgentConsole from "@/components/agent-console";
import React from "react";

export default function HomePage(): React.ReactNode {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <AgentConsole />
    </React.Suspense>
  );
}
