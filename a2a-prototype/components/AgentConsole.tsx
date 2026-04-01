'use client';
import { useState, type FC } from 'react';
import { useQueryState } from 'nuqs';
import type { ChatMessage, SteeringIntent } from '@/lib/types';
import {
  MOCK_PROJECTS,
  MOCK_SESSIONS,
  MOCK_ARTIFACTS,
  MOCK_MESSAGES,
  MOCK_TASK_FLOW,
  MOCK_LOGS,
  MOCK_STORAGE,
} from '@/lib/mock-data';

import ProjectSidebar from './ProjectSidebar';
import SessionHeader from './SessionHeader';
import PhaseStrip from './PhaseStrip';
import MessageList from './MessageList';
import Composer from './Composer';
import RightSidebar from './RightSidebar';
import BottomPanel from './BottomPanel';
import PreflightView from './PreflightView';

type RightTab = 'taskflow' | 'evidence' | 'waiting';
type BottomTab = 'terminal' | 'storage' | 'raw' | 'steering';

const AgentConsole: FC = () => {
  const [selectedProject, setSelectedProject] = useQueryState('project', { defaultValue: 'proj_001' });
  const [selectedSession, setSelectedSession] = useQueryState('session', { defaultValue: 'sess_1743530400_abc1' });
  const [rightTab, setRightTab] = useQueryState('rtab', { defaultValue: 'taskflow' });
  const [bottomTab, setBottomTab] = useQueryState('btab', { defaultValue: 'terminal' });
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<Record<string, ChatMessage[]>>({});
  const [steeringIntents, setSteeringIntents] = useState<SteeringIntent[]>([]);

  const session = MOCK_SESSIONS.find((s) => s.session_id === selectedSession) ?? MOCK_SESSIONS[0];
  const sessionArtifacts = MOCK_ARTIFACTS.filter((a) => a.session_id === selectedSession);
  const baseMessages = MOCK_MESSAGES[selectedSession] ?? [];
  const extraMessages = localMessages[selectedSession] ?? [];
  const messages = [...baseMessages, ...extraMessages];
  const steps = MOCK_TASK_FLOW[selectedSession] ?? [];
  const logs = MOCK_LOGS[selectedSession] ?? [];
  const storageItems = MOCK_STORAGE[selectedSession] ?? [];

  const preflight = sessionArtifacts.find((a) => a.artifact_type === 'PREFLIGHT_IMPROVEMENT');
  const dryrun = sessionArtifacts.find((a) => a.artifact_type === 'DRYRUN_PLANGRAPH');

  const handleSend = (text: string) => {
    const sessionId = selectedSession ?? 'sess_1743530400_abc1';
    const msg: ChatMessage = {
      id: `msg_local_${Date.now()}`,
      session_id: sessionId,
      role: 'operator',
      content: text,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] ?? []), msg],
    }));
  };

  const handleChipClick = (_artifactId: string) => {
    // Switch to evidence panel so the user can inspect the referenced artifact
    // _artifactId will be used for scroll-to-artifact highlighting in a future implementation
    void setRightTab('evidence');
  };

  const handleProjectChange = (projectId: string) => {
    void setSelectedProject(projectId);
  };

  const handleSessionSelect = (sessionId: string) => {
    void setSelectedSession(sessionId);
  };

  const handleRightTabChange = (tab: RightTab) => {
    void setRightTab(tab);
  };

  const handleBottomTabChange = (tab: BottomTab) => {
    void setBottomTab(tab);
  };

  const handleSteer = (goal: string, constraints: string[]) => {
    const intent: SteeringIntent = {
      id: `intent_${Date.now()}`,
      session_id: session.session_id,
      goal,
      constraints,
      submitted_at: new Date().toISOString(),
      status: 'pending',
    };
    setSteeringIntents((prev) => [...prev, intent]);
    // Also push a message into the chat
    const sessionId = selectedSession ?? 'sess_1743530400_abc1';
    const msg: ChatMessage = {
      id: `msg_steer_${Date.now()}`,
      session_id: sessionId,
      role: 'operator',
      content: `[Steering] ${goal}${constraints.length > 0 ? `\nConstraints: ${constraints.join(', ')}` : ''}`,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] ?? []), msg],
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-200 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <ProjectSidebar
          projects={MOCK_PROJECTS}
          selectedProjectId={selectedProject ?? 'proj_001'}
          sessions={MOCK_SESSIONS}
          selectedSessionId={selectedSession ?? undefined}
          onProjectChange={handleProjectChange}
          onSessionSelect={handleSessionSelect}
        />

        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <SessionHeader session={session} />
          <PhaseStrip current={session.state} />

          {preflightOpen && (
            <div className="p-4 border-b border-zinc-800 bg-zinc-950">
              <PreflightView
                preflight={preflight}
                dryrun={dryrun}
                onApprove={() => setPreflightOpen(false)}
              />
            </div>
          )}

          <MessageList messages={messages} onChipClick={handleChipClick} />
          <Composer
            onSend={handleSend}
            onPreflightToggle={setPreflightOpen}
            preflightMode={preflightOpen}
          />
        </div>

        {/* Right Sidebar */}
        <RightSidebar
          activeTab={(rightTab ?? 'taskflow') as RightTab}
          onTabChange={handleRightTabChange}
          steps={steps}
          artifacts={sessionArtifacts}
        />
      </div>

      {/* Bottom Panel */}
      <BottomPanel
        activeTab={(bottomTab ?? 'terminal') as BottomTab}
        onTabChange={handleBottomTabChange}
        logs={logs}
        storageItems={storageItems}
        session={session}
        artifacts={sessionArtifacts}
        steeringIntents={steeringIntents}
        onSteer={handleSteer}
      />
    </div>
  );
};

export default AgentConsole;
