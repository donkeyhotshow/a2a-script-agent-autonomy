/**
 * SessionManager - Manages A2A client sessions
 * Handles session creation, storage, and retrieval with dual format history
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Session,
  SessionMetadata,
  DialogMessage,
  DialogRole,
  SequenceEntry,
  SessionIndex,
  SessionIndexEntry,
  SessionManagerConfig,
} from './types/session.js';

/**
 * Generates a unique session ID based on timestamp and random suffix
 */
function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `sess_${timestamp}_${random}`;
}

/**
 * Formats a timestamp in ISO 8601 format
 */
function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Manages A2A client sessions with filesystem persistence
 *
 * Storage structure:
 * storage/sessions/
 *   ├── {sessionId}/
 *   │   ├── session.json      # metadata
 *   │   ├── dialog.json       # dialog format (human-readable)
 *   │   ├── sequence.json     # sequence format (request/response pairs)
 *   │   └── attachments/      # uploaded files
 *   └── index.json            # session index
 */
export class SessionManager {
  private storagePath: string;
  private sessionsPath: string;
  private indexPath: string;
  private generateId: () => string;
  private sessionsCache: Map<string, Session> = new Map();

  constructor(config: SessionManagerConfig = {}) {
    this.storagePath = config.storagePath ?? path.resolve(process.cwd(), 'storage');
    this.sessionsPath = path.join(this.storagePath, 'sessions');
    this.indexPath = path.join(this.sessionsPath, 'index.json');
    this.generateId = config.generateId ?? generateSessionId;
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initializes the session storage directory structure
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.sessionsPath, { recursive: true });

    // Ensure index file exists
    try {
      await fs.access(this.indexPath);
    } catch {
      await this.saveIndex({ sessions: [] });
    }
  }

  // ============================================
  // Session Lifecycle
  // ============================================

  /**
   * Creates a new session with unique ID
   * @param title - Optional session title (defaults to "Session {timestamp}")
   * @returns The created session metadata
   */
  async createSession(title?: string): Promise<SessionMetadata> {
    await this.initialize();

    const sessionId = this.generateId();
    const timestamp = formatTimestamp();
    const sessionTitle = title ?? `Session ${new Date().toLocaleString()}`;

    const metadata: SessionMetadata = {
      id: sessionId,
      createdAt: timestamp,
      updatedAt: timestamp,
      title: sessionTitle,
    };

    const session: Session = {
      metadata,
      dialog: [],
      sequence: [],
    };

    // Create session directory
    const sessionDir = this.getSessionDir(sessionId);
    await fs.mkdir(sessionDir, { recursive: true });
    await fs.mkdir(path.join(sessionDir, 'attachments'), { recursive: true });

    // Save session files
    await this.saveSessionFiles(sessionId, session);

    // Update index
    await this.addToIndex({
      id: sessionId,
      title: sessionTitle,
      createdAt: timestamp,
      updatedAt: timestamp,
      path: sessionDir,
    });

    // Cache session
    this.sessionsCache.set(sessionId, session);

    return metadata;
  }

  /**
   * Retrieves a session by ID
   * @param sessionId - The session ID
   * @returns The session object or null if not found
   */
  async getSession(sessionId: string): Promise<Session | null> {
    // Check cache first
    const cached = this.sessionsCache.get(sessionId);
    if (cached) {
      return cached;
    }

    try {
      const session = await this.loadSession(sessionId);
      if (session) {
        this.sessionsCache.set(sessionId, session);
      }
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Saves a session to disk
   * @param sessionId - The session ID
   * @returns True if saved successfully
   */
  async saveSession(sessionId: string): Promise<boolean> {
    const session = this.sessionsCache.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      // Update timestamp
      session.metadata.updatedAt = formatTimestamp();

      await this.saveSessionFiles(sessionId, session);
      await this.updateIndexEntry(sessionId, {
        updatedAt: session.metadata.updatedAt,
      });

      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Dialog Management
  // ============================================

  /**
   * Adds a message to the session dialog
   * @param sessionId - The session ID
   * @param role - Message role (user, assistant, system)
   * @param content - Message content
   * @returns True if added successfully
   */
  async addMessage(
    sessionId: string,
    role: DialogRole,
    content: string
  ): Promise<boolean> {
    let session = await this.getSession(sessionId);

    if (!session) {
      return false;
    }

    const message: DialogMessage = {
      role,
      content,
      timestamp: formatTimestamp(),
    };

    session.dialog.push(message);
    session.metadata.updatedAt = formatTimestamp();

    // Update cache
    this.sessionsCache.set(sessionId, session);

    // Auto-save dialog
    await this.saveSessionFile(sessionId, 'dialog.json', session.dialog);
    await this.updateIndexEntry(sessionId, {
      updatedAt: session.metadata.updatedAt,
    });

    return true;
  }

  // ============================================
  // Sequence Management
  // ============================================

  /**
   * Adds a request/response sequence to the session
   * @param sessionId - The session ID
   * @param request - The request data
   * @param response - The response data
   * @returns True if added successfully
   */
  async addSequence(
    sessionId: string,
    request: unknown,
    response: unknown
  ): Promise<boolean> {
    let session = await this.getSession(sessionId);

    if (!session) {
      return false;
    }

    const entry: SequenceEntry = {
      request,
      response,
      timestamp: formatTimestamp(),
    };

    session.sequence.push(entry);
    session.metadata.updatedAt = formatTimestamp();

    // Update cache
    this.sessionsCache.set(sessionId, session);

    // Auto-save sequence
    await this.saveSessionFile(sessionId, 'sequence.json', session.sequence);
    await this.updateIndexEntry(sessionId, {
      updatedAt: session.metadata.updatedAt,
    });

    return true;
  }

  // ============================================
  // File System Helpers
  // ============================================

  /**
   * Gets the session directory path
   */
  private getSessionDir(sessionId: string): string {
    return path.join(this.sessionsPath, sessionId);
  }

  /**
   * Saves all session files
   */
  private async saveSessionFiles(sessionId: string, session: Session): Promise<void> {
    const sessionDir = this.getSessionDir(sessionId);

    await Promise.all([
      fs.writeFile(
        path.join(sessionDir, 'session.json'),
        JSON.stringify(session.metadata, null, 2),
        'utf-8'
      ),
      fs.writeFile(
        path.join(sessionDir, 'dialog.json'),
        JSON.stringify(session.dialog, null, 2),
        'utf-8'
      ),
      fs.writeFile(
        path.join(sessionDir, 'sequence.json'),
        JSON.stringify(session.sequence, null, 2),
        'utf-8'
      ),
    ]);
  }

  /**
   * Saves a single session file
   */
  private async saveSessionFile(
    sessionId: string,
    filename: string,
    data: unknown
  ): Promise<void> {
    const sessionDir = this.getSessionDir(sessionId);
    await fs.writeFile(
      path.join(sessionDir, filename),
      JSON.stringify(data, null, 2),
      'utf-8'
    );
  }

  /**
   * Loads a session from disk
   */
  private async loadSession(sessionId: string): Promise<Session | null> {
    const sessionDir = this.getSessionDir(sessionId);

    try {
      const [metadataData, dialogData, sequenceData] = await Promise.all([
        fs.readFile(path.join(sessionDir, 'session.json'), 'utf-8'),
        fs.readFile(path.join(sessionDir, 'dialog.json'), 'utf-8'),
        fs.readFile(path.join(sessionDir, 'sequence.json'), 'utf-8'),
      ]);

      return {
        metadata: JSON.parse(metadataData) as SessionMetadata,
        dialog: JSON.parse(dialogData) as DialogMessage[],
        sequence: JSON.parse(sequenceData) as SequenceEntry[],
      };
    } catch {
      return null;
    }
  }

  // ============================================
  // Index Management
  // ============================================

  /**
   * Loads the session index
   */
  private async loadIndex(): Promise<SessionIndex> {
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8');
      return JSON.parse(data) as SessionIndex;
    } catch {
      return { sessions: [] };
    }
  }

  /**
   * Saves the session index
   */
  private async saveIndex(index: SessionIndex): Promise<void> {
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * Adds an entry to the index
   */
  private async addToIndex(entry: SessionIndexEntry): Promise<void> {
    const index = await this.loadIndex();
    index.sessions.push(entry);
    await this.saveIndex(index);
  }

  /**
   * Updates an entry in the index
   */
  private async updateIndexEntry(
    sessionId: string,
    updates: Partial<Omit<SessionIndexEntry, 'id' | 'path'>>
  ): Promise<void> {
    const index = await this.loadIndex();
    const entry = index.sessions.find((s) => s.id === sessionId);

    if (entry) {
      Object.assign(entry, updates);
      await this.saveIndex(index);
    }
  }

  // ============================================
  // Additional Utilities
  // ============================================

  /**
   * Lists all sessions from the index
   * @returns Array of session index entries
   */
  async listSessions(): Promise<SessionIndexEntry[]> {
    const index = await this.loadIndex();
    return index.sessions;
  }

  /**
   * Deletes a session
   * @param sessionId - The session ID to delete
   * @returns True if deleted successfully
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessionDir = this.getSessionDir(sessionId);
      await fs.rm(sessionDir, { recursive: true, force: true });

      // Remove from index
      const index = await this.loadIndex();
      index.sessions = index.sessions.filter((s) => s.id !== sessionId);
      await this.saveIndex(index);

      // Remove from cache
      this.sessionsCache.delete(sessionId);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the attachments directory path for a session
   * @param sessionId - The session ID
   * @returns Path to the attachments directory
   */
  getAttachmentsPath(sessionId: string): string {
    return path.join(this.getSessionDir(sessionId), 'attachments');
  }

  /**
   * Clears the session cache
   */
  clearCache(): void {
    this.sessionsCache.clear();
  }
}

export * from './types/session.js';
