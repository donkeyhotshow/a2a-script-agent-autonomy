"use client";

import React, { useState } from "react";
import { useQueryState } from "nuqs";
import ProjectSidebar from "./project-sidebar";
import SessionArea from "./session-area";
import RightInspector from "./right-inspector";
import BottomPanel from "./bottom-panel";

export default function AgentConsole() {
  const [selectedProject, setSelectedProject] = useQueryState("project", {
    defaultValue: "proj_repo_ai_001",
  });
  const [selectedSession, setSelectedSession] = useQueryState("session", {
    defaultValue: "sess_001_running",
  });
  const [rightTab, setRightTab] = useQueryState("rightTab", {
    defaultValue: "taskflow",
  });
  const [bottomTab, setBottomTab] = useQueryState("bottomTab", {
    defaultValue: "terminal",
  });
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(true);
  const [rightRailCollapsed, setRightRailCollapsed] = useState(true);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {!leftRailCollapsed && (
          <div className="w-56 border-r border-border bg-background flex flex-col">
            <ProjectSidebar
              selectedProject={selectedProject}
              selectedSession={selectedSession}
              onProjectChange={setSelectedProject}
              onSessionChange={setSelectedSession}
              onCollapse={() => setLeftRailCollapsed(true)}
            />
          </div>
        )}

        {/* Main Session Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <SessionArea
            selectedProject={selectedProject}
            selectedSession={selectedSession}
            leftCollapsed={leftRailCollapsed}
            rightCollapsed={rightRailCollapsed}
            bottomClosed={!bottomPanelOpen}
            onLeftToggle={() => setLeftRailCollapsed(!leftRailCollapsed)}
            onRightToggle={() => setRightRailCollapsed(!rightRailCollapsed)}
            onBottomToggle={() => setBottomPanelOpen(!bottomPanelOpen)}
          />
        </div>

        {/* Right Inspector */}
        {!rightRailCollapsed && (
          <div className="w-72 border-l border-border bg-background flex flex-col">
            <RightInspector
              selectedSession={selectedSession}
              activeTab={rightTab}
              onTabChange={setRightTab}
              onCollapse={() => setRightRailCollapsed(true)}
            />
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      {bottomPanelOpen && (
        <div className="h-48 border-t border-border bg-background flex flex-col">
          <BottomPanel
            selectedSession={selectedSession}
            activeTab={bottomTab}
            onTabChange={setBottomTab}
            onClose={() => setBottomPanelOpen(false)}
          />
        </div>
      )}


    </div>
  );
}
