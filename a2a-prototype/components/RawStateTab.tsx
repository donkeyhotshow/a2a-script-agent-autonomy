'use client';
import { useState, type FC } from 'react';
import type { Session, ArtifactBase } from '@/lib/types';

interface Props {
  session: Session;
  artifacts: ArtifactBase[];
}

const RawStateTab: FC<Props> = ({ session, artifacts }) => {
  const [copied, setCopied] = useState(false);
  const envelope = {
    session,
    artifact_count: artifacts.length,
    artifacts: artifacts.slice(0, 5),
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(envelope, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
        <span className="text-zinc-500 text-xs font-mono">Raw Session State</span>
        <button
          onClick={handleCopy}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 hover:border-zinc-500 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <pre className="text-xs font-mono text-zinc-400 leading-relaxed">
          {JSON.stringify(envelope, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default RawStateTab;
