'use client';
import { useState, type FC } from 'react';
import type { StorageItem } from '@/lib/types';

const STATUS_COLORS = {
  active: 'text-emerald-400',
  archived: 'text-zinc-500',
  consumed: 'text-zinc-600',
};

const TYPE_TABS = ['artifact', 'step', 'checkpoint'] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

interface Props {
  items: StorageItem[];
}

const StorageTab: FC<Props> = ({ items }) => {
  const [activeType, setActiveType] = useState<typeof TYPE_TABS[number]>('artifact');
  const filtered = items.filter((i) => i.type === activeType);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-0 border-b border-zinc-800 px-3 pt-1">
        {TYPE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`px-3 py-1.5 text-xs font-mono border-b-2 transition-colors capitalize ${
              activeType === t
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}s ({items.filter((i) => i.type === t).length})
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800">
            <tr>
              <th className="text-left px-3 py-2 text-zinc-600 font-normal">Name</th>
              <th className="text-left px-3 py-2 text-zinc-600 font-normal">Created</th>
              <th className="text-right px-3 py-2 text-zinc-600 font-normal">Size</th>
              <th className="text-left px-3 py-2 text-zinc-600 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
              <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                <td className="px-3 py-1.5 text-zinc-300 max-w-xs truncate" title={item.name}>
                  {item.name}
                </td>
                <td className="px-3 py-1.5 text-zinc-600">
                  {new Date(item.created_at).toLocaleTimeString()}
                </td>
                <td className="px-3 py-1.5 text-zinc-500 text-right">
                  {formatBytes(item.size_bytes)}
                </td>
                <td className={`px-3 py-1.5 ${STATUS_COLORS[item.status]}`}>
                  {item.status}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-zinc-700">No {activeType}s</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StorageTab;
