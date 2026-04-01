'use client';
import { useState, useEffect, type FC } from 'react';
import type { ArtifactBase } from '@/lib/types';
import { validateArtifact } from '@/lib/artifact-validator';

interface Props {
  artifact: ArtifactBase | null;
  onClose: () => void;
}

const SEVERITY_COLORS = {
  info:     'bg-blue-900 text-blue-300 border-blue-700',
  warning:  'bg-amber-900 text-amber-300 border-amber-700',
  critical: 'bg-red-900 text-red-300 border-red-700',
};

const ArtifactInspector: FC<Props> = ({ artifact, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);

  useEffect(() => {
    if (!artifact) { setValidation(null); return; }
    setValidation(validateArtifact(artifact));
  }, [artifact]);

  if (!artifact) return null;

  const json = JSON.stringify(artifact, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => { /* clipboard write failed — silently ignore */ });
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label={`Artifact inspector: ${artifact.artifact_id}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-[720px] max-w-[95vw] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono font-bold text-zinc-200 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded">
              {artifact.artifact_type}
            </span>
            {artifact.severity && (
              <span className={`text-xs font-mono px-2 py-0.5 rounded border ${SEVERITY_COLORS[artifact.severity]}`}>
                {artifact.severity}
              </span>
            )}
            <span className="text-zinc-400 text-xs font-mono truncate">{artifact.artifact_id}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close artifact inspector"
            className="text-zinc-500 hover:text-zinc-200 text-lg leading-none px-1 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Summary */}
        <div className="px-4 py-2 border-b border-zinc-800 shrink-0">
          <p className="text-zinc-300 text-sm">{artifact.summary}</p>
          <div className="flex gap-4 mt-1">
            <span className="text-zinc-500 text-xs font-mono">
              session: <span className="text-zinc-400">{artifact.session_id}</span>
            </span>
            <span className="text-zinc-500 text-xs font-mono">
              turn: <span className="text-zinc-400">{artifact.turn_id}</span>
            </span>
            <span className="text-zinc-500 text-xs font-mono">
              schema: <span className="text-zinc-400">v{artifact.schema_version}</span>
            </span>
            <span className="text-zinc-500 text-xs font-mono">
              {new Date(artifact.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>
        </div>

        {/* AJV Validation Badge */}
        {validation && (
          <div className={`px-4 py-1.5 border-b border-zinc-800 shrink-0 flex items-center gap-2 ${validation.valid ? 'bg-emerald-950' : 'bg-red-950'}`}>
            <span className={`text-xs font-mono font-semibold ${validation.valid ? 'text-emerald-400' : 'text-red-400'}`}>
              {validation.valid ? '✓ Schema valid (ajv)' : '✗ Schema errors (ajv)'}
            </span>
            {!validation.valid && (
              <ul className="flex flex-wrap gap-2">
                {validation.errors.slice(0, 4).map((err, i) => (
                  <li key={i} className="text-xs font-mono text-red-300 bg-red-900 px-1.5 py-0.5 rounded border border-red-800">
                    {err}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* JSON Body */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all leading-relaxed">
            {json}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 shrink-0">
          {artifact.consumed_by && artifact.consumed_by.length > 0 ? (
            <span className="text-zinc-500 text-xs font-mono">
              consumed by: <span className="text-zinc-400">{artifact.consumed_by.join(', ')}</span>
            </span>
          ) : (
            <span className="text-zinc-700 text-xs font-mono">not yet consumed</span>
          )}
          <button
            onClick={handleCopy}
            className="px-3 py-1 text-xs font-mono text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy JSON'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtifactInspector;
