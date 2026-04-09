"use client";

import React, { useState } from "react";
import {
  mockProjects,
  getSessionsGroupedByStatus,
  formatTime,
  type Session,
} from "@/lib/mock-data";

interface ProjectSidebarProps {
  selectedProject: string;
  selectedSession: string;
  onProjectChange: (projectId: string) => void;
  onSessionChange: (sessionId: string) => void;
  onCollapse: () => void;
}

export default function ProjectSidebar({
  selectedProject,
  selectedSession,
  onProjectChange,
  onSessionChange,
  onCollapse,
}: ProjectSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const grouped = getSessionsGroupedByStatus(selectedProject);
  const allStatuses = ["running", "waiting", "validating", "completed", "failed"] as const;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "waiting":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "validating":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
      case "completed":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
      case "failed":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const renderSessions = (sessions: Session[]) => {
    const filtered = sessions.filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.map((session) => (
      <button
        key={session.id}
        onClick={() => onSessionChange(session.id)}
        className={`w-full text-left px-1.5 py-1 text-xs border-l border-transparent transition-colors ${
          selectedSession === session.id
            ? "border-l-foreground bg-foreground/5"
            : "hover:bg-foreground/3"
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="font-medium truncate flex-1 text-xs">{session.name}</div>
          <span className={`px-1 py-0.5 rounded text-xs whitespace-nowrap font-medium ${getStatusColor(session.status)}`}>
            {session.status.slice(0, 3)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {session.currentPhase} • {formatTime(session.updatedAt)}
        </div>
      </button>
    ));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-semibold text-muted-foreground">Projects</h2>
        <button
          onClick={onCollapse}
          className="p-0 hover:opacity-60 transition-opacity text-xs"
          title="Collapse sidebar"
        >
          ✕
        </button>
      </div>

      {/* Project Selector */}
      <div className="px-2 py-1 border-b border-border">
        <select
          value={selectedProject}
          onChange={(e) => {
            onProjectChange(e.target.value);
          }}
          className="w-full px-1.5 py-1 text-xs bg-background border border-border rounded hover:border-foreground/20 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"
        >
          {mockProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Search */}
      <div className="px-2 py-1 border-b border-border">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-1.5 py-1 text-xs bg-background border border-border rounded hover:border-foreground/20 focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-colors"
        />
      </div>

      {/* New Session Button */}
      <div className="px-2 py-1 border-b border-border">
        <button className="w-full px-2 py-1 text-xs font-medium bg-foreground text-background rounded hover:opacity-80 transition-opacity">
          +
        </button>
      </div>

      {/* Sessions grouped by status */}
      <div className="flex-1 overflow-y-auto">
        {allStatuses.map((status) => {
          const sessions = grouped[status] || [];
          if (sessions.length === 0) return null;

          return (
            <div key={status} className="pb-0.5">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {status.slice(0, 3)}
              </div>
              <div className="space-y-0.5 px-0.5">{renderSessions(sessions)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
