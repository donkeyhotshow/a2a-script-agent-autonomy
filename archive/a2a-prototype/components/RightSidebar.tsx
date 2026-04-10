'use client';
import type { FC } from 'react';
import type { TaskFlowStep, ArtifactBase } from '@/lib/types';
import TaskFlowPanel from './TaskFlowPanel';
import EvidencePanel from './EvidencePanel';
import WaitingPanel from './WaitingPanel';

type RightTab = 'taskflow' | 'evidence' | 'waiting';

interface Props {
  activeTab: RightTab;
  onTabChange: (tab: RightTab) => void;
  steps: TaskFlowStep[];
  artifacts: ArtifactBase[];
}

const TABS: { id: RightTab; label: string }[] = [
  { id: 'taskflow', label: 'Task Flow' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'waiting', label: 'Waiting' },
];

const RightSidebar: FC<Props> = ({ activeTab, onTabChange, steps, artifacts }) => {
  const waitingCount = artifacts.filter((a) => a.artifact_type === 'WAITING_STATE').length;

  return (
    <div className="flex flex-col border-l border-zinc-800 bg-zinc-950 w-72 shrink-0">
      <div className="flex items-center gap-0 border-b border-zinc-800 px-3 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-2 text-xs font-mono border-b-2 transition-colors relative ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
            {tab.id === 'waiting' && waitingCount > 0 && (
              <span className="ml-1 px-1 py-0.5 rounded bg-amber-800 text-amber-200 text-xs">
                {waitingCount}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'taskflow' && <TaskFlowPanel steps={steps} />}
        {activeTab === 'evidence' && <EvidencePanel artifacts={artifacts} />}
        {activeTab === 'waiting' && <WaitingPanel artifacts={artifacts} />}
      </div>
    </div>
  );
};

export default RightSidebar;
