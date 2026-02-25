/**
 * Browser-compatible BaseModel
 * Мок для браузерного окружения
 */

export class BaseModel {
  constructor(data = {}) {
    this.data = { ...data };
    this.id = data.id || Date.now().toString();
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
  }

  save() {
    return Promise.resolve(this.data);
  }

  load() {
    return Promise.resolve(this.data);
  }

  delete(key) {
    delete this.data[key];
  }

  clear() {
    this.data = {};
  }

  validate() {
    return { valid: true, errors: [] };
  }

  toJSON() {
    return this.data;
  }
}
