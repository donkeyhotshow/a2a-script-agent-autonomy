'use client';
import { useState, type FC, type KeyboardEvent } from 'react';

interface Props {
  onSend?: (message: string) => void;
  onPreflightToggle?: (on: boolean) => void;
  preflightMode?: boolean;
  disabled?: boolean;
}

const Composer: FC<Props> = ({ onSend, onPreflightToggle, preflightMode = false, disabled = false }) => {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      onSend?.(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-center gap-2 mb-2">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={preflightMode}
            onChange={(e) => onPreflightToggle?.(e.target.checked)}
            className="rounded border-zinc-600"
          />
          <span className="text-xs font-mono text-zinc-500">Preflight mode</span>
        </label>
      </div>
      <div className="flex gap-2">
        <textarea
          id="composer-input"
          aria-label="Send instruction to agent"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Send instruction to agent… (Enter to send, Shift+Enter for newline)"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-zinc-500 font-mono min-h-[60px] max-h-32"
          rows={2}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="px-4 py-2 rounded bg-blue-700 text-blue-100 text-sm font-mono border border-blue-600 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Composer;
