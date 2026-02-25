/**
 * CommonJS wrapper for workdir-utils ES module
 */

// CommonJS implementation
const fs = require('fs');
const path = require('path');
const os = require('os');

let currentDir = null;
let launchDir = null;
let consumerId = null;
let initialized = false;

function safeGetCwd() {
  try {
    return process.cwd();
  } catch (error) {
    // Fallback to a safe directory
    return os.tmpdir();
  }
}

function getLaunchDir() {
  if (!launchDir) {
    launchDir = safeGetCwd();
  }
  return launchDir;
}

function getCurrentDir() {
  return new Promise((resolve) => {
    if (currentDir) {
      resolve(currentDir);
    } else {
      resolve(safeGetCwd());
    }
  });
}

function getCurrentDirSync() {
  return currentDir || safeGetCwd();
}

function setCurrentDir(dir) {
  if (typeof dir === 'string' && dir.trim()) {
    try {
      // Validate that directory exists
      if (fs.existsSync(dir)) {
        currentDir = path.resolve(dir);
        return true;
      }
    } catch (error) {
      // Ignore validation errors
    }
  }
  return false;
}

function expandPath(inputPath) {
  if (typeof inputPath !== 'string') return inputPath;

  // Expand ~ to home directory
  if (inputPath.startsWith('~')) {
    const homeDir = os.homedir();
    inputPath = path.join(homeDir, inputPath.slice(1));
  }

  // Resolve relative paths
  if (!path.isAbsolute(inputPath)) {
    inputPath = path.resolve(getCurrentDirSync(), inputPath);
  }

  return path.normalize(inputPath);
}

function findProjectRoot(startDir = getCurrentDirSync()) {
  let current = startDir;
  const root = path.parse(startDir).root;

  while (current !== root) {
    // Check for common project markers
    const markers = ['package.json', '.git', 'tsconfig.json', 'Cargo.toml', 'pyproject.toml'];
    for (const marker of markers) {
      if (fs.existsSync(path.join(current, marker))) {
        return current;
      }
    }
    current = path.dirname(current);
  }

  return startDir; // Fallback to start directory
}

function getProjectRoot() {
  return findProjectRoot(getCurrentDirSync());
}

function getConsumerId() {
  if (!consumerId) {
    try {
      consumerId = `consumer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } catch (error) {
      consumerId = 'anonymous_consumer';
    }
  }
  return consumerId;
}

function resetInitialization() {
  currentDir = null;
  launchDir = null;
  consumerId = null;
  initialized = false;
}

function isProjectRoot(dir = getCurrentDirSync()) {
  return findProjectRoot(dir) === dir;
}

function resolveDefaultWorkdir() {
  // Try to find project root first
  const projectRoot = getProjectRoot();
  if (projectRoot !== getCurrentDirSync()) {
    return projectRoot;
  }

  // Fallback to current directory
  return getCurrentDirSync();
}

module.exports = {
  getCurrentDir,
  setCurrentDir,
  expandPath,
  getCurrentDirSync,
  getProjectRoot,
  getLaunchDir,
  getConsumerId,
  resetInitialization,
  isProjectRoot,
  findProjectRoot,
  resolveDefaultWorkdir
};
