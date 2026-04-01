'use client';
import type { FC } from 'react';
import type { ArtifactBase } from '@/lib/types';

interface Props {
  donecriteriaArtifact?: ArtifactBase;
  validationSummary?: ArtifactBase;
  branchIntegrity?: ArtifactBase;
}

const ValidationView: FC<Props> = ({ donecriteriaArtifact, validationSummary, branchIntegrity }) => {
  const dcData = donecriteriaArtifact?.data as Record<string, unknown> | undefined;
  const vsData = validationSummary?.data as Record<string, unknown> | undefined;
  const biData = branchIntegrity?.data as Record<string, unknown> | undefined;

  const criteria = (dcData?.criteria as Array<{ id: string; description: string; verified: boolean }>) ?? [];
  const unitTests = vsData?.unit_tests as { passed: number; failed: number; skipped?: number } | undefined;
  const integrationTests = vsData?.integration_tests as { passed: number; failed: number } | undefined;
  const simulations = vsData?.simulations as { passed: number; failed: number } | undefined;
  const allPass = vsData?.all_pass as boolean | undefined;

  const branchName = biData?.branch_name as string | undefined;
  const mergeTarget = biData?.merge_target as string | undefined;
  const safe = biData?.safe as boolean | undefined;
  const prUrl = biData?.pr_url as string | undefined;

  return (
    <div className="space-y-4">
      {criteria.length > 0 && (
        <div className="border border-zinc-800 rounded p-3">
          <p className="text-zinc-400 text-xs font-mono mb-2">Done Criteria</p>
          {criteria.map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-1 border-b border-zinc-900 last:border-0">
              <span className={c.verified ? 'text-emerald-400' : 'text-red-400'}>
                {c.verified ? '✓' : '✗'}
              </span>
              <span className="text-zinc-300 text-xs">{c.description}</span>
            </div>
          ))}
        </div>
      )}

      {vsData && (
        <div className="border border-zinc-800 rounded p-3">
          <p className="text-zinc-400 text-xs font-mono mb-2">Test Results</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {unitTests && (
              <div className="text-center p-2 rounded bg-zinc-900">
                <p className="text-zinc-500 font-mono mb-1">Unit</p>
                <p className="text-emerald-400 font-mono">{unitTests.passed}✓</p>
                {unitTests.failed > 0 && <p className="text-red-400 font-mono">{unitTests.failed}✗</p>}
              </div>
            )}
            {integrationTests && (
              <div className="text-center p-2 rounded bg-zinc-900">
                <p className="text-zinc-500 font-mono mb-1">Integration</p>
                <p className="text-emerald-400 font-mono">{integrationTests.passed}✓</p>
                {integrationTests.failed > 0 && <p className="text-red-400 font-mono">{integrationTests.failed}✗</p>}
              </div>
            )}
            {simulations && (
              <div className="text-center p-2 rounded bg-zinc-900">
                <p className="text-zinc-500 font-mono mb-1">Sims</p>
                <p className="text-emerald-400 font-mono">{simulations.passed}✓</p>
                {simulations.failed > 0 && <p className="text-red-400 font-mono">{simulations.failed}✗</p>}
              </div>
            )}
          </div>
          <div className={`mt-2 text-center py-1 rounded text-xs font-mono border ${allPass ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-red-950 text-red-300 border-red-800'}`}>
            {allPass ? '✓ All gates passed' : '✗ Validation failed'}
          </div>
        </div>
      )}

      {biData && (
        <div className="border border-zinc-800 rounded p-3">
          <p className="text-zinc-400 text-xs font-mono mb-2">Branch Integrity</p>
          <div className="space-y-1 text-xs">
            <div className="flex gap-2">
              <span className="text-zinc-500 font-mono w-16 shrink-0">branch:</span>
              <span className="text-zinc-300 font-mono">{branchName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-zinc-500 font-mono w-16 shrink-0">target:</span>
              <span className="text-zinc-300 font-mono">{mergeTarget}</span>
            </div>
          </div>
          <div className={`mt-2 text-center py-1 rounded text-xs font-mono border ${safe ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-red-950 text-red-300 border-red-800'}`}>
            {safe ? '✓ Safe to merge' : '✗ Merge blocked'}
          </div>
          {prUrl && (
            <a href={prUrl} target="_blank" rel="noopener noreferrer" className="block mt-2 text-center text-blue-400 text-xs hover:underline font-mono">
              View PR →
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidationView;
