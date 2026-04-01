import type { FC } from 'react';
import type { OrchestratorState } from '@/lib/types';

const PHASES: OrchestratorState[] = [
  'IDLE', 'SCANNING', 'SYNTHESIZING', 'ENRICHING',
  'EXECUTING', 'SELF_CORRECTING', 'WAITING_ON_HUMAN',
  'VALIDATING', 'DELIVERING', 'STOPPED',
];

const PHASE_COLORS: Record<OrchestratorState, string> = {
  IDLE: 'text-zinc-400',
  SCANNING: 'text-cyan-400',
  SYNTHESIZING: 'text-indigo-400',
  ENRICHING: 'text-teal-400',
  EXECUTING: 'text-blue-400',
  SELF_CORRECTING: 'text-orange-400',
  WAITING_ON_HUMAN: 'text-amber-400',
  VALIDATING: 'text-purple-400',
  DELIVERING: 'text-green-400',
  STOPPED: 'text-red-400',
};

const PHASE_BG: Record<OrchestratorState, string> = {
  IDLE: 'bg-zinc-800 border-zinc-600',
  SCANNING: 'bg-cyan-900 border-cyan-600',
  SYNTHESIZING: 'bg-indigo-900 border-indigo-600',
  ENRICHING: 'bg-teal-900 border-teal-600',
  EXECUTING: 'bg-blue-900 border-blue-600',
  SELF_CORRECTING: 'bg-orange-900 border-orange-600',
  WAITING_ON_HUMAN: 'bg-amber-900 border-amber-600',
  VALIDATING: 'bg-purple-900 border-purple-600',
  DELIVERING: 'bg-green-900 border-green-600',
  STOPPED: 'bg-red-900 border-red-600',
};

interface Props {
  current: OrchestratorState;
}

const PhaseStrip: FC<Props> = ({ current }) => {
  return (
    <div className="flex items-center gap-0 overflow-x-auto border-b border-zinc-800 bg-zinc-950 px-3 py-1.5">
      {PHASES.map((phase, i) => {
        const isActive = phase === current;
        const isPast = PHASES.indexOf(current) > i && current !== 'STOPPED';
        return (
          <div key={phase} className="flex items-center">
            <span
              className={`px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap border transition-all ${
                isActive
                  ? `${PHASE_BG[phase]} ${PHASE_COLORS[phase]} font-semibold`
                  : isPast
                  ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  : 'bg-transparent text-zinc-600 border-transparent'
              }`}
            >
              {phase}
            </span>
            {i < PHASES.length - 1 && (
              <span className="text-zinc-700 text-xs mx-0.5">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PhaseStrip;
