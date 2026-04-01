/**
 * Zustand FSM store — orchestrator state machine (ADR-0051).
 *
 * Single source of truth for the active session's FSM state, confidence,
 * artifact feed, and heartbeat. Components subscribe to slices they need
 * to avoid re-renders from unrelated updates.
 */
import { create } from 'zustand';
import type { OrchestratorState, ArtifactBase, Session } from '../lib/types';
import { FSM_TRANSITIONS } from '../lib/types';

// ── Fitness functions (Part 7) ─────────────────────────────────────────────
export interface FitnessFunctions {
  max_waiting_age_ms: number;           // default: 3_600_000 (1 hour)
  confidence_drift_threshold: number;   // default: 0.15 (15% drop triggers alert)
  loop_rate_max: number;                // max loops per 10 min
  rollback_time_target_ms: number;      // target: < 5000 ms
  human_approval_rate_target: number;   // target: > 90%
  chat_stability_target: number;        // target: 100%
  autonomy_rate_target: number;         // target: > 92%
}

export const DEFAULT_FITNESS: FitnessFunctions = {
  max_waiting_age_ms: 3_600_000,
  confidence_drift_threshold: 0.15,
  loop_rate_max: 3,
  rollback_time_target_ms: 5000,
  human_approval_rate_target: 0.9,
  chat_stability_target: 1.0,
  autonomy_rate_target: 0.92,
};

// ── WebSocket envelope (Part 8) ────────────────────────────────────────────
export interface WebSocketEnvelope<T = unknown> {
  event_id: string;
  event_type: 'ARTIFACT' | 'PHASE_TRANSITION' | 'HEARTBEAT' | 'LOG';
  session_id: string;
  timestamp: string;
  payload: T;
}

export interface PhaseTransitionPayload {
  from: OrchestratorState;
  to: OrchestratorState;
  confidence: number;
  reason?: string;
}

// ── Store state ────────────────────────────────────────────────────────────
interface OrchestratorSlice {
  // Active session
  activeSessionId: string | null;
  activeSession: Session | null;

  // FSM
  fsmState: OrchestratorState;
  previousState: OrchestratorState | null;
  transitionHistory: Array<{ from: OrchestratorState; to: OrchestratorState; at: string }>;

  // Confidence
  confidence: number;
  confidenceHistory: Array<{ value: number; at: string }>;
  confidenceAlerted: boolean;

  // Artifacts (streaming feed for active session)
  artifacts: ArtifactBase[];
  pendingArtifactIds: Set<string>;

  // Heartbeat
  lastHeartbeatAt: string | null;
  heartbeatHealthy: boolean;

  // Fitness
  fitness: FitnessFunctions;
}

interface OrchestratorActions {
  // Session management
  setActiveSession(session: Session): void;
  clearActiveSession(): void;

  // FSM transitions — validates against FSM_TRANSITIONS
  transition(to: OrchestratorState, reason?: string): boolean;

  // Confidence update
  updateConfidence(value: number): void;

  // Artifact feed
  addArtifact(artifact: ArtifactBase): void;
  clearArtifacts(): void;

  // Heartbeat
  recordHeartbeat(): void;

  // WebSocket envelope processor
  processEnvelope(envelope: WebSocketEnvelope): void;

  // Fitness override
  setFitness(patch: Partial<FitnessFunctions>): void;
}

// ── Store ──────────────────────────────────────────────────────────────────
export const useOrchestratorStore = create<OrchestratorSlice & OrchestratorActions>(
  (set, get) => ({
    // Initial state
    activeSessionId: null,
    activeSession: null,
    fsmState: 'IDLE',
    previousState: null,
    transitionHistory: [],
    confidence: 0,
    confidenceHistory: [],
    confidenceAlerted: false,
    artifacts: [],
    pendingArtifactIds: new Set(),
    lastHeartbeatAt: null,
    heartbeatHealthy: false,
    fitness: { ...DEFAULT_FITNESS },

    // ── Actions ──────────────────────────────────────────────────────────

    setActiveSession(session) {
      set({
        activeSessionId: session.session_id,
        activeSession: session,
        fsmState: session.state as OrchestratorState,
        confidence: session.metrics.confidence,
        confidenceHistory: [{ value: session.metrics.confidence, at: session.updated_at }],
        artifacts: [],
        confidenceAlerted: false,
      });
    },

    clearActiveSession() {
      set({
        activeSessionId: null,
        activeSession: null,
        fsmState: 'IDLE',
        previousState: null,
        artifacts: [],
        confidenceHistory: [],
        transitionHistory: [],
      });
    },

    transition(to, reason) {
      const { fsmState, transitionHistory } = get();
      const allowed = FSM_TRANSITIONS[fsmState] ?? [];
      if (!allowed.includes(to)) {
        return false;
      }
      const entry = { from: fsmState, to, at: new Date().toISOString() };
      set({
        previousState: fsmState,
        fsmState: to,
        transitionHistory: [...transitionHistory.slice(-49), entry],
      });
      void reason; // reserved for future logging
      return true;
    },

    updateConfidence(value) {
      const { confidence, confidenceHistory, fitness } = get();
      const clamped = Math.max(0, Math.min(1, value));
      const alerted = (confidence - clamped) >= fitness.confidence_drift_threshold;
      set({
        confidence: clamped,
        confidenceHistory: [
          ...confidenceHistory.slice(-99),
          { value: clamped, at: new Date().toISOString() },
        ],
        confidenceAlerted: alerted,
      });
    },

    addArtifact(artifact) {
      const { artifacts, pendingArtifactIds } = get();
      if (pendingArtifactIds.has(artifact.artifact_id)) return; // dedup
      const next = new Set(pendingArtifactIds);
      next.add(artifact.artifact_id);
      set({
        artifacts: [...artifacts, artifact],
        pendingArtifactIds: next,
      });
    },

    clearArtifacts() {
      set({ artifacts: [], pendingArtifactIds: new Set() });
    },

    recordHeartbeat() {
      set({ lastHeartbeatAt: new Date().toISOString(), heartbeatHealthy: true });
    },

    processEnvelope(envelope) {
      const store = get();
      if (envelope.event_type === 'PHASE_TRANSITION') {
        const p = envelope.payload as PhaseTransitionPayload;
        store.transition(p.to, p.reason);
        store.updateConfidence(p.confidence);
      } else if (envelope.event_type === 'ARTIFACT') {
        store.addArtifact(envelope.payload as ArtifactBase);
      } else if (envelope.event_type === 'HEARTBEAT') {
        store.recordHeartbeat();
      }
    },

    setFitness(patch) {
      set((s) => ({ fitness: { ...s.fitness, ...patch } }));
    },
  })
);

// Convenience selectors (avoid object equality issues with shallow comparison)
export const selectFsmState = (s: OrchestratorSlice) => s.fsmState;
export const selectConfidence = (s: OrchestratorSlice) => s.confidence;
export const selectArtifacts = (s: OrchestratorSlice) => s.artifacts;
export const selectHeartbeat = (s: OrchestratorSlice) => ({
  at: s.lastHeartbeatAt,
  healthy: s.heartbeatHealthy,
});
