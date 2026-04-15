/**
 * Session storage (step folders + session-index.json).
 * Split across session-*.js modules; this file re-exports the public API unchanged.
 */

export {
   clearStepSessionsParentRegistry,
   getNewSessionDir,
   getNewSessionsDir,
   getNewStepDir,
   getStepFilePath,
   listNewSteps,
   registerStepSessionsParent,
 } from './session-paths.ts';

export {
  deriveSessionMode,
  loadSessionIndex,
  reconcileSessionIndexFromDisk,
  saveSessionIndex,
} from './session-index-store.js';

export {
  deleteNewSession,
  findOpenAsyncStepWithoutResponse,
  getNewSessionLatestStep,
  listNewSessions,
  loadNewSession,
  rebuildSessionIndex,
  rewindSessionAfterStep,
  rewindSessionLastStep,
  saveNewSession,
} from './session-store.js';

export {
  dropStaleServerPromiseForStep,
  inferSubmitResultFromRequestToServerPayload,
  loadClientResult,
  loadNewStep,
  loadRequestToServer,
  loadServerPromise,
  loadServerResponse,
  loadStepFile,
  repairMissingClientResultForStep,
  saveClientResult,
  saveNewStep,
  saveRequestToServer,
  saveServerPromise,
  saveServerResponse,
  saveStepFile,
  validateSessionStorage,
  validateStepStorage,
} from './session-step-io.js';
