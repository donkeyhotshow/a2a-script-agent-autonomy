"use client";

import React, { useState } from "react";

interface ComposerProps {
  onPreflightToggle: (enabled: boolean) => void;
  preflightEnabled: boolean;
  onSubmit: (message: string) => void;
}

export default function Composer({
  onPreflightToggle,
  preflightEnabled,
  onSubmit,
}: ComposerProps) {
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState(2);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (message.trim()) {
      onSubmit(message);
      setMessage("");
      setRows(2);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-grow textarea
    const lineCount = value.split("\n").length;
    setRows(Math.max(2, Math.min(lineCount, 6)));
  };

  return (
    <div className="space-y-1">
      {/* Options */}
      <div className="flex items-center gap-2 text-xs">
        <label className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors text-muted-foreground">
          <input
            type="checkbox"
            checked={preflightEnabled}
            onChange={(e) => onPreflightToggle(e.target.checked)}
            className="w-3 h-3 rounded border border-border cursor-pointer"
          />
          <span>Preflight</span>
        </label>
      </div>

      {/* Input area */}
      <div className="flex gap-1.5">
        <textarea
          value={message}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="..."
          rows={2}
          className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"
        />
        <button
          onClick={handleSubmit}
          disabled={!message.trim()}
          className="px-2 py-1 h-fit bg-foreground text-background rounded font-medium text-xs hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
