/**
 * Session types for A2A API Client
 * Defines structures for session management, dialog history, and sequence tracking
 */

// ============================================
// Session Metadata
// ============================================

export interface SessionMetadata {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
}

// ============================================
// Dialog Format (Human-readable history)
// ============================================

export type DialogRole = 'user' | 'assistant' | 'system';

export interface DialogMessage {
  role: DialogRole;
  content: string;
  timestamp: string;
}

export type DialogHistory = DialogMessage[];

// ============================================
// Sequence Format (Request/Response pairs)
// ============================================

export interface SequenceEntry {
  request: unknown;
  response: unknown;
  timestamp: string;
}

export type SequenceHistory = SequenceEntry[];

// ============================================
// Session Index
// ============================================

export interface SessionIndexEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  path: string;
}

export interface SessionIndex {
  sessions: SessionIndexEntry[];
}

// ============================================
// Complete Session Object
// ============================================

export interface Session {
  metadata: SessionMetadata;
  dialog: DialogHistory;
  sequence: SequenceHistory;
}

// ============================================
// Session Manager Configuration
// ============================================

export interface SessionManagerConfig {
  storagePath?: string;
  generateId?: () => string;
}
