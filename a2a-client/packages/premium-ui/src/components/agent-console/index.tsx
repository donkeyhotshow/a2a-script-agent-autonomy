"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useQueryState } from "nuqs";
import { fetchSessions, fetchProjects, createSession, type ApiSession, type ApiProject } from "@/lib/api";
import { mockSessions } from "@/lib/mock-data";
import SessionList from "./session-list";
import ChatArea from "./chat-area";

// Convert ApiSession  shape SessionList expects
function toUiSession(s: ApiSession) {
  return {
    id: s.id,
    name: s.title ?? s.id,
    status: (s.status === "active" ? "running" : s.status === "created" ? "waiting" : s.status) as any,
    currentPhase: (s.context?.execution?.step ?? s.context?.execution?.action ?? "idle") as any,
    projectId: "",
    autonomyMode: "supervised" as const,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export default function AgentConsole() {
  const [selectedSession, setSelectedSession] = useQueryState("session", { defaultValue: "" });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ReturnType<typeof toUiSession>[]>([]);
  const [apiOk, setApiOk] = useState<boolean | null>(null); // null=loading, true=ok, false=offline

  // Load sessions from real API, fallback to mock
  const loadSessions = useCallback(async () => {
    try {
      const raw = await fetchSessions();
      const ui = raw.map(toUiSession);
      setSessions(ui.length > 0 ? ui : mockSessions.map(toUiSession));
      setApiOk(true);
      // auto-select first if nothing selected
      if (!selectedSession && ui.length > 0) setSelectedSession(ui[0].id);
    } catch {
      setSessions(mockSessions.map(toUiSession));
      setApiOk(false);
      if (!selectedSession) setSelectedSession(mockSessions[0]?.id ?? "");
    }
  }, [selectedSession, setSelectedSession]);

  useEffect(() => { loadSessions(); }, []);

  const handleNewSession = async () => {
    if (!apiOk) return;
    try {
      const s = await createSession({ title: "New session", mode: "agent" });
      const ui = toUiSession(s);
      setSessions((prev) => [ui, ...prev]);
      setSelectedSession(s.id);
    } catch (e) {
      console.error("createSession failed", e);
    }
  };

  const session = sessions.find((s) => s.id === selectedSession) ?? sessions[0];

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#e2e2e2] overflow-hidden">
      {/* Sidebar */}
      <div className={`flex-shrink-0 border-r border-[#1e1e1e] bg-[#111] flex flex-col transition-all duration-200 ${sidebarOpen ? "w-56" : "w-0 overflow-hidden border-r-0"}`}>
        <SessionList
          sessions={sessions}
          selectedId={selectedSession ?? ""}
          onSelect={setSelectedSession}
          onClose={() => setSidebarOpen(false)}
          onNew={handleNewSession}
          apiOk={apiOk}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatArea
          session={session as any}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          apiOk={apiOk}
          onSessionUpdate={loadSessions}
        />
      </div>
    </div>
  );
}
