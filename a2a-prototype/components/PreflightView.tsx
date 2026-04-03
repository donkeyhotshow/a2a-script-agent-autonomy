'use client';
import type { FC } from 'react';
import type { ArtifactBase } from '@/lib/types';

interface PolicyViolationData {
  policy_id: string;
  severity: 'block' | 'warn';
  message: string;
}

interface Props {
  preflight?: ArtifactBase;
  dryrun?: ArtifactBase;
  policyViolations?: ArtifactBase[];
  onApprove?: () => void;
}

const PreflightView: FC<Props> = ({ preflight, dryrun, policyViolations = [], onApprove }) => {
  const pfData = preflight?.data as Record<string, unknown> | undefined;
  const drData = dryrun?.data as Record<string, unknown> | undefined;

  const issues = (pfData?.issues as Array<{ id: string; description: string; severity: string }>) ?? [];
  const suggestions = (pfData?.suggestions as Array<{ id: string; description: string; confidence_gain: number }>) ?? [];
  const predictedSteps = (drData?.predicted_steps as Array<{ step: string; label: string; confidence: number }>) ?? [];
  const confidenceBand = (drData?.confidence_band as [number, number]) ?? [0, 0];

  const violations = policyViolations.map(
    (a) => a.data as unknown as PolicyViolationData,
  );
  const blockViolations = violations.filter((v) => v.severity === 'block');
  const warnViolations = violations.filter((v) => v.severity === 'warn');

  return (
    <div className="border border-zinc-800 rounded bg-zinc-950 p-4 space-y-4">
      <h3 className="text-zinc-300 font-mono text-sm font-semibold">Preflight Analysis</h3>

      {/* Policy Check */}
      <div className="space-y-1.5">
        <p className="text-zinc-500 text-xs font-mono mb-1">Policy Check</p>
        {violations.length === 0 ? (
          <div className="flex items-center gap-2 rounded border border-emerald-800 bg-emerald-950/30 px-3 py-2">
            <span className="text-emerald-400 text-xs">✓</span>
            <span className="text-emerald-300 text-xs font-mono">All policies cleared — no violations</span>
          </div>
        ) : (
          <>
            {blockViolations.map((v) => (
              <div key={v.policy_id} className="flex items-start gap-2 rounded border border-red-800 bg-red-950/30 px-3 py-2">
                <span className="text-red-400 text-xs font-mono shrink-0">[{v.policy_id}]</span>
                <span className="text-red-300 text-xs">{v.message}</span>
              </div>
            ))}
            {warnViolations.map((v) => (
              <div key={v.policy_id} className="flex items-start gap-2 rounded border border-amber-800 bg-amber-950/30 px-3 py-2">
                <span className="text-amber-400 text-xs font-mono shrink-0">[{v.policy_id}]</span>
                <span className="text-amber-300 text-xs">{v.message}</span>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-zinc-500 text-xs font-mono mb-2">Issues ({issues.length})</p>
            {issues.map((issue) => (
              <div key={issue.id} className="flex items-start gap-2 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${issue.severity === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <p className="text-zinc-300 text-xs">{issue.description}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-zinc-500 text-xs font-mono mb-2">Suggestions ({suggestions.length})</p>
            {suggestions.map((sug) => (
              <div key={sug.id} className="flex items-start gap-2 mb-1">
                <span className="text-emerald-400 text-xs shrink-0">+{(sug.confidence_gain * 100).toFixed(0)}%</span>
                <p className="text-zinc-300 text-xs">{sug.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-zinc-500 text-xs font-mono">Dry Run Plan (conf {confidenceBand[0]}–{confidenceBand[1]})</p>
          {predictedSteps.map((step, i) => (
            <div key={step.step} className="flex items-center gap-2">
              <span className="text-zinc-600 text-xs font-mono w-4">{i + 1}.</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-zinc-300 text-xs">{step.label}</span>
                  <span className="text-zinc-500 text-xs font-mono">{(step.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded transition-all"
                    style={{ width: `${step.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onApprove}
        className="w-full py-2 rounded bg-blue-700 text-blue-100 text-sm font-mono border border-blue-600 hover:bg-blue-600 transition-colors"
      >
        Approve Plan → Start Live Run
      </button>
    </div>
  );
};

export default PreflightView;
