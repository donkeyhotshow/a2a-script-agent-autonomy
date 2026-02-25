const { ValidationUtils } = require('C:/apps/libs/validation/validation/index.cjs');
const { FileSystemUtils } = require('../../../libs/app-framework/core/file-utils/file-system');
const fileSystemUtils = new FileSystemUtils();
const { errorUtils } = require('@libs/error-management/error-handler/error-utils.cjs');
// Фиксируем путь к истории
const HISTORY_CJS_PATH = 'C:/apps/libs/system/history/index.cjs';
// Ленивый импорт SessionManager для избежания циклической зависимости
let SessionManager = null;
const getSessionManager = () => {
  if (!SessionManager) {
    SessionManager = require(HISTORY_CJS_PATH).SessionManager;
  }
  return SessionManager;
};
const path = require('path');
const fsPromises = require('fs/promises');

const DEFAULT_WORKDIR_ENV = 'MCP_WORKDIR';

let launchDir = process.env.INIT_CWD || process.cwd();
let currentDir = null;
let initialized = false;

async function resolveDefaultWorkdir() {
  // Сначала проверяем переменную сессии
  const sessionWorkspace = getSessionManager().getCurrentSessionId();
  if (sessionWorkspace) {
    const resolvedSessionWorkspace = await errorUtils.safeExecute(async () => {
      const expanded = fileSystemUtils.resolve(expandPath(sessionWorkspace));
      return expanded;
    });
    if (resolvedSessionWorkspace) return resolvedSessionWorkspace;
  }
  
  // Затем проверяем переменные окружения
  const envCandidates = [
    process.env[DEFAULT_WORKDIR_ENV]
  ].filter((v) => typeof v === 'string' && v.trim().length > 0);
  for (const envPath of envCandidates) {
    try {
      const expanded = fileSystemUtils.resolve(expandPath(envPath));
      return expanded;
    } catch {}
  }
  return launchDir;
}

function expandPath(p) {
  // Expand ~ and %VAR% or $VAR
  let out = p;
  if (out.startsWith('~')) {
    out = fileSystemUtils.join(require('os').homedir(), out.slice(1));
  }
  out = out.replace(/%([^%]+)%/g, (_, n) => process.env[n] || '');
  out = out.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, n) => process.env[n] || '');
  return out;
}

const PROJECT_MARKERS = [
  '.git', 'package.json', 'pnpm-workspace.yaml', 'yarn.lock', 'package-lock.json',
  'pyproject.toml', 'requirements.txt', 'Pipfile', 'poetry.lock',
  'go.mod', 'Cargo.toml', 'composer.json', 'pom.xml', 'build.gradle', 'build.gradle.kts',
  '.sln', 'Makefile', 'Dockerfile'
];

async function isProjectRoot(dir) {
  try {
    const entries = new Set((await fsPromises.readdir(dir)).map(entry => entry.name));
    for (const marker of PROJECT_MARKERS) {
      if (entries.has(marker)) return true;
    }
  } catch {}
  return false;
}

async function findProjectRoot(startDir) {
  try {
    let dir = fileSystemUtils.resolve(startDir);
    // If startDir is a file, use its parent
    try { const st = await fsPromises.stat(dir); if (st.isFile()) dir = fileSystemUtils.getDirname(dir); } catch {}
    while (true) {
      if (await isProjectRoot(dir)) return dir;
      const parent = fileSystemUtils.getDirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {}
  return null;
}

async function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  try {
    const desired = await resolveDefaultWorkdir();
    const hasExplicit = !!getSessionManager().getCurrentSessionId() || Boolean(process.env[DEFAULT_WORKDIR_ENV]);
    
    // Если установлена рабочая папка через сессию, принудительно переходим в неё
    if (!!getSessionManager().getCurrentSessionId()) {
      try { 
        process.chdir(desired); 
        currentDir = desired; 
      } catch { 
        currentDir = safeGetCwd(); 
      }
    } else {
      // Иначе используем старую логику
      const base = hasExplicit ? desired : ((await findProjectRoot(desired)) || desired);
      const cwdNow = safeGetCwd();
      if (!isInside(base, cwdNow)) {
        try { process.chdir(base); currentDir = base; } catch { currentDir = cwdNow; }
      } else {
        currentDir = cwdNow;
      }
    }
  } catch { currentDir = safeGetCwd(); }
}

function resetInitialization() {
  initialized = false;
  currentDir = null;
}

function isInside(parent, child) {
  try {
    const rel = path.relative(parent, child);
    return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  } catch { return false; }
}

function safeGetCwd() { try { return process.cwd(); } catch { return launchDir; } }

function getLaunchDir() { return launchDir; }
async function getCurrentDir() { await ensureInitialized(); return currentDir || safeGetCwd(); }

// Синхронная версия для использования в синхронных контекстах
function getCurrentDirSync() { 
  if (!initialized) {
    // Инициализируем синхронно
    try {
      const desired = process.env[DEFAULT_WORKDIR_ENV] || launchDir;
      currentDir = desired;
      initialized = true;
    } catch {
      currentDir = safeGetCwd();
      initialized = true;
    }
  }
  return currentDir || safeGetCwd(); 
}

async function setCurrentDir(newPath) {
  const result = await errorUtils.safeExecute(async () => {
    const resolved = fileSystemUtils.resolve(expandPath(newPath));
    process.chdir(resolved);
    currentDir = resolved;
    return { ok: true, path: currentDir };
  });
  return result || { ok: false, path: currentDir, error: 'Failed to set directory' };
}
async function getProjectRoot() {
  await ensureInitialized();
  const fromCurrent = await findProjectRoot(await getCurrentDir());
  return fromCurrent || await getCurrentDir();
}
function getConsumerId() {
  const id = getSessionManager().getCurrentSessionId();
  return (typeof id === 'string' && id.trim().length > 0) ? id : null;
}

module.exports = { getLaunchDir, getCurrentDir, getCurrentDirSync, setCurrentDir, expandPath, getProjectRoot, getConsumerId, resetInitialization };


