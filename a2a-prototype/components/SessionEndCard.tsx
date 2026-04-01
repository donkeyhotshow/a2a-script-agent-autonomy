'use client';
import type { FC } from 'react';
import type { ArtifactBase, SessionEndRecordData, FitnessViolation } from '@/lib/types';

interface Props {
  artifact: ArtifactBase;
}

const END_REASON_COLORS: Record<string, string> = {
  SUCCESS:          'bg-emerald-900 text-emerald-300 border-emerald-700',
  FAILED:           'bg-red-900 text-red-300 border-red-700',
  ABORTED:          'bg-orange-900 text-orange-300 border-orange-700',
  TIMEOUT:          'bg-amber-900 text-amber-300 border-amber-700',
  OPERATOR_STOPPED: 'bg-zinc-800 text-zinc-300 border-zinc-700',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500 font-mono">{label}</span>
      <span className="text-zinc-300 font-mono">{value}</span>
    </div>
  );
}

function ViolationRow({ v }: { v: FitnessViolation }) {
  return (
    <div className="flex items-center gap-2 text-xs border border-red-900 rounded px-2 py-1 bg-red-950/20">
      <span className="text-red-400 font-mono font-semibold">{v.metric}</span>
      <span className="text-zinc-600 font-mono">threshold {v.threshold}</span>
      <span className="text-red-300 font-mono ml-auto">actual {v.actual}</span>
    </div>
  );
}

const SessionEndCard: FC<Props> = ({ artifact }) => {
  const data = artifact.data as unknown as SessionEndRecordData;
  const endReason = data.end_reason ?? 'FAILED';
  const colorClass = END_REASON_COLORS[endReason] ?? END_REASON_COLORS.FAILED;
  const isSuccess = endReason === 'SUCCESS';
  const violations = data.fitness_violations ?? [];

  return (
    <div className={`border rounded p-3 space-y-3 ${isSuccess ? 'border-emerald-900 bg-emerald-950/10' : 'border-red-900 bg-red-950/10'}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-mono text-xs font-semibold">SESSION_END_RECORD</span>
          <span className={`px-2 py-0.5 rounded border text-xs font-mono ${colorClass}`}>
            {endReason}
          </span>
        </div>
        <span className="text-zinc-500 text-xs font-mono">{formatDuration(data.duration_ms ?? 0)}</span>
      </div>

      <p className="text-zinc-300 text-xs">{artifact.summary}</p>

      {/* Counters grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <MetricRow label="loops"            value={data.total_loop_count} />
        <MetricRow label="tool calls"       value={data.total_tool_calls} />
        <MetricRow label="human interrupts" value={data.total_human_interrupts} />
        <MetricRow label="self corrections" value={data.total_self_corrections} />
        <MetricRow label="final confidence" value={(data.final_confidence ?? 0).toFixed(2)} />
        <MetricRow label="DC completion"    value={`${data.donecriteria_completion_rate ?? 0}%`} />
        <MetricRow label="branch merged"    value={data.branch_merged ? '✓ yes' : '✗ no'} />
        <MetricRow label="lessons saved"    value={data.lessons_saved_to_memory} />
      </div>

      {/* ROI metrics */}
      {data.roi_metrics && (
        <div className="border border-zinc-800 rounded p-2 space-y-1">
          <p className="text-zinc-500 text-xs font-mono mb-1">ROI</p>
          <MetricRow label="time saved"          value={formatDuration(data.roi_metrics.estimated_time_saved_ms)} />
          <MetricRow label="errors prevented"    value={data.roi_metrics.errors_prevented} />
          <MetricRow label="suggestions applied" value={data.roi_metrics.suggestions_applied} />
        </div>
      )}

      {/* Fitness violations */}
      {violations.length > 0 && (
        <div className="space-y-1">
          <p className="text-red-400 text-xs font-mono">Fitness violations ({violations.length})</p>
          {violations.map((v, i) => (
            <ViolationRow key={i} v={v} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionEndCard;
