"use client";

import React, { useState, useRef, useEffect } from "react";

export type LLMProvider = "groq" | "ollama";

export interface ProviderConfig {
  provider: LLMProvider;
  groqModel: string;
  ollamaModel: string;
  ollamaUrl: string;
}

const GROQ_MODELS = ["llama-3.1-8b-instant", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"];

const DEFAULT_CONFIG: ProviderConfig = {
  provider: "groq",
  groqModel: "llama-3.1-8b-instant",
  ollamaModel: "qwen3:8b",
  ollamaUrl: "http://localhost:11435",
};

interface ComposerProps {
  onPreflightToggle: (enabled: boolean) => void;
  preflightEnabled: boolean;
  onSubmit: (message: string, providerConfig: ProviderConfig) => void;
  onRunSimulation?: (cfg: ProviderConfig) => void;
  disabled?: boolean;
}

export default function Composer({ onPreflightToggle, preflightEnabled, onSubmit, onRunSimulation, disabled }: ComposerProps) {
  const [text, setText] = useState("");
  const [config, setConfig] = useState<ProviderConfig>(DEFAULT_CONFIG);
  const [ollamaOpen, setOllamaOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  const submit = () => {
    if (!text.trim() || disabled) return;
    onSubmit(text.trim(), config);
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  const setProvider = (p: LLMProvider) => {
    setConfig((c) => ({ ...c, provider: p }));
    setOllamaOpen(p === "ollama");
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Ollama settings */}
      {config.provider === "ollama" && ollamaOpen && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111] border border-[#252525] text-xs">
          <span className="text-[#555]">Model</span>
          <input type="text" value={config.ollamaModel}
            onChange={(e) => setConfig((c) => ({ ...c, ollamaModel: e.target.value }))}
            className="w-28 px-2 py-0.5 bg-[#1a1a1a] border border-[#333] rounded text-[#ccc] focus:outline-none focus:border-[#444]"
            placeholder="qwen3:8b" />
          <span className="text-[#555]">URL</span>
          <input type="text" value={config.ollamaUrl}
            onChange={(e) => setConfig((c) => ({ ...c, ollamaUrl: e.target.value }))}
            className="flex-1 px-2 py-0.5 bg-[#1a1a1a] border border-[#333] rounded text-[#ccc] focus:outline-none focus:border-[#444]"
            placeholder="http://localhost:11435" />
          <button onClick={() => setOllamaOpen(false)} className="text-[#555] hover:text-[#888]"></button>
        </div>
      )}

      {/* Main input box */}
      <div className="flex flex-col rounded-xl border border-[#252525] bg-[#141414] focus-within:border-[#353535] transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder="Message agent"
          rows={1}
          className="w-full px-4 py-3 bg-transparent text-sm text-[#e8e8e8] placeholder-[#3a3a3a] resize-none focus:outline-none leading-relaxed"
          style={{ minHeight: "44px", maxHeight: "160px" }}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-0 gap-2">
          {/* Provider toggle */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex items-center rounded border border-[#252525] overflow-hidden text-[11px] flex-shrink-0">
              <button onClick={() => setProvider("groq")}
                className={`px-2 py-0.5 font-medium transition-colors ${config.provider === "groq" ? "bg-orange-600/90 text-white" : "text-[#555] hover:text-[#888]"}`}>
                Groq
              </button>
              <button onClick={() => setProvider("ollama")}
                className={`px-2 py-0.5 font-medium transition-colors ${config.provider === "ollama" ? "bg-blue-700/90 text-white" : "text-[#555] hover:text-[#888]"}`}>
                Ollama
              </button>
            </div>

            {config.provider === "groq" ? (
              <select value={config.groqModel}
                onChange={(e) => setConfig((c) => ({ ...c, groqModel: e.target.value }))}
                className="text-[11px] text-[#555] bg-transparent border-none focus:outline-none cursor-pointer hover:text-[#888] transition-colors max-w-[160px] truncate">
                {GROQ_MODELS.map((m) => <option key={m} value={m} className="bg-[#1a1a1a] text-[#ccc]">{m}</option>)}
              </select>
            ) : (
              <button onClick={() => setOllamaOpen((v) => !v)}
                className="text-[11px] text-[#555] hover:text-[#888] transition-colors truncate max-w-[120px]">
                {config.ollamaModel} {ollamaOpen ? "" : ""}
              </button>
            )}
          </div>

          {/* Right side: demo + send */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Demo button */}
            {onRunSimulation && (
              <button
                onClick={() => onRunSimulation(config)}
                disabled={disabled}
                title="Run demo simulation"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[#555] hover:text-[#888] border border-[#252525] hover:border-[#333] transition-colors disabled:opacity-30"
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Demo
              </button>
            )}

            {/* Send */}
            <button
              onClick={submit}
              disabled={!text.trim() || disabled}
              title="Send (Enter)"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#1e1e1e] disabled:text-[#3a3a3a] text-white"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-[#2a2a2a] text-center">Enter  send    Shift+Enter  newline</div>
    </div>
  );
}
