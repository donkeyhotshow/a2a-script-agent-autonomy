/**
 * Session Manager Service
 * Manages A2A client sessions with filesystem persistence
 * This is a local implementation that mirrors the SessionManager from api-client
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {AppError} from '../types/errors.js';

// ============================================
// Types
// ============================================

export interface SessionMetadata {
    id: string;
    createdAt: string;
    updatedAt: string;
    title: string;
}

export type DialogRole = 'user' | 'assistant' | 'system';

export interface DialogMessage {
    role: DialogRole;
    content: string;
    timestamp: string;
}

export type DialogHistory = DialogMessage[];

export interface SequenceEntry {
    request: unknown;
    response: unknown;
    timestamp: string;
}

export type SequenceHistory = SequenceEntry[];

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

export interface Session {
    metadata: SessionMetadata;
    dialog: DialogHistory;
    sequence: SequenceHistory;
}

// ============================================
// Helper Functions
// ============================================

function generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `sess_${timestamp}_${random}`;
}

function formatTimestamp(date: Date = new Date()): string {
    return date.toISOString();
}

// ============================================
// Session Manager Class
// ============================================

class SessionManagerService {
    private storagePath: string;
    private sessionsPath: string;
    private indexPath: string;
    private generateId: () => string;
    private sessionsCache: Map<string, Session> = new Map();

    constructor() {
        this.storagePath = path.resolve(process.cwd(), 'storage');
        this.sessionsPath = path.join(this.storagePath, 'sessions');
        this.indexPath = path.join(this.sessionsPath, 'index.json');
        this.generateId = generateSessionId;
    }

    async initialize(): Promise<void> {
        await fs.mkdir(this.sessionsPath, {recursive: true});

        try {
            await fs.access(this.indexPath);
        } catch {
            await this.saveIndex({sessions: []});
        }
    }

    private getSessionDir(sessionId: string): string {
        return path.join(this.sessionsPath, sessionId);
    }

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

    private async saveSessionFile(sessionId: string, filename: string, data: unknown): Promise<void> {
        const sessionDir = this.getSessionDir(sessionId);
        await fs.writeFile(
            path.join(sessionDir, filename),
            JSON.stringify(data, null, 2),
            'utf-8'
        );
    }

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

    private async loadIndex(): Promise<SessionIndex> {
        try {
            const data = await fs.readFile(this.indexPath, 'utf-8');
            return JSON.parse(data) as SessionIndex;
        } catch {
            return {sessions: []};
        }
    }

    private async saveIndex(index: SessionIndex): Promise<void> {
        await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
    }

    private async addToIndex(entry: SessionIndexEntry): Promise<void> {
        const index = await this.loadIndex();
        index.sessions.push(entry);
        await this.saveIndex(index);
    }

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
    // Public API
    // ============================================

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

        const sessionDir = this.getSessionDir(sessionId);
        await fs.mkdir(sessionDir, {recursive: true});
        await fs.mkdir(path.join(sessionDir, 'attachments'), {recursive: true});

        await this.saveSessionFiles(sessionId, session);

        await this.addToIndex({
            id: sessionId,
            title: sessionTitle,
            createdAt: timestamp,
            updatedAt: timestamp,
            path: sessionDir,
        });

        this.sessionsCache.set(sessionId, session);

        return metadata;
    }

    async getSession(sessionId: string): Promise<Session | null> {
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

    async saveSession(sessionId: string): Promise<boolean> {
        const session = this.sessionsCache.get(sessionId);
        if (!session) {
            return false;
        }

        try {
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

    async addMessage(sessionId: string, role: DialogRole, content: string): Promise<boolean> {
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

        this.sessionsCache.set(sessionId, session);

        await this.saveSessionFile(sessionId, 'dialog.json', session.dialog);
        await this.updateIndexEntry(sessionId, {
            updatedAt: session.metadata.updatedAt,
        });

        return true;
    }

    async addSequence(sessionId: string, request: unknown, response: unknown): Promise<boolean> {
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

        this.sessionsCache.set(sessionId, session);

        await this.saveSessionFile(sessionId, 'sequence.json', session.sequence);
        await this.updateIndexEntry(sessionId, {
            updatedAt: session.metadata.updatedAt,
        });

        return true;
    }

    async listSessions(): Promise<SessionIndexEntry[]> {
        const index = await this.loadIndex();
        return index.sessions;
    }

    async deleteSession(sessionId: string): Promise<boolean> {
        try {
            const sessionDir = this.getSessionDir(sessionId);
            await fs.rm(sessionDir, {recursive: true, force: true});

            const index = await this.loadIndex();
            index.sessions = index.sessions.filter((s) => s.id !== sessionId);
            await this.saveIndex(index);

            this.sessionsCache.delete(sessionId);

            return true;
        } catch {
            return false;
        }
    }

    getAttachmentsPath(sessionId: string): string {
        return path.join(this.getSessionDir(sessionId), 'attachments');
    }

    clearCache(): void {
        this.sessionsCache.clear();
    }
}

// ============================================
// Export singleton instance
// ============================================

export const sessionManager = new SessionManagerService();
