import { logger } from '../utils/logger.js';
// @ts-ignore
import { Loro } from 'loro-crdt';

export class StateConvergence {
  private doc: any;

  constructor() {
    this.doc = new Loro();
  }

  updateState(key: string, value: any) {
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
