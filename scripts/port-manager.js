import fs from 'fs';
import path from 'path';
import os from 'os';
import net from 'net';

const LOCK_DIR = path.join(os.homedir(), '.a2a', 'port-locks');

// Ensure lock directory exists
function ensureLockDir() {
  if (!fs.existsSync(LOCK_DIR)) {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
  }
}

// Check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

// Get lock file path for port
function getLockFilePath(port) {
  return path.join(LOCK_DIR, `port-${port}.lock`);
}

// Reserve a port for a service
export async function reservePort(port, serviceName) {
  ensureLockDir();

  const lockFile = getLockFilePath(port);

  // Check if already locked
  if (fs.existsSync(lockFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      // Check if the locking service is still running
      if (data.pid && isProcessRunning(data.pid)) {
        return false; // Port is locked by active service
      } else {
        // Clean up stale lock
        fs.unlinkSync(lockFile);
      }
    } catch (e) {
      // Invalid lock file, clean up
      fs.unlinkSync(lockFile);
    }
  }

  // Check if port is actually available
  if (!(await isPortAvailable(port))) {
    return false;
  }

  // Create lock file
  const lockData = {
    service: serviceName,
    port: port,
    pid: process.pid,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(lockFile, JSON.stringify(lockData, null, 2));
  return true;
}

// Release a port
export function releasePort(port) {
  const lockFile = getLockFilePath(port);
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }
}

// Check if process is running
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

// Clean up stale locks (for maintenance)
export function cleanupDeadLocks() {
  if (!fs.existsSync(LOCK_DIR)) return;

  const files = fs.readdirSync(LOCK_DIR);
  for (const file of files) {
    if (!file.startsWith('port-') || !file.endsWith('.lock')) continue;

    const lockFile = path.join(LOCK_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      if (data.pid && !isProcessRunning(data.pid)) {
        fs.unlinkSync(lockFile);
        console.log(`Cleaned up stale lock for port ${data.port}`);
      }
    } catch (e) {
      // Invalid lock file, remove it
      fs.unlinkSync(lockFile);
    }
  }
}

// List all locked ports
export function listLockedPorts() {
  if (!fs.existsSync(LOCK_DIR)) return [];

  const files = fs.readdirSync(LOCK_DIR);
  const locks = [];

  for (const file of files) {
    if (!file.startsWith('port-') || !file.endsWith('.lock')) continue;

    const lockFile = path.join(LOCK_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
      locks.push(data);
    } catch (e) {
      // Skip invalid files
    }
  }

  return locks;
}