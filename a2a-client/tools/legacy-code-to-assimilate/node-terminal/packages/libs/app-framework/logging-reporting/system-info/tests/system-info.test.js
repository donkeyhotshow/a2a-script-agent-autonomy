/**
 * Тесты для SystemInfo
 * Библиотека system-info
 */

const { getSystemInfo } = require('../index');

describe('SystemInfo', () => {
  describe('getSystemInfo', () => {
    test('должен возвращать объект с системной информацией', () => {
      const info = getSystemInfo();

      expect(info).toHaveProperty('platform');
      expect(info).toHaveProperty('arch');
      expect(info).toHaveProperty('nodeVersion');
      expect(info).toHaveProperty('uptime');
      expect(info).toHaveProperty('memory');
      expect(info).toHaveProperty('cpu');
      expect(info).toHaveProperty('pid');
      expect(info).toHaveProperty('title');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('versions');
    });

    test('должен возвращать валидную платформу', () => {
      const info = getSystemInfo();
      expect(['win32', 'darwin', 'linux', 'freebsd', 'sunos']).toContain(info.platform);
    });

    test('должен возвращать валидную архитектуру', () => {
      const info = getSystemInfo();
      expect(['x64', 'arm64', 'ia32', 'arm', 'mips', 'mipsel', 'ppc64', 's390', 's390x']).toContain(info.arch);
    });

    test('должен возвращать валидную версию Node.js', () => {
      const info = getSystemInfo();
      expect(info.nodeVersion).toMatch(/^v\d+\.\d+\.\d+$/);
    });

    test('должен возвращать числовое значение uptime', () => {
      const info = getSystemInfo();
      expect(typeof info.uptime).toBe('number');
      expect(info.uptime).toBeGreaterThan(0);
    });

    test('должен возвращать объект memory с ожидаемыми полями', () => {
      const info = getSystemInfo();
      expect(info.memory).toHaveProperty('rss');
      expect(info.memory).toHaveProperty('heapTotal');
      expect(info.memory).toHaveProperty('heapUsed');
      expect(info.memory).toHaveProperty('external');
      expect(info.memory).toHaveProperty('arrayBuffers');
    });

    test('должен возвращать объект cpu с ожидаемыми полями', () => {
      const info = getSystemInfo();
      expect(info.cpu).toHaveProperty('user');
      expect(info.cpu).toHaveProperty('system');
    });

    test('должен возвращать числовое значение pid', () => {
      const info = getSystemInfo();
      expect(typeof info.pid).toBe('number');
      expect(info.pid).toBeGreaterThan(0);
    });

    test('должен возвращать объект versions', () => {
      const info = getSystemInfo();
      expect(typeof info.versions).toBe('object');
      expect(info.versions).toHaveProperty('node');
      expect(info.versions).toHaveProperty('v8');
    });
  });
});
