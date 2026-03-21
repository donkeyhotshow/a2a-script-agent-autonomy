/**
 * Web daemon — poll Client API (via injected checkFn) until promise completes or fails.
 */
(function (global) {
    'use strict';

    const root = global.__a2aDaemons || (global.__a2aDaemons = {});
    const createEventEmitter = root.createEventEmitter;
    if (!createEventEmitter) {
        console.error('[dialog-promise-poll] Load js/daemons/emitter.js first');
        return;
    }

    const PROMISE_POLL_INTERVAL = 5000;
    root.PROMISE_POLL_INTERVAL = PROMISE_POLL_INTERVAL;

    root.createDialogPromise = function createDialogPromise() {
        let promiseId = null;
        let pending = false;
        let status = null;
        let pollTimer = null;
        const emitter = createEventEmitter();

        return {
            getState: () => ({ promiseId, pending, status }),
            get isPending() {
                return pending;
            },
            get promiseId() {
                return promiseId;
            },
            setPending: function (p) {
                pending = p;
                emitter.emit('promisePending', p);
                return this;
            },
            setPromiseId: function (pid) {
                promiseId = pid;
                if (pid) {
                    pending = true;
                    status = 'pending';
                } else {
                    pending = false;
                    status = null;
                }
                emitter.emit('promiseId', pid);
                emitter.emit('promisePending', pending);
                return this;
            },
            setStatus: function (s) {
                status = s;
                emitter.emit('status', s);
                return this;
            },
            startPolling: function (checkFn) {
                if (!promiseId) return this;
                this._stopPolling();
                pollTimer = setInterval(async () => {
                    try {
                        const result = await checkFn(promiseId);
                        if (!result) return;
                        if (result.completed || result.status === 'completed' || result.status === 'done') {
                            this._stopPolling();
                            this.setPending(false);
                            this.setStatus('completed');
                            emitter.emit('resolved', { promiseId, result: result.result, execute: result.execute });
                        }
                        if (result.status === 'failed' || result.status === 'error') {
                            this._stopPolling();
                            this.setPending(false);
                            this.setStatus('failed');
                            emitter.emit('rejected', { promiseId, error: result.error || 'Promise failed' });
                        }
                    } catch (err) {
                        console.error('[DialogPromise] Polling error:', err);
                        emitter.emit('error', { promiseId, error: err });
                    }
                }, PROMISE_POLL_INTERVAL);
                return this;
            },
            _stopPolling: function () {
                if (pollTimer) {
                    clearInterval(pollTimer);
                    pollTimer = null;
                }
                return this;
            },
            stopPolling: function () {
                return this._stopPolling();
            },
            reset: function () {
                this._stopPolling();
                promiseId = null;
                pending = false;
                status = null;
                emitter.emit('promisePending', false);
                emitter.emit('reset');
                return this;
            },
            on: (...args) => emitter.on(...args),
            off: (...args) => emitter.off(...args),
            destroy: function () {
                this._stopPolling();
            },
        };
    };
})(typeof window !== 'undefined' ? window : globalThis);
