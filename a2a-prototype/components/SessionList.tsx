'use client';
import type { FC } from 'react';
import type { Session, OrchestratorState } from '@/lib/types';
import ConfidenceBadge from './ConfidenceBadge';

const STATE_COLORS: Partial<Record<OrchestratorState, string>> = {
  IDLE: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  SCANNING: 'bg-cyan-900/50 text-cyan-400 border-cyan-800',
  SYNTHESIZING: 'bg-indigo-900/50 text-indigo-400 border-indigo-800',
  ENRICHING: 'bg-teal-900/50 text-teal-400 border-teal-800',
  EXECUTING: 'bg-blue-900/50 text-blue-400 border-blue-800',
  SELF_CORRECTING: 'bg-orange-900/50 text-orange-400 border-orange-800',
  WAITING_ON_HUMAN: 'bg-amber-900/50 text-amber-400 border-amber-800',
  VALIDATING: 'bg-purple-900/50 text-purple-400 border-purple-800',
  DELIVERING: 'bg-green-900/50 text-green-400 border-green-800',
  STOPPED: 'bg-red-900/50 text-red-400 border-red-800',
  // Cognitive cycle phases
  REFLECT:    'bg-violet-900/50 text-violet-400 border-violet-800',
  SYNTHESIZE: 'bg-fuchsia-900/50 text-fuchsia-400 border-fuchsia-800',
  ENRICH:     'bg-pink-900/50 text-pink-400 border-pink-800',
  PLAN:       'bg-rose-900/50 text-rose-400 border-rose-800',
  EXECUTE:    'bg-orange-900/50 text-orange-400 border-orange-800',
};

const DEFAULT_STATE_COLOR = 'bg-zinc-800 text-zinc-400 border-zinc-700';

interface Props {
  sessions: Session[];
  selectedId?: string;
  onSelect: (sessionId: string) => void;
}

const SessionList: FC<Props> = ({ sessions, selectedId, onSelect }) => {
  const active = sessions.filter((s) => !['STOPPED', 'IDLE'].includes(s.state));
  const idle = sessions.filter((s) => s.state === 'IDLE');
  const stopped = sessions.filter((s) => s.state === 'STOPPED');

  const renderGroup = (title: string, items: Session[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <p className="text-zinc-600 text-xs font-mono px-3 py-1">{title}</p>
        {items.map((s) => (
          <button
            key={s.session_id}
            onClick={() => onSelect(s.session_id)}
            aria-pressed={selectedId === s.session_id}
            className={`w-full text-left px-3 py-2 hover:bg-zinc-800 transition-colors ${selectedId === s.session_id ? 'bg-zinc-800 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
          >
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-zinc-300 text-xs font-medium truncate">{s.name}</span>
              <ConfidenceBadge value={s.metrics.confidence} showLabel={false} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded border text-xs font-mono ${STATE_COLORS[s.state] ?? DEFAULT_STATE_COLOR}`}>
                {s.state}
              </span>
              <span className="text-zinc-700 text-xs font-mono truncate">
                {new Date(s.updated_at).toLocaleTimeString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="overflow-y-auto flex-1">
      {renderGroup('Active', active)}
      {renderGroup('Idle', idle)}
      {renderGroup('Stopped', stopped)}
    </div>
  );
};

export default SessionList;
