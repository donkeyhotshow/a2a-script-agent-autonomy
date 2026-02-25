/**
 * Модуль для получения системной информации.
 */

function getSystemInfo() {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid,
    title: process.title,
    version: process.version,
    versions: process.versions,
  };
}

export { getSystemInfo, };
