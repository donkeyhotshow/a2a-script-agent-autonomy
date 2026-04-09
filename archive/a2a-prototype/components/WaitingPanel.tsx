import type { FC } from 'react';
import type { ArtifactBase } from '@/lib/types';
import WaitingCard from './WaitingCard';

interface Props {
  artifacts: ArtifactBase[];
}

const WaitingPanel: FC<Props> = ({ artifacts }) => {
  const waitingArtifacts = artifacts.filter((a) => a.artifact_type === 'WAITING_STATE');

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-zinc-800">
        <h3 className="text-zinc-300 text-xs font-mono font-semibold">Waiting</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {waitingArtifacts.length === 0 ? (
          <p className="text-zinc-600 text-xs font-mono text-center py-8">No waiting states</p>
        ) : (
          waitingArtifacts.map((a) => (
            <WaitingCard key={a.artifact_id} artifact={a} />
          ))
        )}
      </div>
    </div>
  );
};

export default WaitingPanel;
