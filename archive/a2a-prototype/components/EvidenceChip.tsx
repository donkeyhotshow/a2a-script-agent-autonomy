'use client';
import type { FC } from 'react';
import type { EvidenceChipData } from '@/lib/types';

interface Props {
  chip: EvidenceChipData;
  onClick?: (artifactId: string) => void;
}

const SEVERITY_COLORS = {
  info: 'bg-blue-950 text-blue-300 border-blue-800 hover:bg-blue-900',
  warning: 'bg-amber-950 text-amber-300 border-amber-800 hover:bg-amber-900',
  critical: 'bg-red-950 text-red-300 border-red-800 hover:bg-red-900',
};

const EvidenceChip: FC<Props> = ({ chip, onClick }) => {
  const color = SEVERITY_COLORS[chip.severity ?? 'info'];
  return (
    <button
      onClick={() => onClick?.(chip.artifact_id)}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-xs transition-colors cursor-pointer ${color}`}
      title={chip.artifact_id}
    >
      <span className="opacity-70">[{chip.label}]</span>
      {chip.value !== undefined && <span>{chip.value}</span>}
    </button>
  );
};

export default EvidenceChip;
