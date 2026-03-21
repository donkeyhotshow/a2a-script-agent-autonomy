/**
 * Web daemon — minimum loader display time and loader events.
 */
(function (global) {
    'use strict';

    const root = global.__a2aDaemons || (global.__a2aDaemons = {});
    const createEventEmitter = root.createEventEmitter;
    if (!createEventEmitter) {
        console.error('[dialog-loader] Load js/daemons/emitter.js first');
        return;
    }

    const MINIMUM_LOADER_TIME = root.timingMs('MIN_LOADER_MS');

    root.createDialogLoader = function createDialogLoader() {
        let active = false;
        let minEndTime = null;
        let timeoutId = null;
        const emitter = createEventEmitter();

        return {
            getState: () => ({ active, minEndTime, canHide: minEndTime && Date.now() >= minEndTime }),
            get isActive() {
                return active;
            },
            start: function () {
                if (active) return this;
                active = true;
                minEndTime = Date.now() + MINIMUM_LOADER_TIME;
                console.log('[DialogLoader] START - active:', active, 'minEndTime:', minEndTime);
                emitter.emit('loader', { active: true, minEndTime });
                return this;
            },
            /** @param {boolean} [force] — if true, hide immediately (e.g. server returned actionable form) */
            stop: function (force) {
                console.log('[DialogLoader] STOP requested - active:', active, 'minEndTime:', minEndTime, 'force:', !!force);
                if (force === true) {
                    this._forceStop();
                    return this;
                }
                const now = Date.now();
                const canHide = minEndTime === null || now >= minEndTime;
                if (canHide || !active) {
                    this._forceStop();
                } else {
                    if (timeoutId) clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => this._forceStop(), minEndTime - now);
                }
                return this;
            },
            _forceStop: function () {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                if (active) {
                    active = false;
                    minEndTime = null;
                    emitter.emit('loader', { active: false });
                }
            },
            reset: function () {
                this._forceStop();
                return this;
            },
            on: (...args) => emitter.on(...args),
            off: (...args) => emitter.off(...args),
            destroy: function () {
                this._forceStop();
            },
        };
    };
})(typeof window !== 'undefined' ? window : globalThis);
