const { sessionVars } = require('C:/apps/libs/system/session-vars/index.cjs'); // Обновлено для корректного разрешения модуля
const { PathUtils } = require('C:/apps/libs/system/path-utils/index.js');

const pathUtils = new PathUtils(); // Создаем экземпляр PathUtils

const DEFAULT_WORKDIR_ENV = 'MCP_WORKDIR';

let launchDir = process.env.INIT_CWD || process.cwd();
let currentDir = null;
let initialized = false;

async function resolveDefaultWorkdir() {
  // Сначала проверяем переменную сессии
  const sessionWorkspace = sessionVars.getProjectWorkspace();
  if (sessionWorkspace) {
    try {
      const expanded = pathUtils.resolve(expandPath(sessionWorkspace)); // Использование экземпляра
      return expanded;
    } catch {}
  }
  
  // Затем проверяем переменные окружения
  const envCandidates = [
    process.env[DEFAULT_WORKDIR_ENV]
  ].filter((v) => typeof v === 'string' && v.trim().length > 0);
  for (const envPath of envCandidates) {
    try {
      const expanded = pathUtils.resolve(expandPath(envPath)); // Использование экземпляра
      return expanded;
    } catch {}
  }
  return launchDir;
}

function expandPath(p) {
  // Expand ~ and %VAR% or $VAR
  let out = p;
  if (out.startsWith('~')) {
    out = pathUtils.join(require('os').homedir(), out.slice(1)); // Использование экземпляра
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
    const entries = new Set((await pathUtils.readdir(dir)).map(entry => entry.name)); // Использование экземпляра
    for (const marker of PROJECT_MARKERS) {
      if (entries.has(marker)) return true;
    }
  } catch {}
  return false;
}

async function findProjectRoot(startDir) {
  try {
    let dir = pathUtils.resolve(startDir); // Использование экземпляра
    // If startDir is a file, use its parent
    try { const st = await pathUtils.stat(dir); if (st.isFile) dir = pathUtils.getDirname(dir); } catch {} // Использование экземпляра
    while (true) {
      if (await isProjectRoot(dir)) return dir;
      const parent = pathUtils.getDirname(dir); // Использование экземпляра
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
    const hasExplicit = sessionVars.hasProjectWorkspace() || Boolean(process.env[DEFAULT_WORKDIR_ENV]);
    
    // Если установлена рабочая папка через сессию, принудительно переходим в неё
    if (sessionVars.hasProjectWorkspace()) {
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
    const rel = pathUtils.getRelativePath(child, parent);
    return !!rel && !rel.startsWith('..') && !pathUtils.isAbsolute(rel);
  } catch { return false; }
}

function safeGetCwd() { try { return process.cwd(); } catch { return launchDir; } }

function getLaunchDir() { return launchDir; }
async function getCurrentDir() { await ensureInitialized(); return currentDir || safeGetCwd(); }
function getCurrentDirSync() { return currentDir || safeGetCwd(); }
async function setCurrentDir(newPath) {
  try {
    const resolved = pathUtils.resolve(expandPath(newPath)); // Использование экземпляра
    process.chdir(resolved);
    currentDir = resolved;
    return { ok: true, path: currentDir };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}
async function getProjectRoot() {
  await ensureInitialized();
  const fromCurrent = await findProjectRoot(await getCurrentDir());
  return fromCurrent || await getCurrentDir();
}
function getConsumerId() {
  const id = sessionVars.getProjectWorkspace();
  return (typeof id === 'string' && id.trim().length > 0) ? id : null;
}

export { getLaunchDir, 
  getCurrentDir, 
  getCurrentDirSync,
  setCurrentDir, 
  expandPath, 
  getProjectRoot, 
  getConsumerId, 
  resetInitialization,
  // Внутренние функции для тестирования
  isProjectRoot,
  findProjectRoot,
  resolveDefaultWorkdir };
