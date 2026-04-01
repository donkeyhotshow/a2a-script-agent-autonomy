'use client';
import type { FC } from 'react';
import type { Session, OrchestratorState } from '@/lib/types';
import ConfidenceBadge from './ConfidenceBadge';

const STATE_COLORS: Record<OrchestratorState, string> = {
  IDLE: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  SCANNING: 'bg-cyan-900 text-cyan-300 border-cyan-700',
  SYNTHESIZING: 'bg-indigo-900 text-indigo-300 border-indigo-700',
  ENRICHING: 'bg-teal-900 text-teal-300 border-teal-700',
  EXECUTING: 'bg-blue-900 text-blue-300 border-blue-700',
  SELF_CORRECTING: 'bg-orange-900 text-orange-300 border-orange-700',
  WAITING_ON_HUMAN: 'bg-amber-900 text-amber-300 border-amber-700',
  VALIDATING: 'bg-purple-900 text-purple-300 border-purple-700',
  DELIVERING: 'bg-green-900 text-green-300 border-green-700',
  STOPPED: 'bg-red-900 text-red-300 border-red-700',
};

const AUTONOMY_COLORS = {
  FULL: 'text-emerald-400',
  BOUNDED: 'text-amber-400',
  HITL: 'text-blue-400',
  STOPPED: 'text-red-400',
};

interface Props {
  session: Session;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

const SessionHeader: FC<Props> = ({ session, onStop, onPause, onResume }) => {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-zinc-200 text-sm font-semibold truncate" title={session.name}>
          {session.name}
        </h2>
        <span className={`px-2 py-0.5 rounded border text-xs font-mono shrink-0 ${STATE_COLORS[session.state]}`}>
          {session.state}
        </span>
        <span className={`text-xs font-mono shrink-0 ${AUTONOMY_COLORS[session.autonomy_level]}`}>
          {session.autonomy_level}
        </span>
        <ConfidenceBadge value={session.metrics.confidence} />
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {session.state !== 'STOPPED' && (
          <>
            <button
              onClick={onPause}
              className="px-2 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded transition-colors"
            >
              ⏸ Pause
            </button>
            <button
              onClick={onResume}
              className="px-2 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded transition-colors"
            >
              ▶ Resume
            </button>
          </>
        )}
        <button
          onClick={onStop}
          className="px-2 py-1 text-xs font-mono text-red-400 hover:text-red-200 border border-red-800 hover:border-red-600 rounded transition-colors"
        >
          ■ Stop
        </button>
      </div>
    </div>
  );
};

export default SessionHeader;
