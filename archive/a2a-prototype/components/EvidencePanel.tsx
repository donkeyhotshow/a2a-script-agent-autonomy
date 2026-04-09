'use client';
import { useState, type FC } from 'react';
import type { ArtifactBase, ArtifactType } from '@/lib/types';
import ArtifactCard from './ArtifactCard';
import ArtifactInspector from './ArtifactInspector';

interface Props {
  artifacts: ArtifactBase[];
}

const EvidencePanel: FC<Props> = ({ artifacts }) => {
  const [filter, setFilter] = useState<ArtifactType | 'ALL'>('ALL');
  const [inspecting, setInspecting] = useState<ArtifactBase | null>(null);
  const types = Array.from(new Set(artifacts.map((a) => a.artifact_type)));
  const filtered = filter === 'ALL' ? artifacts : artifacts.filter((a) => a.artifact_type === filter);

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-zinc-800">
          <h3 className="text-zinc-300 text-xs font-mono font-semibold mb-2">Evidence</h3>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ArtifactType | 'ALL')}
            aria-label="Filter artifacts by type"
            className="w-full text-xs font-mono bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-300"
          >
            <option value="ALL">All types ({artifacts.length})</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-zinc-600 text-xs font-mono text-center py-8">No artifacts</p>
          ) : (
            filtered.map((a) => (
              <ArtifactCard key={a.artifact_id} artifact={a} onInspect={setInspecting} />
            ))
          )}
        </div>
      </div>

      {/* Artifact Inspector modal */}
      <ArtifactInspector artifact={inspecting} onClose={() => setInspecting(null)} />
    </>
  );
};

export default EvidencePanel;
