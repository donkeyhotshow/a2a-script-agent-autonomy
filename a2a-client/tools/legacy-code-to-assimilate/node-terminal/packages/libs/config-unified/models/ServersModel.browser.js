/**
 * Browser-compatible ServersModel
 * Мок для браузерного окружения
 */

import { BaseModel } from '../core/BaseModel.browser.js';

export class ServersModel extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.type = 'servers';
  }

  async getServers() {
    return Promise.resolve([]);
  }

  async createServer(serverData) {
    return Promise.resolve({ id: Date.now().toString(), ...serverData });
  }

  async updateServer(id, updates) {
    return Promise.resolve({ id, ...updates });
  }

  async deleteServer(id) {
    return Promise.resolve(true);
  }
}
