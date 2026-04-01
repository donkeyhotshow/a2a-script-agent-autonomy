import type { FC } from 'react';
import type { OrchestratorState } from '@/lib/types';
import { isCognitivePhase } from '@/lib/types';

// Cognitive cycle phases (ADR-0071) — inner loop
const COGNITIVE_PHASES: OrchestratorState[] = ['REFLECT', 'SYNTHESIZE', 'ENRICH', 'PLAN', 'EXECUTE'];

// Operational states (ADR-0051) — outer FSM
const OPERATIONAL_STATES: OrchestratorState[] = [
  'IDLE', 'SCANNING', 'SYNTHESIZING', 'ENRICHING',
  'EXECUTING', 'SELF_CORRECTING', 'WAITING_ON_HUMAN',
  'VALIDATING', 'DELIVERING', 'STOPPED',
];

const PHASE_COLORS: Partial<Record<OrchestratorState, string>> = {
  // Operational
  IDLE:             'text-zinc-400',
  SCANNING:         'text-cyan-400',
  SYNTHESIZING:     'text-indigo-400',
  ENRICHING:        'text-teal-400',
  EXECUTING:        'text-blue-400',
  SELF_CORRECTING:  'text-orange-400',
  WAITING_ON_HUMAN: 'text-amber-400',
  VALIDATING:       'text-purple-400',
  DELIVERING:       'text-green-400',
  STOPPED:          'text-red-400',
  // Cognitive
  REFLECT:    'text-violet-300',
  SYNTHESIZE: 'text-fuchsia-300',
  ENRICH:     'text-pink-300',
  PLAN:       'text-rose-300',
  EXECUTE:    'text-orange-300',
};

const PHASE_BG: Partial<Record<OrchestratorState, string>> = {
  // Operational
  IDLE:             'bg-zinc-800 border-zinc-600',
  SCANNING:         'bg-cyan-900 border-cyan-600',
  SYNTHESIZING:     'bg-indigo-900 border-indigo-600',
  ENRICHING:        'bg-teal-900 border-teal-600',
  EXECUTING:        'bg-blue-900 border-blue-600',
  SELF_CORRECTING:  'bg-orange-900 border-orange-600',
  WAITING_ON_HUMAN: 'bg-amber-900 border-amber-600',
  VALIDATING:       'bg-purple-900 border-purple-600',
  DELIVERING:       'bg-green-900 border-green-600',
  STOPPED:          'bg-red-900 border-red-600',
  // Cognitive
  REFLECT:    'bg-violet-900 border-violet-600',
  SYNTHESIZE: 'bg-fuchsia-900 border-fuchsia-600',
  ENRICH:     'bg-pink-900 border-pink-600',
  PLAN:       'bg-rose-900 border-rose-600',
  EXECUTE:    'bg-orange-900 border-orange-600',
};

interface Props {
  current: OrchestratorState;
}

function PhaseRow({
  phases,
  current,
  label,
}: {
  phases: OrchestratorState[];
  current: OrchestratorState;
  label: string;
}) {
  const currentIdx = phases.indexOf(current);
  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      <span className="text-zinc-600 text-xs font-mono mr-2 shrink-0 w-16 text-right">{label}</span>
      {phases.map((phase, i) => {
        const isActive = phase === current;
        const isPast = currentIdx > i && current !== 'STOPPED';
        return (
          <div key={phase} className="flex items-center">
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-mono whitespace-nowrap border transition-all ${
                isActive
                  ? `${PHASE_BG[phase] ?? 'bg-zinc-800 border-zinc-600'} ${PHASE_COLORS[phase] ?? 'text-zinc-300'} font-semibold`
                  : isPast
                  ? 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  : 'bg-transparent text-zinc-700 border-transparent'
              }`}
            >
              {phase}
            </span>
            {i < phases.length - 1 && (
              <span className="text-zinc-700 text-xs mx-0.5">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const PhaseStrip: FC<Props> = ({ current }) => {
  const inCognitive = isCognitivePhase(current);

  return (
    <div className="flex flex-col border-b border-zinc-800 bg-zinc-950 px-3 py-1 gap-0.5">
      {/* Operational states row — always shown */}
      <PhaseRow
        phases={OPERATIONAL_STATES}
        current={inCognitive ? 'EXECUTING' : current}
        label="FSM"
      />
      {/* Cognitive cycle row — highlighted when inside EXECUTING loop */}
      <PhaseRow
        phases={COGNITIVE_PHASES}
        current={inCognitive ? current : ('IDLE' as OrchestratorState)}
        label="Cycle"
      />
    </div>
  );
};

export default PhaseStrip;
