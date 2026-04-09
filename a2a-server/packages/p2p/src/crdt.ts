import { logger } from '../../lib/logger.js';
import { Loro } from 'loro-crdt';

export class StateConvergence {
  private doc: any; // Using any for Loro since proper typings are complex

  constructor() {
    this.doc = new Loro();
  }

  updateState(key: string, value: unknown) {
    const map = this.doc.getMap('session_state');
    map.set(key, value);
    logger.info('[CRDT] State updated', { key });
  }

  applyRemoteUpdate(update: Uint8Array) {
    this.doc.importUpdate(update);
    logger.info('[CRDT] Remote update applied');
  }

  exportUpdate(): Uint8Array {
    return this.doc.exportUpdates();
  }

  getState() {
    return this.doc.getMap('session_state').toJSON();
  }
}

export const stateConvergence = new StateConvergence();
