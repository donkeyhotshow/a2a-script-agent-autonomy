// Storage feature module
import {
  loadSession,
  saveSession,
  listSessions,
  deleteSession,
  kvGet,
  kvSet,
  kvDelete,
  kvKeys,
  loadProjects,
  saveProjects,
  loadAdrComplianceState,
  saveAdrComplianceState,
  getStorageRoot,
  getStorageKvRoot,
  getStorageSessionsRoot,
  ensureDir,
  normalizeSessionIdForDir,
  getNewSessionsDir,
  getNewSessionDir
} from '@a2a-client/storage';

export async function initialize(): Promise<void> {
  // Initialize storage components
  // Ensure storage directories exist
  ensureDir(getStorageKvRoot());
  ensureDir(getStorageSessionsRoot());
  console.log('Storage feature initialized');
}

export async function start(): Promise<void> {
  await initialize();
  console.log('Storage feature started');
}

export async function stop(): Promise<void> {
  // Cleanup if needed - storage functions are stateless
  console.log('Storage feature stopped');
}

// Export storage functions for use by other parts of the application
export {
  loadSession,
  saveSession,
  listSessions,
  deleteSession,
  kvGet,
  kvSet,
  kvDelete,
  kvKeys,
  loadProjects,
  saveProjects,
  loadAdrComplianceState,
  saveAdrComplianceState,
  getStorageRoot,
  getStorageKvRoot,
  getStorageSessionsRoot,
  ensureDir,
  normalizeSessionIdForDir,
  getNewSessionsDir,
  getNewSessionDir
};