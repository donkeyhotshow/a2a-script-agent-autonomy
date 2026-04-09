'use client';
import type { FC } from 'react';
import type { ArtifactBase, ValidationSummaryData } from '@/lib/types';

interface Props {
  donecriteriaArtifact?: ArtifactBase;
  validationSummary?: ArtifactBase;
  branchIntegrity?: ArtifactBase;
}

function SuiteCell({ label, suite }: { label: string; suite: { total: number; passed: number; failed: number; skipped: number } | undefined }) {
  if (!suite) return null;
  return (
    <div className="text-center p-2 rounded bg-zinc-900">
      <p className="text-zinc-500 font-mono text-xs mb-1">{label}</p>
      <p className="text-emerald-400 font-mono text-xs">{suite.passed}✓</p>
      {suite.failed > 0 && <p className="text-red-400 font-mono text-xs">{suite.failed}✗</p>}
      {suite.skipped > 0 && <p className="text-zinc-500 font-mono text-xs">{suite.skipped}–</p>}
    </div>
  );
}

const SAFETY_COLORS = {
  SAFE:    'bg-emerald-950 text-emerald-300 border-emerald-800',
  UNSAFE:  'bg-red-950 text-red-300 border-red-800',
  UNKNOWN: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

const ValidationView: FC<Props> = ({ donecriteriaArtifact, validationSummary, branchIntegrity }) => {
  const dcData = donecriteriaArtifact?.data as Record<string, unknown> | undefined;
  const vsData = validationSummary?.data as ValidationSummaryData | undefined;
  const biData = branchIntegrity?.data as Record<string, unknown> | undefined;

  const criteria = (dcData?.criteria as Array<{ id: string; description: string; verified: boolean }>) ?? [];

  // Spec-aligned: suites.{unit,integration,simulation,regression}
  const suites = vsData?.suites;
  const allPassed = vsData?.all_passed;
  const coverage = vsData?.coverage;
  const mergeReady = vsData?.merge_ready;
  const branchSafety = vsData?.branch_safety ?? 'UNKNOWN';
  const blockingFailures = vsData?.blocking_failures ?? [];
  const donecriteriaPassed = vsData?.donecriteria_passed;
  const manualReviewRequired = vsData?.manual_review_required;

  const branchName = biData?.branch_name as string | undefined;
  const mergeTarget = biData?.merge_target as string | undefined;
  const safe = biData?.safe as boolean | undefined;
  const prUrl = biData?.pr_url as string | undefined;

  return (
    <div className="space-y-4">
      {/* Done Criteria checklist */}
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

      {/* Validation suite results (spec v3.0 shape) */}
      {vsData && (
        <div className="border border-zinc-800 rounded p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-zinc-400 text-xs font-mono">Test Results</p>
            {coverage != null && (
              <span className="text-xs font-mono text-zinc-400">
                Coverage: <span className={coverage >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{coverage}%</span>
              </span>
            )}
          </div>

          {/* Suite grid */}
          {suites && (
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              <SuiteCell label="Unit" suite={suites.unit} />
              <SuiteCell label="Integration" suite={suites.integration} />
              <SuiteCell label="Simulation" suite={suites.simulation} />
              <SuiteCell label="Regression" suite={suites.regression} />
            </div>
          )}

          {/* Blocking failures */}
          {blockingFailures.length > 0 && (
            <div className="space-y-1">
              <p className="text-red-400 text-xs font-mono">Blocking failures:</p>
              {blockingFailures.map((f, i) => (
                <p key={i} className="text-red-300 text-xs pl-2 border-l-2 border-red-800">{f}</p>
              ))}
            </div>
          )}

          {/* Status flags */}
          <div className="flex flex-wrap gap-1.5">
            <span className={`px-2 py-0.5 rounded text-xs font-mono border ${allPassed ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-red-950 text-red-300 border-red-800'}`}>
              {allPassed ? '✓ All passed' : '✗ Failures'}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-mono border ${SAFETY_COLORS[branchSafety]}`}>
              {branchSafety}
            </span>
            {donecriteriaPassed != null && (
              <span className={`px-2 py-0.5 rounded text-xs font-mono border ${donecriteriaPassed ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-red-950 text-red-300 border-red-800'}`}>
                DC {donecriteriaPassed ? '✓' : '✗'}
              </span>
            )}
            {manualReviewRequired && (
              <span className="px-2 py-0.5 rounded text-xs font-mono border bg-amber-950 text-amber-300 border-amber-800">
                ⚠ Manual review
              </span>
            )}
          </div>

          {/* Merge readiness */}
          <div className={`text-center py-1 rounded text-xs font-mono border ${mergeReady ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-red-950 text-red-300 border-red-800'}`}>
            {mergeReady ? '✓ Merge ready' : '✗ Not merge ready'}
          </div>
        </div>
      )}

      {/* Branch Integrity */}
      {biData && (
        <div className="border border-zinc-800 rounded p-3">
          <p className="text-zinc-400 text-xs font-mono mb-2">Branch Integrity</p>
          <div className="space-y-1 text-xs">
            {branchName && (
              <div className="flex gap-2">
                <span className="text-zinc-500 font-mono w-16 shrink-0">branch:</span>
                <span className="text-zinc-300 font-mono">{branchName}</span>
              </div>
            )}
            {mergeTarget && (
              <div className="flex gap-2">
                <span className="text-zinc-500 font-mono w-16 shrink-0">target:</span>
                <span className="text-zinc-300 font-mono">{mergeTarget}</span>
              </div>
            )}
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
