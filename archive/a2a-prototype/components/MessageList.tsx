'use client';
import { useEffect, useRef, type FC } from 'react';
import type { ChatMessage } from '@/lib/types';
import MessageItem from './MessageItem';

interface Props {
  messages: ChatMessage[];
  onChipClick?: (artifactId: string) => void;
}

const MessageList: FC<Props> = ({ messages, onChipClick }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-zinc-600 text-sm font-mono">No messages yet</p>
        </div>
      ) : (
        messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} onChipClick={onChipClick} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
