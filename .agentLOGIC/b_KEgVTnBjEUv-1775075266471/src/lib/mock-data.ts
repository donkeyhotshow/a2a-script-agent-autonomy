// Mock data for agent console - realistic operator workflow

export type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionStatus =
  | "running"
  | "waiting"
  | "validating"
  | "completed"
  | "failed"
  | "stopped";

export type SessionPhase =
  | "scan"
  | "generate"
  | "enrich"
  | "self-correct"
  | "execute"
  | "validate"
  | "deliver"
  | "waiting";

export type Session = {
  id: string;
  projectId: string;
  name: string;
  status: SessionStatus;
  currentPhase: SessionPhase;
  autonomyMode: "supervised" | "auto";
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
};

export type MessageRole = "operator" | "agent";

export type Message = {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  evidenceIds?: string[];
  phase?: SessionPhase;
};

export type ArtifactType =
  | "CONFIDENCE_TRACE"
  | "EXECUTION_DECISION"
  | "WAITING_STATE"
  | "WAITING_STATE_EVENT"
  | "LOOP_SIGNAL"
  | "TRACE_RISK"
  | "DRYRUN_PLANGRAPH"
  | "DRYRUN_DELTA"
  | "MEMORY_INFLUENCE"
  | "EPISODIC_ENTRY"
  | "EPISODIC_RECALL_RESULT"
  | "DONECRITERIA_RESULT"
  | "VALIDATION_SUMMARY"
  | "BRANCH_INTEGRITY"
  | "PREFLIGHT_IMPROVEMENT"
  | "BLOCKER_SET"
  | "ORCHESTRATOR_CYCLE"
  | "SESSION_END_RECORD";

export type ArtifactSeverity = "info" | "warning" | "critical";

export type Artifact = {
  id: string;
  sessionId: string;
  type: ArtifactType;
  summary: string;
  severity: ArtifactSeverity;
  createdAt: string;
  data: Record<string, any>;
};

export type StepPhase = SessionPhase;

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type Step = {
  id: string;
  sessionId: string;
  phase: StepPhase;
  status: StepStatus;
  title: string;
  startedAt?: string;
  completedAt?: string;
  artifactIds: string[];
};

export type WaitingReason =
  | "HUMAN_APPROVAL"
  | "DATA_ACCESS"
  | "EXTERNAL_CALL"
  | "CRITICAL_PATH"
  | "VALIDATION";

export type WaitingState = {
  id: string;
  sessionId: string;
  reason: WaitingReason;
  createdAt: string;
  expiresAt: string;
  resumeTarget: string;
  requiredInputs: string[];
  humanlayerApprovalType: string;
  triggeredCriteria: string[];
};

export type TerminalLogSeverity = "info" | "debug" | "warn" | "error";

export type TerminalLog = {
  id: string;
  sessionId: string;
  severity: TerminalLogSeverity;
  message: string;
  timestamp: string;
  tags?: string[];
};

export type StorageArtifact = {
  id: string;
  sessionId: string;
  name: string;
  type: string;
  createdAt: string;
  size: number;
  status: "active" | "archived" | "pending";
};

// ============================================================================
// MOCK DATA INSTANCES
// ============================================================================

export const mockProjects: Project[] = [
  {
    id: "proj_repo_ai_001",
    name: "Repository A2A Agent",
    description: "Autonomy-first repository improvement agent",
    createdAt: "2024-01-15T08:00:00Z",
    updatedAt: "2024-03-28T14:22:00Z",
  },
  {
    id: "proj_code_refactor_002",
    name: "Code Refactoring Suite",
    description: "Automatic refactoring and modernization",
    createdAt: "2024-02-01T09:30:00Z",
    updatedAt: "2024-03-27T11:15:00Z",
  },
  {
    id: "proj_docs_gen_003",
    name: "Documentation Generator",
    description: "Automated API and module documentation",
    createdAt: "2024-02-15T10:45:00Z",
    updatedAt: "2024-03-26T16:40:00Z",
  },
];

export const mockSessions: Session[] = [
  {
    id: "sess_001_running",
    projectId: "proj_repo_ai_001",
    name: "Scan auth module for vulnerabilities",
    status: "running",
    currentPhase: "execute",
    autonomyMode: "supervised",
    createdAt: "2024-03-29T08:15:00Z",
    updatedAt: "2024-03-29T10:45:00Z",
    startedAt: "2024-03-29T08:15:00Z",
  },
  {
    id: "sess_002_waiting",
    projectId: "proj_repo_ai_001",
    name: "Add TypeScript strict mode",
    status: "waiting",
    currentPhase: "waiting",
    autonomyMode: "supervised",
    createdAt: "2024-03-28T14:20:00Z",
    updatedAt: "2024-03-29T09:30:00Z",
    startedAt: "2024-03-28T14:20:00Z",
  },
  {
    id: "sess_003_completed",
    projectId: "proj_repo_ai_001",
    name: "Optimize database queries",
    status: "completed",
    currentPhase: "deliver",
    autonomyMode: "auto",
    createdAt: "2024-03-27T09:00:00Z",
    updatedAt: "2024-03-28T16:30:00Z",
    startedAt: "2024-03-27T09:00:00Z",
    completedAt: "2024-03-28T16:30:00Z",
  },
  {
    id: "sess_004_validating",
    projectId: "proj_code_refactor_002",
    name: "Refactor payment flow",
    status: "validating",
    currentPhase: "validate",
    autonomyMode: "supervised",
    createdAt: "2024-03-29T06:00:00Z",
    updatedAt: "2024-03-29T10:20:00Z",
    startedAt: "2024-03-29T06:00:00Z",
  },
  {
    id: "sess_005_failed",
    projectId: "proj_docs_gen_003",
    name: "Generate API docs",
    status: "failed",
    currentPhase: "scan",
    autonomyMode: "auto",
    createdAt: "2024-03-28T11:00:00Z",
    updatedAt: "2024-03-28T12:15:00Z",
    startedAt: "2024-03-28T11:00:00Z",
    completedAt: "2024-03-28T12:15:00Z",
  },
];

export const mockMessages: Message[] = [
  {
    id: "msg_001",
    sessionId: "sess_001_running",
    role: "operator",
    content: "Start scanning auth module for security issues",
    timestamp: "2024-03-29T08:15:00Z",
    phase: "scan",
  },
  {
    id: "msg_002",
    sessionId: "sess_001_running",
    role: "agent",
    content: "Beginning scan of authentication module. Found 3 potential vulnerability classes.",
    timestamp: "2024-03-29T08:20:00Z",
    evidenceIds: ["art_conf_001"],
    phase: "scan",
  },
  {
    id: "msg_003",
    sessionId: "sess_001_running",
    role: "agent",
    content: "SQL injection risk detected in login endpoint. Confidence: 0.89. Proceeding with verification.",
    timestamp: "2024-03-29T09:00:00Z",
    evidenceIds: ["art_trace_001", "art_risk_001"],
    phase: "generate",
  },
  {
    id: "msg_004",
    sessionId: "sess_001_running",
    role: "agent",
    content: "Generated fix proposal. Running dry-run validation...",
    timestamp: "2024-03-29T09:45:00Z",
    evidenceIds: ["art_dryrun_001"],
    phase: "execute",
  },
  {
    id: "msg_005",
    sessionId: "sess_001_running",
    role: "agent",
    content: "Dry-run complete. Ready to apply fix to live environment. Approval required for critical security patch.",
    timestamp: "2024-03-29T10:15:00Z",
    evidenceIds: ["art_dryrun_delta_001"],
    phase: "execute",
  },
  {
    id: "msg_006",
    sessionId: "sess_001_running",
    role: "operator",
    content: "Approving live execution. Security review passed.",
    timestamp: "2024-03-29T10:30:00Z",
    phase: "execute",
  },
  {
    id: "msg_007",
    sessionId: "sess_001_running",
    role: "agent",
    content: "Applying fix to repository...",
    timestamp: "2024-03-29T10:35:00Z",
    phase: "execute",
  },
];

export const mockArtifacts: Artifact[] = [
  {
    id: "art_conf_001",
    sessionId: "sess_001_running",
    type: "CONFIDENCE_TRACE",
    summary: "Vulnerability detection confidence levels",
    severity: "warning",
    createdAt: "2024-03-29T08:20:00Z",
    data: {
      phase: "scan",
      vulnerabilities: [
        { type: "sql_injection", confidence: 0.89, location: "login.ts:42" },
        { type: "xss", confidence: 0.72, location: "profile.ts:18" },
        { type: "csrf", confidence: 0.65, location: "form.ts:55" },
      ],
      averageConfidence: 0.75,
      requiresApproval: true,
    },
  },
  {
    id: "art_trace_001",
    sessionId: "sess_001_running",
    type: "EXECUTION_DECISION",
    summary: "Decision to proceed with SQL injection fix",
    severity: "critical",
    createdAt: "2024-03-29T09:00:00Z",
    data: {
      decision: "PROCEED_WITH_CAUTION",
      riskScore: 0.78,
      alternativeApproaches: 2,
      selectedApproach: "parameterized_queries",
      estimatedImpact: "low",
    },
  },
  {
    id: "art_risk_001",
    sessionId: "sess_001_running",
    type: "TRACE_RISK",
    summary: "Identified code execution risk in user input handling",
    severity: "critical",
    createdAt: "2024-03-29T09:00:00Z",
    data: {
      riskType: "code_execution",
      location: "auth/login.ts:42",
      severity: "HIGH",
      affectedEndpoints: ["/api/auth/login", "/api/auth/validate"],
      mitigation: "Use parameterized queries and input validation",
    },
  },
  {
    id: "art_dryrun_001",
    sessionId: "sess_001_running",
    type: "DRYRUN_PLANGRAPH",
    summary: "Dry-run execution plan and validation graph",
    severity: "info",
    createdAt: "2024-03-29T09:45:00Z",
    data: {
      steps: [
        { step: 1, action: "Parse vulnerable code", status: "completed" },
        { step: 2, action: "Generate fix", status: "completed" },
        { step: 3, action: "Run unit tests", status: "completed", result: "24 passed" },
        { step: 4, action: "Run integration tests", status: "pending" },
      ],
      predictedConfidence: 0.92,
      approvalType: "CRITICAL_PATH",
    },
  },
  {
    id: "art_dryrun_delta_001",
    sessionId: "sess_001_running",
    type: "DRYRUN_DELTA",
    summary: "Changes between current and proposed state",
    severity: "info",
    createdAt: "2024-03-29T10:15:00Z",
    data: {
      filesModified: 1,
      linesAdded: 8,
      linesRemoved: 3,
      files: [
        {
          path: "src/auth/login.ts",
          additions: 8,
          deletions: 3,
          summary: "Replace string concatenation with parameterized queries",
        },
      ],
    },
  },
  {
    id: "art_memory_001",
    sessionId: "sess_001_running",
    type: "MEMORY_INFLUENCE",
    summary: "Similar vulnerability patterns from episodic memory",
    severity: "info",
    createdAt: "2024-03-29T09:15:00Z",
    data: {
      previousIncidents: 2,
      successRate: 0.95,
      applicableContext: ["auth_vulnerabilities", "sql_injection_fixes"],
    },
  },
  {
    id: "art_validation_001",
    sessionId: "sess_003_completed",
    type: "VALIDATION_SUMMARY",
    summary: "Validation passed: Query optimization successful",
    severity: "info",
    createdAt: "2024-03-28T16:00:00Z",
    data: {
      performanceGain: "34%",
      testsPassed: 48,
      testsFailed: 0,
      regressionTests: "passed",
      deliveryReadiness: "ready",
    },
  },
];

export const mockSteps: Step[] = [
  {
    id: "step_001",
    sessionId: "sess_001_running",
    phase: "scan",
    status: "completed",
    title: "Scan authentication module",
    startedAt: "2024-03-29T08:15:00Z",
    completedAt: "2024-03-29T08:45:00Z",
    artifactIds: ["art_conf_001"],
  },
  {
    id: "step_002",
    sessionId: "sess_001_running",
    phase: "generate",
    status: "completed",
    title: "Generate improvement proposals",
    startedAt: "2024-03-29T08:45:00Z",
    completedAt: "2024-03-29T09:15:00Z",
    artifactIds: ["art_trace_001"],
  },
  {
    id: "step_003",
    sessionId: "sess_001_running",
    phase: "enrich",
    status: "completed",
    title: "Enrich with memory and context",
    startedAt: "2024-03-29T09:15:00Z",
    completedAt: "2024-03-29T09:30:00Z",
    artifactIds: ["art_memory_001"],
  },
  {
    id: "step_004",
    sessionId: "sess_001_running",
    phase: "self-correct",
    status: "completed",
    title: "Validate and refine proposals",
    startedAt: "2024-03-29T09:30:00Z",
    completedAt: "2024-03-29T09:45:00Z",
    artifactIds: [],
  },
  {
    id: "step_005",
    sessionId: "sess_001_running",
    phase: "execute",
    status: "running",
    title: "Execute improvements",
    startedAt: "2024-03-29T09:45:00Z",
    artifactIds: ["art_dryrun_001", "art_dryrun_delta_001"],
  },
  {
    id: "step_006",
    sessionId: "sess_001_running",
    phase: "validate",
    status: "pending",
    title: "Validate changes",
    artifactIds: [],
  },
  {
    id: "step_007",
    sessionId: "sess_001_running",
    phase: "deliver",
    status: "pending",
    title: "Deliver to production",
    artifactIds: [],
  },
];

export const mockWaitingState: WaitingState | null = {
  id: "wait_001",
  sessionId: "sess_002_waiting",
  reason: "CRITICAL_PATH",
  createdAt: "2024-03-28T14:20:00Z",
  expiresAt: "2024-03-30T14:20:00Z",
  resumeTarget: "execute",
  requiredInputs: ["approval", "review_notes"],
  humanlayerApprovalType: "CRITICAL_PATH",
  triggeredCriteria: ["breaking_change", "high_impact"],
};

export const mockTerminalLogs: TerminalLog[] = [
  {
    id: "log_001",
    sessionId: "sess_001_running",
    severity: "info",
    message: "Starting authentication module scan",
    timestamp: "2024-03-29T08:15:00Z",
    tags: ["scan", "auth"],
  },
  {
    id: "log_002",
    sessionId: "sess_001_running",
    severity: "info",
    message: "Parsed 2,451 lines of code",
    timestamp: "2024-03-29T08:18:00Z",
    tags: ["scan"],
  },
  {
    id: "log_003",
    sessionId: "sess_001_running",
    severity: "warn",
    message: "Potential SQL injection vulnerability detected at login.ts:42",
    timestamp: "2024-03-29T08:22:00Z",
    tags: ["vulnerability", "sql"],
  },
  {
    id: "log_004",
    sessionId: "sess_001_running",
    severity: "info",
    message: "Generated 3 fix proposals",
    timestamp: "2024-03-29T09:15:00Z",
    tags: ["generate"],
  },
  {
    id: "log_005",
    sessionId: "sess_001_running",
    severity: "info",
    message: "Running dry-run validation",
    timestamp: "2024-03-29T09:45:00Z",
    tags: ["dryrun", "validate"],
  },
  {
    id: "log_006",
    sessionId: "sess_001_running",
    severity: "info",
    message: "Unit tests passed: 24/24",
    timestamp: "2024-03-29T09:48:00Z",
    tags: ["test"],
  },
  {
    id: "log_007",
    sessionId: "sess_001_running",
    severity: "info",
    message: "Integration tests running...",
    timestamp: "2024-03-29T09:52:00Z",
    tags: ["test"],
  },
];

export const mockStorageArtifacts: StorageArtifact[] = [
  {
    id: "stor_001",
    sessionId: "sess_001_running",
    name: "vulnerability_scan_results.json",
    type: "scan_results",
    createdAt: "2024-03-29T08:45:00Z",
    size: 24576,
    status: "active",
  },
  {
    id: "stor_002",
    sessionId: "sess_001_running",
    name: "fix_proposals.json",
    type: "proposals",
    createdAt: "2024-03-29T09:15:00Z",
    size: 18432,
    status: "active",
  },
  {
    id: "stor_003",
    sessionId: "sess_001_running",
    name: "dryrun_output.log",
    type: "logs",
    createdAt: "2024-03-29T09:45:00Z",
    size: 65536,
    status: "active",
  },
  {
    id: "stor_004",
    sessionId: "sess_001_running",
    name: "checkpoint_phase_execute.bin",
    type: "checkpoint",
    createdAt: "2024-03-29T10:00:00Z",
    size: 131072,
    status: "active",
  },
];

// ============================================================================
// DATA ACCESSOR FUNCTIONS
// ============================================================================

export function getProject(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id);
}

export function getSessions(projectId?: string): Session[] {
  if (!projectId) return mockSessions;
  return mockSessions.filter((s) => s.projectId === projectId);
}

export function getSession(id: string): Session | undefined {
  return mockSessions.find((s) => s.id === id);
}

export function getMessages(sessionId: string): Message[] {
  return mockMessages.filter((m) => m.sessionId === sessionId);
}

export function getArtifact(id: string): Artifact | undefined {
  return mockArtifacts.find((a) => a.id === id);
}

export function getArtifacts(sessionId: string): Artifact[] {
  return mockArtifacts.filter((a) => a.sessionId === sessionId);
}

export function getSteps(sessionId: string): Step[] {
  return mockSteps.filter((s) => s.sessionId === sessionId);
}

export function getTerminalLogs(sessionId: string): TerminalLog[] {
  return mockTerminalLogs.filter((l) => l.sessionId === sessionId);
}

export function getStorageArtifacts(sessionId: string): StorageArtifact[] {
  return mockStorageArtifacts.filter((a) => a.sessionId === sessionId);
}

export function getSessionsGroupedByStatus(projectId: string) {
  const sessions = getSessions(projectId);
  return {
    running: sessions.filter((s) => s.status === "running"),
    waiting: sessions.filter((s) => s.status === "waiting"),
    validating: sessions.filter((s) => s.status === "validating"),
    completed: sessions.filter((s) => s.status === "completed"),
    failed: sessions.filter((s) => s.status === "failed"),
  };
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
