/**
 * Browser-compatible ServicesModel
 * Мок для браузерного окружения
 */

import { BaseModel } from '../core/BaseModel.browser.js';

export class ServicesModel extends BaseModel {
  constructor(data = {}) {
    super(data);
    this.type = 'services';
  }

  async getServices() {
    return Promise.resolve([]);
  }

  async createService(serviceData) {
    return Promise.resolve({ id: Date.now().toString(), ...serviceData });
  }

  async updateService(id, updates) {
    return Promise.resolve({ id, ...updates });
  }

  async deleteService(id) {
    return Promise.resolve(true);
  }
}
