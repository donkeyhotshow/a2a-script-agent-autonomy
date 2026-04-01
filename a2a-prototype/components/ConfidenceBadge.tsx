import type { FC } from 'react';

interface Props {
  value: number;
  showLabel?: boolean;
}

const ConfidenceBadge: FC<Props> = ({ value, showLabel = true }) => {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.75 ? 'bg-emerald-900 text-emerald-300 border-emerald-700' :
    value >= 0.6  ? 'bg-amber-900 text-amber-300 border-amber-700' :
                    'bg-red-900 text-red-300 border-red-700';
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-xs ${color}`}>
      {showLabel && <span className="opacity-60">conf</span>}
      <span>{pct}%</span>
    </span>
  );
};

export default ConfidenceBadge;
