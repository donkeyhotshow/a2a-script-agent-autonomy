'use client';
import { useState, useEffect, useRef, type FC } from 'react';
import type { LogLine } from '@/lib/types';

const SEVERITY_COLORS = {
  debug: 'text-zinc-600',
  info: 'text-zinc-300',
  warn: 'text-amber-400',
  error: 'text-red-400',
};

interface Props {
  logs: LogLine[];
}

const TerminalPanel: FC<Props> = ({ logs }) => {
  const [follow, setFollow] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (follow) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, follow]);

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800">
        <span className="text-zinc-500 text-xs font-mono">Terminal ({logs.length} lines)</span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={follow}
            onChange={(e) => setFollow(e.target.checked)}
            className="rounded border-zinc-600"
          />
          <span className="text-zinc-500 text-xs font-mono">Follow</span>
        </label>
      </div>
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-0.5">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 hover:bg-zinc-900/50 px-1 rounded">
            <span className="text-zinc-700 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className={`shrink-0 w-14 ${SEVERITY_COLORS[log.severity]}`}>[{log.severity}]</span>
            <span className="text-zinc-500 shrink-0 w-32 truncate">{log.component}</span>
            <span className={SEVERITY_COLORS[log.severity]}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default TerminalPanel;
