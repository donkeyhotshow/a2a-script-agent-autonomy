const { getSystemInfo } = require('../index');

describe('system-info', () => {
  describe('getSystemInfo', () => {
    test('should return system information object with all required properties', () => {
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

    test('should return valid platform', () => {
      const info = getSystemInfo();
      expect(['win32', 'darwin', 'linux', 'freebsd', 'openbsd', 'sunos', 'aix'].includes(info.platform)).toBe(true);
    });

    test('should return valid architecture', () => {
      const info = getSystemInfo();
      expect(['x64', 'arm64', 'ia32', 'arm', 'mips', 'ppc', 's390'].includes(info.arch)).toBe(true);
    });

    test('should return valid Node.js version', () => {
      const info = getSystemInfo();
      expect(info.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
      expect(info.version).toMatch(/^v\d+\.\d+\.\d+/);
    });

    test('should return valid uptime', () => {
      const info = getSystemInfo();
      expect(typeof info.uptime).toBe('number');
      expect(info.uptime).toBeGreaterThanOrEqual(0);
    });

    test('should return valid memory usage object', () => {
      const info = getSystemInfo();
      expect(info.memory).toHaveProperty('rss');
      expect(info.memory).toHaveProperty('heapTotal');
      expect(info.memory).toHaveProperty('heapUsed');
      expect(info.memory).toHaveProperty('external');
      expect(info.memory).toHaveProperty('arrayBuffers');
      
      expect(typeof info.memory.rss).toBe('number');
      expect(typeof info.memory.heapTotal).toBe('number');
      expect(typeof info.memory.heapUsed).toBe('number');
      expect(typeof info.memory.external).toBe('number');
      expect(typeof info.memory.arrayBuffers).toBe('number');
    });

    test('should return valid CPU usage object', () => {
      const info = getSystemInfo();
      expect(info.cpu).toHaveProperty('user');
      expect(info.cpu).toHaveProperty('system');
      
      expect(typeof info.cpu.user).toBe('number');
      expect(typeof info.cpu.system).toBe('number');
    });

    test('should return valid process ID', () => {
      const info = getSystemInfo();
      expect(typeof info.pid).toBe('number');
      expect(info.pid).toBeGreaterThan(0);
    });

    test('should return valid process title', () => {
      const info = getSystemInfo();
      expect(typeof info.title).toBe('string');
      expect(info.title.length).toBeGreaterThan(0);
    });

    test('should return valid versions object', () => {
      const info = getSystemInfo();
      expect(typeof info.versions).toBe('object');
      expect(info.versions).toHaveProperty('node');
      expect(info.versions).toHaveProperty('v8');
      expect(info.versions).toHaveProperty('uv');
      expect(info.versions).toHaveProperty('zlib');
      expect(info.versions).toHaveProperty('brotli');
      expect(info.versions).toHaveProperty('ares');
      expect(info.versions).toHaveProperty('modules');
      expect(info.versions).toHaveProperty('nghttp2');
      expect(info.versions).toHaveProperty('napi');
      expect(info.versions).toHaveProperty('llhttp');
      expect(info.versions).toHaveProperty('openssl');
      expect(info.versions).toHaveProperty('cldr');
      expect(info.versions).toHaveProperty('icu');
      expect(info.versions).toHaveProperty('tz');
      expect(info.versions).toHaveProperty('unicode');
    });

    test('should return consistent data on multiple calls', () => {
      const info1 = getSystemInfo();
      const info2 = getSystemInfo();
      
      // Static properties should be the same
      expect(info1.platform).toBe(info2.platform);
      expect(info1.arch).toBe(info2.arch);
      expect(info1.nodeVersion).toBe(info2.nodeVersion);
      expect(info1.version).toBe(info2.version);
      expect(info1.pid).toBe(info2.pid);
      expect(info1.title).toBe(info2.title);
      
      // Dynamic properties may change
      expect(typeof info1.uptime).toBe('number');
      expect(typeof info2.uptime).toBe('number');
      expect(typeof info1.memory.rss).toBe('number');
      expect(typeof info2.memory.rss).toBe('number');
    });

    test('should return memory values in bytes', () => {
      const info = getSystemInfo();
      
      expect(info.memory.rss).toBeGreaterThan(0);
      expect(info.memory.heapTotal).toBeGreaterThan(0);
      expect(info.memory.heapUsed).toBeGreaterThan(0);
      expect(info.memory.external).toBeGreaterThanOrEqual(0);
      expect(info.memory.arrayBuffers).toBeGreaterThanOrEqual(0);
      
      // Heap used should not exceed heap total
      expect(info.memory.heapUsed).toBeLessThanOrEqual(info.memory.heapTotal);
    });

    test('should return CPU usage in microseconds', () => {
      const info = getSystemInfo();
      
      expect(info.cpu.user).toBeGreaterThanOrEqual(0);
      expect(info.cpu.system).toBeGreaterThanOrEqual(0);
    });
  });
});
