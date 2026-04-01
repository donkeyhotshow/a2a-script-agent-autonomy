'use client';
import type { FC } from 'react';
import type { LogLine, StorageItem, Session, ArtifactBase } from '@/lib/types';
import TerminalPanel from './TerminalPanel';
import StorageTab from './StorageTab';
import RawStateTab from './RawStateTab';

type BottomTab = 'terminal' | 'storage' | 'raw';

interface Props {
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  logs: LogLine[];
  storageItems: StorageItem[];
  session: Session;
  artifacts: ArtifactBase[];
}

const TABS: { id: BottomTab; label: string }[] = [
  { id: 'terminal', label: 'Terminal' },
  { id: 'storage', label: 'Storage' },
  { id: 'raw', label: 'Raw State' },
];

const BottomPanel: FC<Props> = ({ activeTab, onTabChange, logs, storageItems, session, artifacts }) => {
  return (
    <div className="flex flex-col border-t border-zinc-800 bg-zinc-950" style={{ height: '220px' }}>
      <div className="flex items-center gap-0 border-b border-zinc-800 px-3 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 text-xs font-mono border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'terminal' && <TerminalPanel logs={logs} />}
        {activeTab === 'storage' && <StorageTab items={storageItems} />}
        {activeTab === 'raw' && <RawStateTab session={session} artifacts={artifacts} />}
      </div>
    </div>
  );
};

export default BottomPanel;
