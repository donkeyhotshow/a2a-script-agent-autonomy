import { logger } from '@a2a/server-utils/logger';
import { deepCloneJson } from '../../../../../lib/deep-clone-json.js';
import crypto from 'node:crypto';
export class Ultracontext {
    snapshots = new Map();
    currentId = null;
    async commit(data, metadata) {
        const id = crypto.randomUUID();
        const snapshot = {
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
    async checkout(id) {
        const snapshot = this.snapshots.get(id);
        if (!snapshot) {
            throw new Error(`Snapshot ${id} not found`);
        }
        this.currentId = id;
        return deepCloneJson(snapshot.data);
    }
    diff(idA, idB) {
        const a = this.snapshots.get(idA);
        const b = this.snapshots.get(idB);
        if (!a || !b)
            throw new Error('One or both snapshots not found');
        // Simple diff implementation for demo/prototype
        // In production, we'd use a deep diff lib
        return {
            added: Object.keys(b.data).filter(k => !(k in a.data)),
            removed: Object.keys(a.data).filter(k => !(k in b.data)),
            changed: Object.keys(b.data).filter(k => k in a.data && JSON.stringify(a.data[k]) !== JSON.stringify(b.data[k]))
        };
    }
    getHistory() {
        const history = [];
        let curr = this.currentId;
        while (curr) {
            const s = this.snapshots.get(curr);
            if (!s)
                break;
            history.push(s);
            curr = s.parent || null;
        }
        return history;
    }
}
export const ultracontext = new Ultracontext();
//# sourceMappingURL=Ultracontext.js.map