'use client';
import { useState, type FC } from 'react';
import type { SteeringIntent, Session } from '@/lib/types';

interface Props {
  session: Session;
  intents: SteeringIntent[];
  onSteer: (goal: string, constraints: string[]) => void;
}

const STATUS_COLORS = {
  pending:  'bg-amber-900 text-amber-300 border-amber-700',
  applied:  'bg-emerald-900 text-emerald-300 border-emerald-700',
  rejected: 'bg-red-900 text-red-300 border-red-700',
};

const IntentPanel: FC<Props> = ({ session, intents, onSteer }) => {
  const [goal, setGoal] = useState('');
  const [constraint, setConstraint] = useState('');
  const [constraints, setConstraints] = useState<string[]>([]);

  const canSteer = session.state === 'WAITING_ON_HUMAN' || session.state === 'IDLE';

  const handleAddConstraint = () => {
    const trimmed = constraint.trim();
    if (trimmed && !constraints.includes(trimmed)) {
      setConstraints((prev) => [...prev, trimmed]);
      setConstraint('');
    }
  };

  const handleRemoveConstraint = (c: string) => {
    setConstraints((prev) => prev.filter((x) => x !== c));
  };

  const handleSubmit = () => {
    const trimmedGoal = goal.trim();
    if (!trimmedGoal) return;
    onSteer(trimmedGoal, constraints);
    setGoal('');
    setConstraints([]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Current session goal */}
      <div className="px-3 py-2 border-b border-zinc-800 shrink-0">
        <p className="text-zinc-500 text-xs font-mono mb-1">current goal</p>
        <p className="text-zinc-300 text-sm leading-snug">
          {session.current_task ?? <span className="text-zinc-600 italic">No active task</span>}
        </p>
        <div className="mt-1 flex gap-2">
          <span className="text-zinc-500 text-xs font-mono">state:</span>
          <span className="text-zinc-300 text-xs font-mono">{session.state}</span>
          <span className="text-zinc-500 text-xs font-mono ml-2">autonomy:</span>
          <span className="text-zinc-300 text-xs font-mono">{session.autonomy_level}</span>
        </div>
      </div>

      {/* Steer input — only active in WAITING_ON_HUMAN or IDLE */}
      <div className="px-3 py-2 border-b border-zinc-800 shrink-0">
        <p className="text-zinc-500 text-xs font-mono mb-1.5">
          inject intent
          {!canSteer && (
            <span className="ml-2 text-zinc-600 italic">(only in IDLE / WAITING_ON_HUMAN)</span>
          )}
        </p>
        <textarea
          id="steering-goal"
          aria-label="Steering goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={!canSteer}
          placeholder="New goal or correction for the agent…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-zinc-500 font-mono min-h-[52px] disabled:opacity-40"
          rows={2}
        />

        {/* Constraints */}
        <div className="mt-1.5">
          <div className="flex gap-1">
            <input
              type="text"
              aria-label="Add constraint"
              value={constraint}
              onChange={(e) => setConstraint(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddConstraint(); } }}
              disabled={!canSteer}
              placeholder="Add constraint (Enter)"
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono disabled:opacity-40"
            />
            <button
              onClick={handleAddConstraint}
              disabled={!canSteer || !constraint.trim()}
              className="px-2 py-1 text-xs font-mono bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 rounded disabled:opacity-40 transition-colors"
            >
              +
            </button>
          </div>
          {constraints.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {constraints.map((c) => (
                <span key={c} className="flex items-center gap-1 bg-zinc-800 text-zinc-300 text-xs font-mono px-1.5 py-0.5 rounded border border-zinc-700">
                  {c}
                  <button
                    onClick={() => handleRemoveConstraint(c)}
                    aria-label={`Remove constraint: ${c}`}
                    className="text-zinc-500 hover:text-zinc-200 ml-0.5 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSteer || !goal.trim()}
          className="mt-2 w-full px-3 py-1.5 text-xs font-mono bg-blue-800 text-blue-100 hover:bg-blue-700 border border-blue-700 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ↺ Steer Agent
        </button>
      </div>

      {/* Intent history */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="text-zinc-500 text-xs font-mono mb-2">steering history</p>
        {intents.length === 0 ? (
          <p className="text-zinc-700 text-xs font-mono italic">No steering intents submitted</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...intents].reverse().map((intent) => (
              <div key={intent.id} className="border border-zinc-800 rounded p-2 bg-zinc-950">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded border ${STATUS_COLORS[intent.status]}`}>
                    {intent.status}
                  </span>
                  <span className="text-zinc-600 text-xs font-mono">
                    {new Date(intent.submitted_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="text-zinc-300 text-xs leading-snug">{intent.goal}</p>
                {intent.constraints.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {intent.constraints.map((c, i) => (
                      <span key={i} className="text-zinc-500 text-xs font-mono bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IntentPanel;
