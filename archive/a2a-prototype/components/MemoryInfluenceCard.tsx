'use client';
import { useState, type FC } from 'react';
import type { ArtifactBase, MemoryInfluenceData, EpisodicRecall, PatternInjection } from '@/lib/types';

interface Props {
  artifact: ArtifactBase;
}

function formatMs(ms: number): string {
  if (ms === 0) return '—';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m`;
}

function RecallRow({ recall }: { recall: EpisodicRecall }) {
  const [open, setOpen] = useState(false);
  const isSuccess = recall.outcome === 'SUCCESS';
  return (
    <div className="border border-zinc-800 rounded p-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`shrink-0 text-xs font-mono px-1.5 py-0.5 rounded border ${isSuccess ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-red-950 text-red-400 border-red-800'}`}>
            {recall.outcome}
          </span>
          <span className="text-zinc-300 text-xs font-mono truncate">{recall.run_id}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-zinc-500 text-xs font-mono">sim {Math.round(recall.task_similarity * 100)}%</span>
          <span className="text-zinc-600 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5 border-t border-zinc-800 pt-2">
          <div className="flex gap-4 text-xs">
            <span className="text-zinc-500 font-mono">saved: <span className="text-zinc-300">{formatMs(recall.roi_metrics.time_saved_ms)}</span></span>
            <span className="text-zinc-500 font-mono">errors prevented: <span className="text-zinc-300">{recall.roi_metrics.errors_prevented}</span></span>
          </div>
          {recall.applied_lessons.length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs font-mono mb-0.5">Applied lessons:</p>
              {recall.applied_lessons.map((l, i) => (
                <p key={i} className="text-zinc-400 text-xs pl-2 border-l-2 border-zinc-700 mb-0.5">{l}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PatternRow({ p }: { p: PatternInjection }) {
  return (
    <div className={`border rounded p-2 text-xs ${p.anti_pattern ? 'border-red-900 bg-red-950/20' : 'border-emerald-900 bg-emerald-950/20'}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-zinc-200 font-mono text-xs font-semibold">{p.pattern_name}</span>
        <div className="flex items-center gap-1 shrink-0">
          {p.anti_pattern && (
            <span className="px-1 py-0.5 rounded bg-red-900 text-red-300 border border-red-800 text-xs font-mono">anti</span>
          )}
          <span className="text-zinc-500 font-mono">{Math.round(p.confidence * 100)}%</span>
        </div>
      </div>
      <p className="text-zinc-400 text-xs">{p.injection_effect}</p>
    </div>
  );
}

const MemoryInfluenceCard: FC<Props> = ({ artifact }) => {
  const data = artifact.data as unknown as MemoryInfluenceData;
  const recalls = data.episodic_recalls ?? [];
  const patterns = data.pattern_injections ?? [];

  return (
    <div className="border border-indigo-900 bg-indigo-950/20 rounded p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-indigo-300 font-mono text-xs font-semibold">MEMORY_INFLUENCE</span>
          <span className="text-zinc-600 text-xs font-mono">{artifact.turn_id}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-500">influence:</span>
          <span className={data.total_influence_score >= 0.7 ? 'text-emerald-400' : 'text-amber-400'}>
            {Math.round(data.total_influence_score * 100)}%
          </span>
          <span className="text-zinc-500">Δconf:</span>
          <span className={data.confidence_delta_from_memory >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {data.confidence_delta_from_memory >= 0 ? '+' : ''}{data.confidence_delta_from_memory.toFixed(2)}
          </span>
        </div>
      </div>

      <p className="text-zinc-300 text-xs">{artifact.summary}</p>

      {/* Episodic recalls */}
      {recalls.length > 0 && (
        <div className="space-y-1">
          <p className="text-zinc-500 text-xs font-mono">Episodic recalls ({recalls.length})</p>
          {recalls.map((r) => (
            <RecallRow key={r.run_id} recall={r} />
          ))}
        </div>
      )}

      {/* Pattern injections */}
      {patterns.length > 0 && (
        <div className="space-y-1">
          <p className="text-zinc-500 text-xs font-mono">Pattern injections ({patterns.length})</p>
          {patterns.map((p) => (
            <PatternRow key={p.pattern_id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoryInfluenceCard;
