'use client';
import { useState, type FC } from 'react';
import type { ArtifactBase } from '@/lib/types';

const SEVERITY_COLORS = {
  info: 'border-blue-800 bg-blue-950/30',
  warning: 'border-amber-800 bg-amber-950/30',
  critical: 'border-red-800 bg-red-950/30',
};

const SEVERITY_BADGE = {
  info: 'bg-blue-900 text-blue-300',
  warning: 'bg-amber-900 text-amber-300',
  critical: 'bg-red-900 text-red-300',
};

interface Props {
  artifact: ArtifactBase;
}

const ArtifactCard: FC<Props> = ({ artifact }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const sev = artifact.severity ?? 'info';

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(artifact, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`rounded border p-3 text-sm ${SEVERITY_COLORS[sev]}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${SEVERITY_BADGE[sev]}`}>
            {artifact.artifact_type}
          </span>
          <span className="text-zinc-400 text-xs font-mono">{artifact.turn_id}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
          >
            {expanded ? 'Hide' : 'JSON'}
          </button>
        </div>
      </div>
      <p className="text-zinc-300 text-sm mb-1">{artifact.summary}</p>
      <p className="text-zinc-600 text-xs font-mono">{new Date(artifact.created_at).toLocaleTimeString()}</p>
      {expanded && (
        <pre className="mt-2 text-xs font-mono text-zinc-400 bg-zinc-900 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto border border-zinc-800">
          {JSON.stringify(artifact.data, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default ArtifactCard;
