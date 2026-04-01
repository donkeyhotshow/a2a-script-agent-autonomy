'use client';
import { useState, type FC } from 'react';
import type { ArtifactBase } from '@/lib/types';
import MemoryInfluenceCard from './MemoryInfluenceCard';
import SessionEndCard from './SessionEndCard';

// Artifact types that have their own rich inline renderer
const RICH_TYPES = new Set<string>(['MEMORY_INFLUENCE', 'SESSION_END_RECORD']);

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
  onInspect?: (artifact: ArtifactBase) => void;
}

const ArtifactCard: FC<Props> = ({ artifact, onInspect }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const sev = artifact.severity ?? 'info';

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(artifact, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* clipboard write failed — silently ignore */ });
  };

  // Action toolbar shown above rich cards too
  const toolbar = (
    <div className="flex items-center gap-1 justify-end mb-2">
      {onInspect && (
        <button
          onClick={() => onInspect(artifact)}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
        >
          Inspect
        </button>
      )}
      <button
        onClick={handleCopy}
        className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );

  // Delegate to rich renderer for specific artifact types
  if (artifact.artifact_type === 'MEMORY_INFLUENCE') {
    return (
      <div>
        {toolbar}
        <MemoryInfluenceCard artifact={artifact} />
      </div>
    );
  }

  if (artifact.artifact_type === 'SESSION_END_RECORD') {
    return (
      <div>
        {toolbar}
        <SessionEndCard artifact={artifact} />
      </div>
    );
  }

  // Default generic card
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
          {onInspect && (
            <button
              onClick={() => onInspect(artifact)}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
            >
              Inspect
            </button>
          )}
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
      <p className="text-zinc-600 text-xs font-mono">
        {new Date(artifact.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
      </p>
      {expanded && (
        <pre className="mt-2 text-xs font-mono text-zinc-400 bg-zinc-900 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto border border-zinc-800">
          {JSON.stringify(artifact.data, null, 2)}
        </pre>
      )}
    </div>
  );
};

export { RICH_TYPES };
export default ArtifactCard;
