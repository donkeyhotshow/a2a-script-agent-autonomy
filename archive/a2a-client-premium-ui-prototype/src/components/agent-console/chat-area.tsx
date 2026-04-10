"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  fetchSession, createSession, sendNext, pollAsync,
  type ApiSession,
} from "@/lib/api";
import { getMessages, type Message, type ActionStep } from "@/lib/mock-data";
import MessageItem from "./message-item";
import Composer, { type ProviderConfig } from "./composer";

//  Types 

interface UiSession {
  id: string;
  name: string;
  status: string;
  currentPhase: string;
}

interface ChatAreaProps {
  session: UiSession | undefined;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  apiOk: boolean | null;
  onSessionUpdate?: () => void;
}

//  Helpers 

/** Parse server execute into UI messages */
function executeToMessages(sess: ApiSession, existingMsgs: Message[]): Message[] {
  const msgs = [...existingMsgs];
  const exec = sess.execute;
  if (!exec) return msgs;

  // Server text reply
  if (exec.message && !exec.form) {
    const already = msgs.find((m) => m.id === `srv_${sess.currentStep}`);
    if (!already) {
      msgs.push({
        id: `srv_${sess.currentStep}_${Date.now()}`,
        sessionId: sess.id,
        role: "agent",
        content: exec.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Form choices  agent message listing options
  if (exec.form?.choices?.length) {
    const already = msgs.find((m) => m.id === `choices_${sess.currentStep}`);
    if (!already) {
      const list = exec.form.choices.map((c) => `- **${c.label}**  ${c.description ?? c.id}`).join("\n");
      msgs.push({
        id: `choices_${sess.currentStep}_${Date.now()}`,
        sessionId: sess.id,
        role: "agent",
        content: `Choose an option:\n${list}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Form input prompt
  if (exec.form?.input?.length && !exec.form?.choices?.length) {
    const already = msgs.find((m) => m.id === `form_${sess.currentStep}`);
    if (!already && exec.message) {
      // message already added above
    } else if (!already) {
      msgs.push({
        id: `form_${sess.currentStep}_${Date.now()}`,
        sessionId: sess.id,
        role: "agent",
        content: exec.message ?? "What would you like me to do?",
        timestamp: new Date().toISOString(),
      });
    }
  }

  return msgs;
}

//  Simulation (demo) 

type SimStep =
  | { type: "user"; delay: number; content: string }
  | { type: "thinking"; delay: number }
  | { type: "agent"; delay: number; content: string; actions?: ActionStep[]; duration?: string };

function buildSimulation(model: string): SimStep[] {
  return [
    { type: "user", delay: 600,
      content: "Перепиши три файла: src/auth/login.ts, src/auth/session.ts и src/middleware/auth.ts  добавь TypeScript strict типы, замени any на конкретные типы и добавь JSDoc комментарии к каждой функции." },
    { type: "thinking", delay: 800 },
    { type: "agent", delay: 2200, duration: "3.1s",
      content: "Понял задачу. Читаю все три файла, чтобы понять текущую структуру и типы.",
      actions: [
        { id: "s1_a1", icon: "run",    label: "Setting up environment",      status: "done", duration: "0.4s", items: ["Load tsconfig.json", "Detect strict mode: false", "Index project symbols"] },
        { id: "s1_a2", icon: "file",   label: "Read 3 files",                status: "done", duration: "1.8s", items: ["src/auth/login.ts (142 lines)", "src/auth/session.ts (89 lines)", "src/middleware/auth.ts (201 lines)"] },
        { id: "s1_a3", icon: "search", label: "Search  any usage patterns", status: "done", duration: "0.9s", items: ["Found 14 `any` in login.ts", "Found 6 `any` in session.ts", "Found 22 `any` in auth.ts"] },
      ] },
    { type: "thinking", delay: 400 },
    { type: "agent", delay: 3400, duration: "5.2s",
      content: "Переписываю `src/auth/login.ts`  заменяю `any` на строгие типы, добавляю интерфейсы `LoginRequest` и `LoginResult`, JSDoc на все функции.",
      actions: [
        { id: "s2_a1", icon: "file",  label: "Read src/auth/login.ts",       status: "done", duration: "0.3s", items: ["src/auth/login.ts:1-142"] },
        { id: "s2_a2", icon: "tool",  label: "Analyse types  login flow",   status: "done", duration: "1.1s", items: ["validateCredentials(user: any)  LoginRequest", "createToken(payload: any)  TokenPayload"] },
        { id: "s2_a3", icon: "edit",  label: "Edit src/auth/login.ts",       status: "done", duration: "2.4s", items: ["+interface LoginRequest { email: string; password: string }", "Replaced 14 any  strict types", "Added JSDoc to 6 functions"] },
        { id: "s2_a4", icon: "check", label: "Type-check src/auth/login.ts", status: "done", duration: "0.8s", items: ["tsc --noEmit  0 errors"] },
      ] },
    { type: "thinking", delay: 300 },
    { type: "agent", delay: 3100, duration: "4.7s",
      content: "Переписываю `src/auth/session.ts`  добавляю интерфейс `Session`, типизирую store.",
      actions: [
        { id: "s3_a1", icon: "file",  label: "Read src/auth/session.ts",       status: "done", duration: "0.2s", items: ["src/auth/session.ts:1-89"] },
        { id: "s3_a2", icon: "edit",  label: "Edit src/auth/session.ts",       status: "done", duration: "2.1s", items: ["+interface Session { id: string; userId: string; createdAt: Date }", "Replaced 6 any  strict types"] },
        { id: "s3_a3", icon: "check", label: "Type-check src/auth/session.ts", status: "done", duration: "0.7s", items: ["tsc --noEmit  0 errors"] },
      ] },
    { type: "thinking", delay: 300 },
    { type: "agent", delay: 4200, duration: "7.8s",
      content: "Переписываю `src/middleware/auth.ts`  самый большой файл. Типизирую middleware chain, добавляю `AuthenticatedRequest`.",
      actions: [
        { id: "s4_a1", icon: "file",  label: "Read src/middleware/auth.ts",       status: "done", duration: "0.3s", items: ["src/middleware/auth.ts:1-201"] },
        { id: "s4_a2", icon: "search", label: "Search  Express types usage",     status: "done", duration: "0.6s", items: ["@types/express installed "] },
        { id: "s4_a3", icon: "edit",  label: "Edit src/middleware/auth.ts",       status: "done", duration: "3.8s", items: ["+interface AuthenticatedRequest extends Request { user: TokenPayload }", "Replaced 22 any  strict types", "Added JSDoc to 9 functions"] },
        { id: "s4_a4", icon: "check", label: "Type-check src/middleware/auth.ts", status: "done", duration: "0.9s", items: ["tsc --noEmit  0 errors"] },
      ] },
    { type: "thinking", delay: 300 },
    { type: "agent", delay: 2800, duration: "3.4s",
      content: "Все три файла переписаны.\n\n- **login.ts**  +3 интерфейса, 14 `any`  строгие типы, JSDoc на 6 функций\n- **session.ts**  +1 интерфейс Session, 6 `any`  строгие типы\n- **auth.ts**  +1 интерфейс AuthenticatedRequest, 22 `any`  строгие типы, JSDoc на 9 функций\n\nВсе файлы проходят `tsc --noEmit` без ошибок. Готово к ревью.",
      actions: [
        { id: "s5_a1", icon: "run", label: "Run full type-check",   status: "done", duration: "1.2s", items: ["tsc --noEmit --strict  0 errors", "42 any replaced total", "19 JSDoc comments added"] },
        { id: "s5_a2", icon: "run", label: `Verify via ${model}`,   status: "done", duration: "1.8s", items: ["Consistency check passed", "No breaking changes detected"] },
      ] },
  ];
}

//  ChatArea 

export default function ChatArea({ session, sidebarOpen, onToggleSidebar, apiOk, onSessionUpdate }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [simRunning, setSimRunning] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [runPreflight, setRunPreflight] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  // Load messages when session changes
  useEffect(() => {
    abortRef.current = true;
    setSimRunning(false);
    setIsThinking(false);
    if (!session) { setMessages([]); return; }

    // Load from mock first, then try real API
    const mockMsgs = getMessages(session.id);
    if (mockMsgs.length > 0) {
      setMessages(mockMsgs);
    } else {
      setMessages([]);
      // Try to hydrate from real session
      if (apiOk) {
        fetchSession(session.id).then((s) => {
          setMessages((prev) => executeToMessages(s, prev));
        }).catch(() => {});
      }
    }
    setActiveSessionId(session.id);
  }, [session?.id, apiOk]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  //  Real API submit 
  const handleSubmit = useCallback(async (text: string, cfg: ProviderConfig) => {
    if (!session) return;
    const model = cfg.provider === "groq" ? cfg.groqModel : cfg.ollamaModel;

    // Add user message immediately
    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sessionId: session.id,
      role: "operator",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((p) => [...p, userMsg]);
    setIsThinking(true);

    try {
      let targetId = session.id;

      if (apiOk) {
        // If this is a mock session, create a real one first
        const isMock = session.id.startsWith("sess_00");
        if (isMock) {
          const newSess = await createSession({
            title: session.name,
            mode: "agent",
            llmModel: model,
          });
          targetId = newSess.id;
          setActiveSessionId(targetId);
          onSessionUpdate?.();
        }

        // Send turn
        await sendNext(targetId, { task: text });

        // Poll until settled
        const settled = await pollAsync(targetId, { maxAttempts: 120, intervalMs: 1500 });

        // Extract agent reply
        const agentContent = settled.execute?.message
          ?? settled.messages?.filter((m) => m.role === "assistant").slice(-1)[0]?.content
          ?? "(no response)";

        setMessages((p) => [...p, {
          id: `a_${Date.now()}`,
          sessionId: targetId,
          role: "agent",
          content: agentContent,
          timestamp: new Date().toISOString(),
          actions: [
            { id: `act_llm_${Date.now()}`, icon: "run", label: `${model}`, status: "done" },
          ],
        }]);

        onSessionUpdate?.();
      } else {
        // Offline fallback
        await new Promise((r) => setTimeout(r, 1200));
        setMessages((p) => [...p, {
          id: `a_${Date.now()}`,
          sessionId: session.id,
          role: "agent",
          content: `[offline] Echo: ${text}`,
          timestamp: new Date().toISOString(),
          actions: [{ id: `act_${Date.now()}`, icon: "run", label: `${model} (offline)`, status: "done" }],
        }]);
      }
    } catch (err: any) {
      setMessages((p) => [...p, {
        id: `err_${Date.now()}`,
        sessionId: session.id,
        role: "agent",
        content: `**Error:** ${err?.message ?? String(err)}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsThinking(false);
    }
  }, [session, apiOk, onSessionUpdate]);

  //  Demo simulation 
  const runSimulation = useCallback(async (cfg: ProviderConfig) => {
    if (simRunning) return;
    const model = cfg.provider === "groq" ? cfg.groqModel : cfg.ollamaModel;
    abortRef.current = false;
    setSimRunning(true);
    setMessages([]);

    for (const step of buildSimulation(model)) {
      if (abortRef.current) break;
      await new Promise((r) => setTimeout(r, step.delay));
      if (abortRef.current) break;

      if (step.type === "user") {
        setIsThinking(false);
        setMessages((p) => [...p, { id: `sim_u_${Date.now()}`, sessionId: session?.id ?? "sim", role: "operator", content: step.content, timestamp: new Date().toISOString() }]);
      } else if (step.type === "thinking") {
        setIsThinking(true);
      } else if (step.type === "agent") {
        setIsThinking(false);
        setMessages((p) => [...p, { id: `sim_a_${Date.now()}`, sessionId: session?.id ?? "sim", role: "agent", content: step.content, timestamp: new Date().toISOString(), actions: step.actions, duration: step.duration }]);
      }
    }
    setIsThinking(false);
    setSimRunning(false);
  }, [simRunning, session?.id]);

  if (!session) {
    return <div className="flex items-center justify-center h-full" style={{ color: "#444", fontSize: 13 }}>Select a session</div>;
  }

  const isEmpty = messages.length === 0 && !isThinking;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: "1px solid #1e1e1e", background: "#0a0a0a", flexShrink: 0 }}>
        {!sidebarOpen && (
          <button onClick={onToggleSidebar} style={{ color: "#444", background: "none", border: "none", cursor: "pointer", fontSize: 14, marginRight: 4 }}></button>
        )}
        <StatusDot status={simRunning ? "running" : session.status} />
        <span style={{ fontSize: 13, fontWeight: 500, color: "#e2e2e2", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{session.name}</span>
        {simRunning && <span style={{ fontSize: 10, color: "#555", fontFamily: "monospace" }}>simulation</span>}
        {/* API indicator */}
        <span
          title={apiOk === null ? "connecting" : apiOk ? "Live  Client API :5173" : "Offline  mock mode"}
          style={{ fontSize: 10, color: apiOk ? "#22c55e" : apiOk === null ? "#eab308" : "#ef4444", fontFamily: "monospace", flexShrink: 0 }}
        >
          {apiOk === null ? "" : apiOk ? "live" : "offline"}
        </span>
        <span style={{ fontSize: 10, color: "#3a3a3a", fontFamily: "monospace", flexShrink: 0 }}>{session.currentPhase}</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {isEmpty && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
            <AgentIcon />
            <p style={{ fontSize: 13, color: "#555" }}>How can I help you?</p>
            <DemoButton onClick={runSimulation} />
          </div>
        )}
        {messages.map((msg) => <MessageItem key={msg.id} message={msg} />)}
        {isThinking && <ThinkingIndicator />}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div style={{ flexShrink: 0, padding: "8px 16px 16px" }}>
        <Composer
          onPreflightToggle={setRunPreflight}
          preflightEnabled={runPreflight}
          onSubmit={handleSubmit}
          disabled={isThinking || simRunning}
          onRunSimulation={runSimulation}
        />
      </div>
    </div>
  );
}

//  Small components 

function StatusDot({ status }: { status: string }) {
  const c: Record<string, string> = { running: "#22c55e", waiting: "#eab308", validating: "#3b82f6", completed: "#444", failed: "#ef4444", stopped: "#444", active: "#22c55e", created: "#eab308" };
  return <span style={{ width: 6, height: 6, borderRadius: "50%", background: c[status] ?? "#444", flexShrink: 0 }} />;
}

function AgentIcon() {
  return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#141414", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
    </div>
  );
}

function DemoButton({ onClick }: { onClick: (cfg: ProviderConfig) => void }) {
  const cfg: ProviderConfig = { provider: "groq", groqModel: "llama-3.1-8b-instant", ollamaModel: "qwen3:8b", ollamaUrl: "http://localhost:11435" };
  return (
    <button onClick={() => onClick(cfg)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid #2a2a2a", background: "none", color: "#555", fontSize: 11, cursor: "pointer" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Run demo: rewrite 3 files
    </button>
  );
}

function ThinkingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#141414", border: "1px solid #222", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
        <span className="dot-1" style={{ width: 6, height: 6, borderRadius: "50%", background: "#444", display: "inline-block" }} />
        <span className="dot-2" style={{ width: 6, height: 6, borderRadius: "50%", background: "#444", display: "inline-block" }} />
        <span className="dot-3" style={{ width: 6, height: 6, borderRadius: "50%", background: "#444", display: "inline-block" }} />
      </div>
    </div>
  );
}
