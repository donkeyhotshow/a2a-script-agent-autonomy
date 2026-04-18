/**
 * session/manager.ts — Per-chat state lifecycle manager.
 * Tracks stage, awaitingChoice, verboseLevel, activity timestamps, etc.
 */
import { type SessionStore } from "./store.js"
import {
  createSession as a2aCreateSession,
  stopSession as a2aStopSession,
  getSession as a2aGetSession,
  type SessionSnapshot,
} from "../bridge/a2a-client.js"
import { config } from "../config.js"

// ── ChatState ─────────────────────────────────────────────────────────────────

export interface ChatState {
  sessionId: string
  stage: string
  awaitingChoice: boolean
  awaitingApproval: boolean
  verboseLevel: 0 | 1 | 2
  startedAt: number
  lastActivityAt: number
  messageCount: number
}

// ── In-memory state layer (augments the persistent store) ─────────────────────

const stateMap = new Map<number, ChatState>()

function defaultState(sessionId: string): ChatState {
  return {
    sessionId,
    stage: "init",
    awaitingChoice: false,
    awaitingApproval: false,
    verboseLevel: config.verboseLevel as 0 | 1 | 2,
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
    messageCount: 0,
  }
}

// ── SessionManager ────────────────────────────────────────────────────────────

export class SessionManager {
  constructor(private store: SessionStore) {}

  /** Get ChatState for chatId, creating a new A2A session if none exists. */
  async getOrCreate(chatId: number): Promise<ChatState> {
    let existing = stateMap.get(chatId)
    if (existing) return existing

    const storedId = await this.store.get(chatId)
    if (storedId) {
      const state = defaultState(storedId)
      stateMap.set(chatId, state)
      return state
    }

    // Create fresh session
    const sessionId = await a2aCreateSession()
    await this.store.set(chatId, sessionId)
    const state = defaultState(sessionId)
    stateMap.set(chatId, state)
    return state
  }

  /** Create a new session, stopping any existing one. */
  async createNew(chatId: number): Promise<ChatState> {
    const existing = stateMap.get(chatId)
    if (existing) {
      try {
        await a2aStopSession(existing.sessionId)
      } catch {
        // ignore stop errors
      }
    }
    const sessionId = await a2aCreateSession()
    await this.store.set(chatId, sessionId)
    const state = defaultState(sessionId)
    stateMap.set(chatId, state)
    return state
  }

  /** Patch ChatState fields. */
  update(chatId: number, patch: Partial<ChatState>): void {
    const existing = stateMap.get(chatId)
    if (!existing) return
    stateMap.set(chatId, {
      ...existing,
      ...patch,
      lastActivityAt: Date.now(),
    })
  }

  /** Clear state and delete session mapping. */
  async clear(chatId: number): Promise<void> {
    const state = stateMap.get(chatId)
    if (state) {
      try {
        await a2aStopSession(state.sessionId)
      } catch {
        // ignore
      }
    }
    stateMap.delete(chatId)
    await this.store.delete(chatId)
  }

  /** Get current state without creating. */
  get(chatId: number): ChatState | null {
    return stateMap.get(chatId) ?? null
  }

  /** List all active sessions. */
  list(): Array<{ chatId: number; state: ChatState }> {
    return Array.from(stateMap.entries()).map(([chatId, state]) => ({
      chatId,
      state,
    }))
  }

  /** Hydrate stage from server snapshot. */
  async hydrateStage(chatId: number): Promise<SessionSnapshot | null> {
    const state = stateMap.get(chatId)
    if (!state) return null
    try {
      const snap = await a2aGetSession(state.sessionId)
      this.update(chatId, { stage: snap.stage ?? state.stage })
      return snap
    } catch {
      return null
    }
  }
}
