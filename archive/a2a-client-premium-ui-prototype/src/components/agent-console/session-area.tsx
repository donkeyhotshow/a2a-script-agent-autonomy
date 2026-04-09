"use client";

import React, { useState } from "react";
import { getSession, getMessages, type SessionPhase } from "@/lib/mock-data";
import SessionHeader from "./session-header";
import SessionPhaseStrip from "./session-phase-strip";
import MessageList from "./message-list";
import Composer from "./composer";
import PreflightView from "./preflight-view";
import ValidationView from "./validation-view";

interface SessionAreaProps {
  selectedProject: string;
  selectedSession: string;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomClosed: boolean;
  onLeftToggle: () => void;
  onRightToggle: () => void;
  onBottomToggle: () => void;
}

const PHASES: SessionPhase[] = [
  "scan",
  "generate",
  "enrich",
  "self-correct",
  "execute",
  "validate",
  "deliver",
  "waiting",
];

export default function SessionArea({
  selectedProject,
  selectedSession,
  leftCollapsed,
  rightCollapsed,
  bottomClosed,
  onLeftToggle,
  onRightToggle,
  onBottomToggle,
}: SessionAreaProps) {
  const session = getSession(selectedSession);
  const messages = getMessages(selectedSession);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [runPreflight, setRunPreflight] = useState(true);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No session selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top header */}
      <SessionHeader
        session={session}
        leftCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
        bottomClosed={bottomClosed}
        onLeftToggle={onLeftToggle}
        onRightToggle={onRightToggle}
        onBottomToggle={onBottomToggle}
        onValidationOpen={() => setValidationOpen(true)}
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-background">
        <MessageList messages={messages} />
      </div>

      {/* Phase strip - compact at bottom */}
      <div className="border-t border-border bg-background">
        <SessionPhaseStrip currentPhase={session.currentPhase} phases={PHASES} />
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-background px-3 py-2">
        <Composer
          onPreflightToggle={setRunPreflight}
          preflightEnabled={runPreflight}
          onSubmit={(message) => {
            if (runPreflight) {
              setPreflightOpen(true);
            }
          }}
        />
      </div>

      {/* Special Views */}
      {preflightOpen && (
        <PreflightView
          sessionId={selectedSession}
          onApprove={() => {
            setPreflightOpen(false);
          }}
          onSkip={() => {
            setPreflightOpen(false);
          }}
          onClose={() => {
            setPreflightOpen(false);
          }}
        />
      )}

      {validationOpen && (
        <ValidationView
          sessionId={selectedSession}
          onApprove={() => {
            setValidationOpen(false);
          }}
          onReject={() => {
            setValidationOpen(false);
          }}
          onClose={() => {
            setValidationOpen(false);
          }}
        />
      )}
    </div>
  );
}
