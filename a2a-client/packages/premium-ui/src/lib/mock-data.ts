// Mock data for agent console

export type Project = { id: string; name: string; description: string; createdAt: string; updatedAt: string; };
export type SessionStatus = "running" | "waiting" | "validating" | "completed" | "failed" | "stopped";
export type SessionPhase = "scan" | "generate" | "enrich" | "self-correct" | "execute" | "validate" | "deliver" | "waiting";
export type Session = { id: string; projectId: string; name: string; status: SessionStatus; currentPhase: SessionPhase; autonomyMode: "supervised" | "auto"; createdAt: string; updatedAt: string; startedAt?: string; completedAt?: string; };
export type MessageRole = "operator" | "agent";

// Action step inside an agent message (like Copilot tool calls)
export type ActionStatus = "done" | "running" | "error";
export type ActionStep = {
  id: string;
  icon: "file" | "search" | "run" | "edit" | "check" | "tool";
  label: string;           // e.g. "Read 4 files"
  status: ActionStatus;
  items?: string[];        // sub-items shown when expanded, e.g. file paths
  duration?: string;       // e.g. "2.1s"
};

export type Message = {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  evidenceIds?: string[];
  phase?: SessionPhase;
  actions?: ActionStep[];  // agent reasoning/tool chain
  duration?: string;       // total response time
};

export type ArtifactType = "CONFIDENCE_TRACE" | "EXECUTION_DECISION" | "WAITING_STATE" | "WAITING_STATE_EVENT" | "LOOP_SIGNAL" | "TRACE_RISK" | "DRYRUN_PLANGRAPH" | "DRYRUN_DELTA" | "MEMORY_INFLUENCE" | "EPISODIC_ENTRY" | "EPISODIC_RECALL_RESULT" | "DONECRITERIA_RESULT" | "VALIDATION_SUMMARY" | "BRANCH_INTEGRITY" | "PREFLIGHT_IMPROVEMENT" | "BLOCKER_SET" | "ORCHESTRATOR_CYCLE" | "SESSION_END_RECORD";
export type ArtifactSeverity = "info" | "warning" | "critical";
export type Artifact = { id: string; sessionId: string; type: ArtifactType; summary: string; severity: ArtifactSeverity; createdAt: string; data: Record<string, any>; };
export type StepPhase = SessionPhase;
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type Step = { id: string; sessionId: string; phase: StepPhase; status: StepStatus; title: string; startedAt?: string; completedAt?: string; artifactIds: string[]; };
export type WaitingReason = "HUMAN_APPROVAL" | "DATA_ACCESS" | "EXTERNAL_CALL" | "CRITICAL_PATH" | "VALIDATION";
export type WaitingState = { id: string; sessionId: string; reason: WaitingReason; createdAt: string; expiresAt: string; resumeTarget: string; requiredInputs: string[]; humanlayerApprovalType: string; triggeredCriteria: string[]; };
export type TerminalLogSeverity = "info" | "debug" | "warn" | "error";
export type TerminalLog = { id: string; sessionId: string; severity: TerminalLogSeverity; message: string; timestamp: string; tags?: string[]; };
export type StorageArtifact = { id: string; sessionId: string; name: string; type: string; createdAt: string; size: number; status: "active" | "archived" | "pending"; };

// ============================================================================
// MOCK DATA
// ============================================================================

export const mockProjects: Project[] = [
  { id: "proj_repo_ai_001", name: "Repository A2A Agent", description: "Autonomy-first repository improvement agent", createdAt: "2024-01-15T08:00:00Z", updatedAt: "2024-03-28T14:22:00Z" },
  { id: "proj_code_refactor_002", name: "Code Refactoring Suite", description: "Automatic refactoring and modernization", createdAt: "2024-02-01T09:30:00Z", updatedAt: "2024-03-27T11:15:00Z" },
  { id: "proj_docs_gen_003", name: "Documentation Generator", description: "Automated API and module documentation", createdAt: "2024-02-15T10:45:00Z", updatedAt: "2024-03-26T16:40:00Z" },
];

export const mockSessions: Session[] = [
  { id: "sess_001_running", projectId: "proj_repo_ai_001", name: "Scan auth module for vulnerabilities", status: "running", currentPhase: "execute", autonomyMode: "supervised", createdAt: "2024-03-29T08:15:00Z", updatedAt: "2024-03-29T10:45:00Z", startedAt: "2024-03-29T08:15:00Z" },
  { id: "sess_002_waiting", projectId: "proj_repo_ai_001", name: "Add TypeScript strict mode", status: "waiting", currentPhase: "waiting", autonomyMode: "supervised", createdAt: "2024-03-28T14:20:00Z", updatedAt: "2024-03-29T09:30:00Z", startedAt: "2024-03-28T14:20:00Z" },
  { id: "sess_003_completed", projectId: "proj_repo_ai_001", name: "Optimize database queries", status: "completed", currentPhase: "deliver", autonomyMode: "auto", createdAt: "2024-03-27T09:00:00Z", updatedAt: "2024-03-28T16:30:00Z", startedAt: "2024-03-27T09:00:00Z", completedAt: "2024-03-28T16:30:00Z" },
  { id: "sess_004_validating", projectId: "proj_code_refactor_002", name: "Refactor payment flow", status: "validating", currentPhase: "validate", autonomyMode: "supervised", createdAt: "2024-03-29T06:00:00Z", updatedAt: "2024-03-29T10:20:00Z", startedAt: "2024-03-29T06:00:00Z" },
  { id: "sess_005_failed", projectId: "proj_docs_gen_003", name: "Generate API docs", status: "failed", currentPhase: "scan", autonomyMode: "auto", createdAt: "2024-03-28T11:00:00Z", updatedAt: "2024-03-28T12:15:00Z", startedAt: "2024-03-28T11:00:00Z", completedAt: "2024-03-28T12:15:00Z" },
];

export const mockMessages: Message[] = [
  {
    id: "msg_001",
    sessionId: "sess_001_running",
    role: "operator",
    content: "Start scanning auth module for security issues",
    timestamp: "2024-03-29T08:15:00Z",
  },
  {
    id: "msg_002",
    sessionId: "sess_001_running",
    role: "agent",
    content: "I'll scan the authentication module now. Let me read the relevant files first.",
    timestamp: "2024-03-29T08:20:00Z",
    duration: "18m 3s",
    actions: [
      {
        id: "act_001",
        icon: "run",
        label: "Setting up environment",
        status: "done",
        duration: "1.2s",
        items: [
          "Start agent firewall",
          "Initialize RAG index",
          "Load project context",
        ],
      },
      {
        id: "act_002",
        icon: "file",
        label: "Read 4 files",
        status: "done",
        duration: "0.8s",
        items: [
          "src/auth/login.ts",
          "src/auth/session.ts",
          "src/middleware/auth.ts:1-80",
          "src/middleware/auth.ts:200-340",
        ],
      },
      {
        id: "act_003",
        icon: "search",
        label: "Search codebase  sql injection patterns",
        status: "done",
        duration: "2.1s",
        items: [
          "Found 3 matches in src/auth/login.ts",
          "Found 1 match in src/api/users.ts",
        ],
      },
    ],
  },
  {
    id: "msg_003",
    sessionId: "sess_001_running",
    role: "agent",
    content: "SQL injection risk detected in login endpoint. Confidence: 0.89. Proceeding with fix generation.",
    timestamp: "2024-03-29T09:00:00Z",
    duration: "4m 12s",
    actions: [
      {
        id: "act_004",
        icon: "check",
        label: "Check ENV redisUrl and REDIS_URL handling",
        status: "done",
        items: ["src/config/env.ts:12"],
      },
      {
        id: "act_005",
        icon: "file",
        label: "Read existing registry tests for style reference",
        status: "done",
        items: ["tests/auth/login.test.ts", "tests/auth/session.test.ts"],
      },
      {
        id: "act_006",
        icon: "edit",
        label: "Edit src/auth/login.ts",
        status: "done",
        duration: "0.4s",
        items: ["Replace string concat with parameterized query at line 42"],
      },
    ],
  },
  {
    id: "msg_004",
    sessionId: "sess_001_running",
    role: "agent",
    content: "Fix applied. Running dry-run validation to confirm no regressions.",
    timestamp: "2024-03-29T09:45:00Z",
    duration: "2m 30s",
    actions: [
      {
        id: "act_007",
        icon: "run",
        label: "Run unit tests",
        status: "done",
        duration: "14.3s",
        items: ["24 passed  0 failed"],
      },
      {
        id: "act_008",
        icon: "run",
        label: "Run integration tests",
        status: "running",
        items: ["auth/login.integration.test.ts"],
      },
    ],
  },
  {
    id: "msg_005",
    sessionId: "sess_001_running",
    role: "operator",
    content: "Approving live execution. Security review passed.",
    timestamp: "2024-03-29T10:30:00Z",
  },
  {
    id: "msg_006",
    sessionId: "sess_001_running",
    role: "agent",
    content: "Applying fix to repository. All checks passed.",
    timestamp: "2024-03-29T10:35:00Z",
    duration: "45s",
    actions: [
      {
        id: "act_009",
        icon: "edit",
        label: "Commit changes",
        status: "done",
        duration: "0.6s",
        items: ["fix(auth): use parameterized queries in login endpoint"],
      },
    ],
  },
];

export const mockArtifacts: Artifact[] = [
  { id: "art_conf_001", sessionId: "sess_001_running", type: "CONFIDENCE_TRACE", summary: "Vulnerability detection confidence levels", severity: "warning", createdAt: "2024-03-29T08:20:00Z", data: {} },
  { id: "art_trace_001", sessionId: "sess_001_running", type: "EXECUTION_DECISION", summary: "Decision to proceed with SQL injection fix", severity: "critical", createdAt: "2024-03-29T09:00:00Z", data: {} },
];

export const mockSteps: Step[] = [
  { id: "step_001", sessionId: "sess_001_running", phase: "scan", status: "completed", title: "Scan authentication module", startedAt: "2024-03-29T08:15:00Z", completedAt: "2024-03-29T08:45:00Z", artifactIds: ["art_conf_001"] },
  { id: "step_002", sessionId: "sess_001_running", phase: "generate", status: "completed", title: "Generate improvement proposals", startedAt: "2024-03-29T08:45:00Z", completedAt: "2024-03-29T09:15:00Z", artifactIds: ["art_trace_001"] },
  { id: "step_003", sessionId: "sess_001_running", phase: "execute", status: "running", title: "Execute improvements", startedAt: "2024-03-29T09:45:00Z", artifactIds: [] },
];

export const mockWaitingState: WaitingState | null = null;
export const mockTerminalLogs: TerminalLog[] = [];
export const mockStorageArtifacts: StorageArtifact[] = [];

// ============================================================================
// ACCESSORS
// ============================================================================
export const getProject = (id: string) => mockProjects.find((p) => p.id === id);
export const getSessions = (projectId?: string) => projectId ? mockSessions.filter((s) => s.projectId === projectId) : mockSessions;
export const getSession = (id: string) => mockSessions.find((s) => s.id === id);
export const getMessages = (sessionId: string) => mockMessages.filter((m) => m.sessionId === sessionId);
export const getArtifact = (id: string) => mockArtifacts.find((a) => a.id === id);
export const getArtifacts = (sessionId: string) => mockArtifacts.filter((a) => a.sessionId === sessionId);
export const getSteps = (sessionId: string) => mockSteps.filter((s) => s.sessionId === sessionId);
export const getTerminalLogs = (sessionId: string) => mockTerminalLogs.filter((l) => l.sessionId === sessionId);
export const getStorageArtifacts = (sessionId: string) => mockStorageArtifacts.filter((a) => a.sessionId === sessionId);
export const getSessionsGroupedByStatus = (projectId: string) => {
  const sessions = getSessions(projectId);
  return { running: sessions.filter((s) => s.status === "running"), waiting: sessions.filter((s) => s.status === "waiting"), validating: sessions.filter((s) => s.status === "validating"), completed: sessions.filter((s) => s.status === "completed"), failed: sessions.filter((s) => s.status === "failed") };
};
export const formatTime = (iso: string) => {
  const d = new Date(iso), now = new Date(), diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 1) return "now"; if (diff < 60) return `${diff}m ago`; if (diff < 1440) return `${Math.floor(diff/60)}h ago`; return `${Math.floor(diff/1440)}d ago`;
};
