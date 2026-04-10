"use client";

import React from "react";
import { mockWaitingState } from "@/lib/mock-data";
import WaitingCard from "./waiting-card";

interface WaitingTabProps {
  sessionId: string;
}

export default function WaitingTab({ sessionId }: WaitingTabProps) {
  // In a real app, this would fetch waiting state for the session
  // For now, use mock data if it matches the session
  const waitingState = mockWaitingState?.sessionId === sessionId ? mockWaitingState : null;

  if (!waitingState) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs p-4">
        <div className="text-center">
          <p>No waiting states</p>
          <p className="text-xs mt-2">Session is proceeding normally</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <WaitingCard waitingState={waitingState} />
    </div>
  );
}
