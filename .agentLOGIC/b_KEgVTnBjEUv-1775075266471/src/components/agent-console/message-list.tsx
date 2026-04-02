"use client";

import React, { useEffect, useRef } from "react";
import { type Message } from "@/lib/mock-data";
import MessageItem from "./message-item";

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-2">Start a conversation with the agent</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
