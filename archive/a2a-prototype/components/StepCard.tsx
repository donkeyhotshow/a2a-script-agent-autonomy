import type { FC } from 'react';
import type { TaskFlowStep, OrchestratorState } from '@/lib/types';

const STATUS_COLORS = {
  pending: 'bg-zinc-800 border-zinc-700 text-zinc-500',
  active: 'bg-blue-900 border-blue-700 text-blue-300',
  done: 'bg-emerald-950 border-emerald-800 text-emerald-400',
  error: 'bg-red-950 border-red-800 text-red-400',
  waiting: 'bg-amber-950 border-amber-800 text-amber-400',
};

const STATUS_ICON = {
  pending: '○',
  active: '●',
  done: '✓',
  error: '✗',
  waiting: '⏸',
};

const PHASE_COLORS: Partial<Record<OrchestratorState, string>> = {
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
  // Cognitive cycle phases
  REFLECT:    'text-violet-400',
  SYNTHESIZE: 'text-fuchsia-400',
  ENRICH:     'text-pink-400',
  PLAN:       'text-rose-400',
  EXECUTE:    'text-orange-300',
};

interface Props {
  step: TaskFlowStep;
}

const StepCard: FC<Props> = ({ step }) => {
  return (
    <div className={`rounded border p-3 text-xs ${STATUS_COLORS[step.status]}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base">{STATUS_ICON[step.status]}</span>
          <span className={`font-mono font-semibold ${PHASE_COLORS[step.phase] ?? 'text-zinc-400'}`}>{step.label}</span>
        </div>
        {step.duration_ms && (
          <span className="text-zinc-600 font-mono">{step.duration_ms}ms</span>
        )}
      </div>
      <p className="text-zinc-400 ml-6">{step.description}</p>
      {step.artifact_ref && (
        <p className="ml-6 mt-1 font-mono text-zinc-600 truncate" title={step.artifact_ref}>
          ↳ {step.artifact_ref.split('.')[0]}
        </p>
      )}
    </div>
  );
};

export default StepCard;
