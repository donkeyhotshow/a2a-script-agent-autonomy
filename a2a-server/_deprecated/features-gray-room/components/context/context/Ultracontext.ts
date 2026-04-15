import { logger } from '@a2a/server-utils/logger';
import { deepCloneJson } from '../../lib/deep-clone-json.js';
import crypto from 'node:crypto';

export interface ContextSnapshot {
  id: string;
  timestamp: number;
  data: any;
  parent?: string;
  metadata?: Record<string, any>;
}

export class Ultracontext {
  private snapshots: Map<string, ContextSnapshot> = new Map();
  private currentId: string | null = null;

  async commit(data: any, metadata?: Record<string, any>): Promise<string> {
    const id = crypto.randomUUID();
    const snapshot: ContextSnapshot = {
      id,
      timestamp: Date.now(),
      data: deepCloneJson(data),
      parent: this.currentId || undefined,
      metadata,
    };

    this.snapshots.set(id, snapshot);
    this.currentId = id;
    
    logger.info('[Ultracontext] Committed snapshot', { id, parent: snapshot.parent });
    return id;
  }

  async checkout(id: string): Promise<any> {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) {
      throw new Error(`Snapshot ${id} not found`);
    }
    this.currentId = id;
    return deepCloneJson(snapshot.data);
  }

  diff(idA: string, idB: string): any {
    const a = this.snapshots.get(idA);
    const b = this.snapshots.get(idB);
    if (!a || !b) throw new Error('One or both snapshots not found');
    
    // Simple diff implementation for demo/prototype
    // In production, we'd use a deep diff lib
    return {
      added: Object.keys(b.data).filter(k => !(k in a.data)),
      removed: Object.keys(a.data).filter(k => !(k in b.data)),
      changed: Object.keys(b.data).filter(k => k in a.data && JSON.stringify(a.data[k]) !== JSON.stringify(b.data[k]))
    };
  }

  getHistory(): ContextSnapshot[] {
    const history: ContextSnapshot[] = [];
    let curr = this.currentId;
    while (curr) {
      const s = this.snapshots.get(curr);
      if (!s) break;
      history.push(s);
      curr = s.parent || null;
    }
    return history;
  }
}

export const ultracontext = new Ultracontext();
