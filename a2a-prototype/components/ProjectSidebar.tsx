'use client';
import type { FC } from 'react';
import type { Project, Session } from '@/lib/types';
import SessionList from './SessionList';

interface Props {
  projects: Project[];
  selectedProjectId: string;
  sessions: Session[];
  selectedSessionId?: string;
  onProjectChange: (projectId: string) => void;
  onSessionSelect: (sessionId: string) => void;
}

const ProjectSidebar: FC<Props> = ({
  projects,
  selectedProjectId,
  sessions,
  selectedSessionId,
  onProjectChange,
  onSessionSelect,
}) => {
  const project = projects.find((p) => p.project_id === selectedProjectId);
  const projectSessions = sessions.filter((s) => s.project_id === selectedProjectId);

  return (
    <div className="flex flex-col h-full border-r border-zinc-800 bg-zinc-950 w-64 shrink-0">
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-zinc-500 text-xs font-mono">Project</span>
        </div>
        <select
          value={selectedProjectId}
          onChange={(e) => onProjectChange(e.target.value)}
          className="w-full text-xs font-mono bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-500"
        >
          {projects.map((p) => (
            <option key={p.project_id} value={p.project_id}>{p.name}</option>
          ))}
        </select>
        {project && (
          <div className="mt-2">
            <p className="text-zinc-600 text-xs truncate" title={project.repo_url}>{project.repo_url}</p>
            <p className="text-zinc-700 text-xs font-mono">{project.session_count} sessions</p>
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-b border-zinc-800">
        <p className="text-zinc-500 text-xs font-mono">Sessions ({projectSessions.length})</p>
      </div>
      <SessionList
        sessions={projectSessions}
        selectedId={selectedSessionId}
        onSelect={onSessionSelect}
      />
    </div>
  );
};

export default ProjectSidebar;
