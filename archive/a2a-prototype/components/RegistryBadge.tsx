import type { FC } from 'react';
import { useRegistryHealth } from '@/hooks/useRegistry';

/**
 * RegistryBadge — ADR-0058/0059
 *
 * Displays a compact registry health indicator intended for embedding inside
 * PhaseStrip (or any header-level bar).  Shows online / total agent count and
 * a draining indicator when agents are being gracefully drained.
 *
 * Usage:
 *   <RegistryBadge />
 */

const RegistryBadge: FC = () => {
  const { health, loading, error } = useRegistryHealth();

  if (loading && !health) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-zinc-800 border border-zinc-700 text-zinc-500">
        👥 Registry: …
      </span>
    );
  }

  if (error && (!health || health.total === 0)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-red-950 border border-red-800 text-red-400">
        👥 Registry: err
      </span>
    );
  }

  const { online, draining, total } = health!;
  const allOnline = draining === 0 && online === total && total > 0;
  const hasDraining = draining > 0;
  const noAgents = total === 0;

  const dotColor = noAgents
    ? 'text-zinc-500'
    : allOnline
    ? 'text-green-400'
    : hasDraining
    ? 'text-amber-400'
    : 'text-red-400';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono border transition-colors ${
        noAgents
          ? 'bg-zinc-900 border-zinc-700 text-zinc-500'
          : allOnline
          ? 'bg-green-950 border-green-800 text-green-300'
          : hasDraining
          ? 'bg-amber-950 border-amber-700 text-amber-300'
          : 'bg-red-950 border-red-800 text-red-300'
      }`}
      title={`Registry: ${online} online, ${draining} draining, ${total} total`}
    >
      <span className={dotColor}>●</span>
      <span>
        {noAgents ? 'Registry: empty' : `Registry: ${online}/${total} online`}
      </span>
      {hasDraining && (
        <span className="ml-0.5 px-1 rounded bg-amber-900 text-amber-300 text-[10px]">
          {draining} draining
        </span>
      )}
    </span>
  );
};

export default RegistryBadge;
