"use client";

import React, { useState, useMemo } from "react";
import { type Message, type ActionStep, type ActionStatus } from "@/lib/mock-data";

//  Tiny markdown renderer 
function renderMd(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { codeLines.push(lines[i]); i++; }
      nodes.push(<pre key={i}><code>{codeLines.join("\n")}</code></pre>);
    }
    // heading
    else if (/^#{1,3} /.test(line)) {
      const level = line.match(/^(#+)/)?.[1].length ?? 1;
      const txt = line.replace(/^#+\s/, "");
      const Tag = `h${level}` as "h1"|"h2"|"h3";
      nodes.push(<Tag key={i}>{inlineMd(txt)}</Tag>);
    }
    // hr
    else if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={i} />);
    }
    // bullet
    else if (/^[\-\*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*] /.test(lines[i])) {
        items.push(lines[i].replace(/^[\-\*] /, ""));
        i++;
      }
      nodes.push(<ul key={i}>{items.map((it, j) => <li key={j}>{inlineMd(it)}</li>)}</ul>);
      continue;
    }
    // numbered list
    else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      nodes.push(<ol key={i}>{items.map((it, j) => <li key={j}>{inlineMd(it)}</li>)}</ol>);
      continue;
    }
    // empty line
    else if (line.trim() === "") {
      // skip
    }
    // paragraph
    else {
      nodes.push(<p key={i}>{inlineMd(line)}</p>);
    }
    i++;
  }
  return nodes;
}

function inlineMd(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2,-2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*")) return <em key={i}>{p.slice(1,-1)}</em>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i}>{p.slice(1,-1)}</code>;
    return p;
  });
}

//  Icons 
const ICONS = {
  file:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  search: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  run:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  edit:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  check:  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  tool:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
};

const ICON_COLOR: Record<ActionStep["icon"], string> = {
  file: "#7dd3fc", search: "#a78bfa", run: "#34d399", edit: "#fb923c", check: "#22c55e", tool: "#f59e0b",
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function StatusBadge({ status }: { status: ActionStatus }) {
  if (status === "done") return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  if (status === "error") return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" className="spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  );
}

//  Sub-item classifier 
function SubItem({ text }: { text: string }) {
  const isFile = /\.(ts|tsx|js|jsx|py|json|md|css|html)/.test(text);
  const isAdded = text.startsWith("+");
  const isError = /error|fail/i.test(text) && !text.includes("0 errors");
  const isOk = /passed||0 errors|green/i.test(text);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
      <span style={{ color: "#3a3a3a", fontSize: 10 }}></span>
      <span style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 11,
        color: isAdded ? "#4ade80" : isError ? "#f87171" : isOk ? "#86efac" : isFile ? "#7dd3fc" : "#707070",
      }}>
        {text}
      </span>
    </div>
  );
}

//  Single action row 
function ActionRow({ action, depth = 0 }: { action: ActionStep; depth?: number }) {
  const [open, setOpen] = useState(false);
  const hasItems = (action.items?.length ?? 0) > 0;

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <button
        onClick={() => hasItems && setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%",
          padding: "3px 0", cursor: hasItems ? "pointer" : "default",
          background: "none", border: "none", textAlign: "left",
        }}
        className="group"
      >
        <span style={{ color: "#3a3a3a", width: 10, flexShrink: 0, opacity: hasItems ? 1 : 0 }}>
          <Chevron open={open} />
        </span>
        <span style={{ color: ICON_COLOR[action.icon], flexShrink: 0 }}>
          {ICONS[action.icon]}
        </span>
        <span style={{ fontSize: 11, color: "#888", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          className="group-hover:!text-[#bbb] transition-colors">
          {action.label}
        </span>
        {action.duration && (
          <span style={{ fontSize: 10, color: "#3a3a3a", flexShrink: 0, marginLeft: 4 }}>{action.duration}</span>
        )}
        <span style={{ flexShrink: 0, marginLeft: 2 }}><StatusBadge status={action.status} /></span>
      </button>

      {open && hasItems && (
        <div className="slide-down" style={{ marginLeft: 16, paddingLeft: 10, borderLeft: "1px solid #242424" }}>
          {action.items!.map((item, i) => <SubItem key={i} text={item} />)}
        </div>
      )}
    </div>
  );
}

//  Action chain 
function ActionChain({ actions, duration }: { actions: ActionStep[]; duration?: string }) {
  const [open, setOpen] = useState(false);
  const done = actions.filter(a => a.status === "done").length;
  const running = actions.find(a => a.status === "running");
  const hasError = actions.some(a => a.status === "error");
  const total = actions.length;

  const summaryColor = hasError ? "#ef4444" : running ? "#3b82f6" : "#22c55e";
  const summaryIcon = hasError
    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    : running
    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" className="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
    : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

  const label = running
    ? `${running.label.slice(0, 36)}`
    : hasError ? `${done}/${total}  error`
    : `${total} step${total !== 1 ? "s" : ""} completed`;

  return (
    <div style={{ marginBottom: 8 }}>
      {/* Summary row */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer", padding: "2px 0",
        }}
        className="group"
      >
        <span style={{ color: "#3a3a3a" }} className="group-hover:!text-[#555] transition-colors">
          <Chevron open={open} />
        </span>
        {summaryIcon}
        <span style={{ fontSize: 11, color: summaryColor, opacity: 0.85 }}
          className="group-hover:opacity-100 transition-opacity">
          {label}
        </span>
        {duration && !running && (
          <span style={{ fontSize: 10, color: "#3a3a3a", marginLeft: 2 }}>{duration}</span>
        )}
      </button>

      {/* Progress bar when running */}
      {running && (
        <div style={{ height: 1, background: "#1c1c1c", borderRadius: 1, overflow: "hidden", marginTop: 4, marginLeft: 16 }}>
          <div className="progress-bar" style={{ height: "100%", width: "30%", background: "linear-gradient(90deg, transparent, #3b82f6, transparent)", borderRadius: 1 }} />
        </div>
      )}

      {/* Expanded steps */}
      {open && (
        <div className="slide-down" style={{ marginTop: 4, marginLeft: 4, paddingLeft: 10, borderLeft: "1px solid #1e1e1e" }}>
          {actions.map(a => <ActionRow key={a.id} action={a} />)}
        </div>
      )}
    </div>
  );
}

//  Phase badge 
const PHASE_STYLE: Record<string, { bg: string; color: string }> = {
  scan:         { bg: "#1a2535", color: "#7dd3fc" },
  generate:     { bg: "#1e1a35", color: "#a78bfa" },
  execute:      { bg: "#1a2e1a", color: "#4ade80" },
  validate:     { bg: "#2a1f10", color: "#fb923c" },
  deliver:      { bg: "#1a2a1a", color: "#22c55e" },
  "self-correct": { bg: "#2a1a1a", color: "#f87171" },
  enrich:       { bg: "#1a2535", color: "#38bdf8" },
  waiting:      { bg: "#252010", color: "#eab308" },
};

//  Main MessageItem 
export default function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === "operator";
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const mdNodes = useMemo(() => renderMd(message.content), [message.content]);
  const phaseStyle = message.phase ? PHASE_STYLE[message.phase] : null;

  if (isUser) {
    return (
      <div className="fade-up" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <div className="group" style={{ maxWidth: "76%" }}>
          <div style={{
            padding: "10px 14px",
            borderRadius: "14px 14px 3px 14px",
            background: "#1a2540",
            border: "1px solid #1e3060",
            color: "#dde8f8",
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {message.content}
          </div>
          <div style={{ fontSize: 10, color: "#3a3a3a", marginTop: 3, textAlign: "right", paddingRight: 2 }}
            className="opacity-0 group-hover:opacity-100 transition-opacity">
            {time}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 24 }}>
      {/* Avatar */}
      <div style={{
        width: 26, height: 26, borderRadius: "50%",
        background: "linear-gradient(135deg, #1a2a4a 0%, #0f1a30 100%)",
        border: "1px solid #1e3060",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1,
      }} className="pulse-glow">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#4a7ab5" }}>Agent</span>
          {phaseStyle && (
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
              padding: "1px 5px", borderRadius: 3,
              background: phaseStyle.bg, color: phaseStyle.color,
              textTransform: "uppercase",
            }}>
              {message.phase}
            </span>
          )}
          {message.duration && (
            <span style={{ fontSize: 10, color: "#3a3a3a", marginLeft: "auto" }}>{message.duration}</span>
          )}
        </div>

        {/* Action chain */}
        {message.actions && message.actions.length > 0 && (
          <ActionChain actions={message.actions} duration={message.duration} />
        )}

        {/* Message text with markdown */}
        <div className="agent-md" style={{ fontSize: 13, lineHeight: 1.65 }}>
          {mdNodes}
        </div>

        {/* Timestamp */}
        <div style={{ fontSize: 10, color: "#3a3a3a", marginTop: 6 }}
          className="opacity-0 hover:opacity-100 transition-opacity">
          {time}
        </div>
      </div>
    </div>
  );
}
