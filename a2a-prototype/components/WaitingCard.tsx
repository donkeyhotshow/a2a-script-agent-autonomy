'use client';
import { useState, type FC } from 'react';
import type { ArtifactBase, RequiredInput } from '@/lib/types';

interface Props {
  artifact: ArtifactBase;
  onApprove?: () => void;
  onReject?: () => void;
}

const WaitingCard: FC<Props> = ({ artifact, onApprove, onReject }) => {
  const [approved, setApproved] = useState<boolean | null>(null);
  const data = artifact.data as Record<string, unknown>;
  const requiredInputs = (data.required_inputs as RequiredInput[]) ?? [];
  const reason = (data.reason as string) ?? 'unknown';
  const expiresAt = data.expires_at as string;
  const approvalType = data.humanlayer_approval_type as string;
  const checkpointId = data.checkpoint_id as string;

  const handleApprove = () => {
    setApproved(true);
    onApprove?.();
  };

  const handleReject = () => {
    setApproved(false);
    onReject?.();
  };

  return (
    <div className="rounded border border-amber-800 bg-amber-950/20 p-4 text-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-300 font-semibold font-mono text-xs">WAITING_ON_HUMAN</span>
        </div>
        <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-300 text-xs font-mono border border-amber-700">
          {approvalType}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex gap-2 text-xs">
          <span className="text-zinc-500 font-mono w-24 shrink-0">reason:</span>
          <span className="text-zinc-300 font-mono">{reason}</span>
        </div>
        {expiresAt && (
          <div className="flex gap-2 text-xs">
            <span className="text-zinc-500 font-mono w-24 shrink-0">expires:</span>
            <span className="text-zinc-300 font-mono">{new Date(expiresAt).toLocaleString()}</span>
          </div>
        )}
        {checkpointId && (
          <div className="flex gap-2 text-xs">
            <span className="text-zinc-500 font-mono w-24 shrink-0">checkpoint:</span>
            <span className="text-zinc-400 font-mono">{checkpointId}</span>
          </div>
        )}
      </div>

      {requiredInputs.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-zinc-500 text-xs font-mono mb-1">Required inputs:</p>
          {requiredInputs.map((inp) => (
            <p key={inp.id} className="text-zinc-300 text-sm border-l-2 border-amber-700 pl-2">
              {inp.label}
            </p>
          ))}
        </div>
      )}

      {approved === null ? (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            className="flex-1 py-1.5 rounded bg-emerald-800 text-emerald-200 text-xs font-mono border border-emerald-700 hover:bg-emerald-700 transition-colors"
          >
            ✓ Approve
          </button>
          <button
            onClick={handleReject}
            className="flex-1 py-1.5 rounded bg-red-900 text-red-200 text-xs font-mono border border-red-700 hover:bg-red-800 transition-colors"
          >
            ✗ Reject
          </button>
        </div>
      ) : (
        <div className={`text-center py-1.5 rounded text-xs font-mono border ${approved ? 'bg-emerald-900 text-emerald-300 border-emerald-700' : 'bg-red-900 text-red-300 border-red-700'}`}>
          {approved ? '✓ Approved' : '✗ Rejected'}
        </div>
      )}
    </div>
  );
};

export default WaitingCard;
