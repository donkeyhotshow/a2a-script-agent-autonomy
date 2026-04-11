import {
  rewindSessionAfterStep,
  rewindSessionLastStep,
} from '../../../a2a-client/packages/vite-plugin/storage/newSessions.js';
import { ensureA2aStorageEnvForDiskOps } from '../task-monitor-utils.js';

/**
 * @param {new () => unknown} Ctor
 */
export function applyTaskMonitorRewindDisk(Ctor) {
  Object.assign(Ctor.prototype, {
    /** @returns {number|null} */
    _envRewindToStep() {
      const raw =
        process.env.TASK_MONITOR_REWIND_TO_STEP ||
        process.env.TASK_MONITOR_RESUME_FROM_STEP ||
        process.env.TASK_MONITOR_KEEP_THROUGH_STEP;
      if (raw == null || String(raw).trim() === '') return null;
      const n = parseInt(String(raw).trim(), 10);
      return Number.isFinite(n) && n >= 1 ? n : null;
    },

    _envWantsResumeRewind() {
      const e = process.env;
      if (this._envRewindToStep() != null) return true;
      return (
        e.TASK_MONITOR_REWIND_LAST_STEP === '1' ||
        e.TASK_MONITOR_RESUME_REWIND_LAST_STEP === '1' ||
        e.TASK_MONITOR_RETRY_LAST_STEP === '1'
      );
    },

    /**
     * @param {string} sessionId
     * @param {string|null} taskName
     * @returns {{ skipped?: true } | { ok: true, removedStep: number } | { ok: false, reason: string }}
     */
    tryRewindSessionDiskStep(sessionId, taskName = null) {
      if (!this._envWantsResumeRewind()) {
        return { skipped: true };
      }
      ensureA2aStorageEnvForDiskOps();
      const cwd = process.env.A2A_CLIENT_STORAGE_DIR || process.cwd();
      const keepThrough = this._envRewindToStep();
      const r =
        keepThrough != null
          ? rewindSessionAfterStep(cwd, sessionId, keepThrough)
          : rewindSessionLastStep(cwd, sessionId);
      if (r.ok) {
        if (keepThrough != null) {
          this.log(
            'info',
            `[task-monitor] Rewound disk after step ${keepThrough} for ${sessionId} (removed=${(r.removedSteps || []).join(',') || '—'})`
          );
        } else {
          this.log('info', `[task-monitor] Rewound last disk step ${r.removedStep} for ${sessionId}`);
        }
        if (taskName) {
          this.state.taskSessions = this.state.taskSessions || {};
          const prev = this.state.taskSessions[taskName] || {};
          const resumeFromStep =
            keepThrough != null ? keepThrough : Math.max(1, (r.removedStep ?? 1) - 1);
          this.state.taskSessions[taskName] = {
            ...prev,
            sessionId,
            rewindRemovedStep:
              r.removedStep ??
              (Array.isArray(r.removedSteps) && r.removedSteps.length
                ? r.removedSteps[r.removedSteps.length - 1]
                : null),
            rewindRemovedSteps: r.removedSteps ?? null,
            resumeFromStep,
            lastRewindAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.saveState();
        }
      } else {
        this.log('warn', `[task-monitor] Rewind not applied: ${r.reason}`);
      }
      return r;
    },
  });
}
