'use client';
import type { FC } from 'react';
import type { ChatMessage } from '@/lib/types';
import EvidenceChip from './EvidenceChip';

interface Props {
  message: ChatMessage;
  onChipClick?: (artifactId: string) => void;
}

const MessageItem: FC<Props> = ({ message, onChipClick }) => {
  const isAgent = message.role === 'agent';
  return (
    <div className={`flex gap-3 px-4 py-3 ${isAgent ? 'bg-zinc-900/40' : ''}`}>
      <div className="shrink-0 mt-0.5">
        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono border ${
          isAgent
            ? 'bg-blue-900 text-blue-300 border-blue-700'
            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
        }`}>
          {isAgent ? 'A' : 'O'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-zinc-500">{message.role}</span>
          <span className="text-xs font-mono text-zinc-700">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-zinc-200 text-sm leading-relaxed">{message.content}</p>
        {message.evidence_chips && message.evidence_chips.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {message.evidence_chips.map((chip) => (
              <EvidenceChip key={chip.artifact_id} chip={chip} onClick={onChipClick} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
