"use client";

import React from "react";
import { type Message, getArtifact } from "@/lib/mock-data";
import EvidenceChip from "./evidence-chip";

interface MessageItemProps {
  message: Message;
}

export default function MessageItem({ message }: MessageItemProps) {
  const isOperator = message.role === "operator";

  return (
    <div className={`flex gap-1.5 ${isOperator ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-5 h-5 rounded flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
          isOperator
            ? "bg-foreground/10 text-foreground"
            : "bg-foreground/5 text-muted-foreground"
        }`}
      >
        {isOperator ? "O" : "A"}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-2xl ${isOperator ? "text-right" : ""}`}>
        <div
          className={`px-2 py-1 rounded text-xs leading-snug ${
            isOperator
              ? "bg-foreground/5 text-foreground"
              : "bg-foreground/3 text-foreground"
          }`}
        >
          <p>{message.content}</p>
        </div>

        {/* Evidence chips - hidden by default */}

        {/* Timestamp - hidden by default */}
      </div>
    </div>
  );
}
