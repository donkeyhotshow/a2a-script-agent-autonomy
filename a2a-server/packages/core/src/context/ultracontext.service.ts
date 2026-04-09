import { logger } from '../../utils/logger.js';

export interface ContextVersion {
  versionId: number;
  timestamp: number;
  data: Record<string, any>;
  message: string;
}

export class UltraContextService {
  private sessions: Map<string, ContextVersion[]> = new Map();

  create(sessionId: string, initialData: Record<string, any> = {}): void {
    if (this.sessions.has(sessionId)) {
      logger.warn('[UltraContext] Session already exists, resetting', { sessionId });
    }
    
    this.sessions.set(sessionId, [{
      versionId: 0,
      timestamp: Date.now(),
      data: initialData,
      message: 'Initial state'
    }]);
  }

  append(sessionId: string, delta: Record<string, any>, message: string): number {
    const history = this.sessions.get(sessionId);
    if (!history) {
      throw new Error(`Session ${sessionId} not found in UltraContext`);
    }

    const lastVersion = history[history.length - 1];
    const newData = { ...lastVersion.data, ...delta };
    const newVersionId = lastVersion.versionId + 1;

    history.push({
      versionId: newVersionId,
      timestamp: Date.now(),
      data: newData,
      message
    });

    logger.info('[UltraContext] Appended version', { sessionId, versionId: newVersionId });
    return newVersionId;
  }

  getLatest(sessionId: string): Record<string, any> {
    const history = this.sessions.get(sessionId);
    if (!history) return {};
    return history[history.length - 1].data;
  }

  timeTravel(sessionId: string, versionId: number): void {
    const history = this.sessions.get(sessionId);
    if (!history) throw new Error(`Session ${sessionId} not found`);

    const versionIndex = history.findIndex(v => v.versionId === versionId);
    if (versionIndex === -1) throw new Error(`Version ${versionId} not found in session ${sessionId}`);

    // Truncate history to target version
    this.sessions.set(sessionId, history.slice(0, versionIndex + 1));
    logger.info('[UltraContext] Time traveled', { sessionId, toVersion: versionId });
  }

  getHistory(sessionId: string): ContextVersion[] {
    return this.sessions.get(sessionId) || [];
  }
}

export const ultraContextService = new UltraContextService();
