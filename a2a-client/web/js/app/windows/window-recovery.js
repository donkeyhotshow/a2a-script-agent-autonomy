/**
 * Window Recovery - restores saved session windows with bounded concurrency.
 */
(function (global) {
    'use strict';

    const RESTORE_WINDOW_CONCURRENCY = 5;

    async function restoreSavedWindow(sessionId, createSessionWindow) {
        try {
            const sessionExists = await global.WindowSessionGateway.checkSessionExists(sessionId);
            if (sessionExists) {
                await createSessionWindow(sessionId);
            }
        } catch (error) {
            console.error('[WindowRecovery] Failed to restore window:', sessionId, error);
            global.ErrorHandler?.handle(error, { action: 'restoreSavedWindow', sessionId });
        }
    }

    async function restoreSessionWindows(createSessionWindow) {
        const registry = global.WindowRegistry;
        if (!registry || typeof createSessionWindow !== 'function') return;

        let savedWindows = [];
        try {
            savedWindows = await registry.loadSessionWindowsState();
        } catch (error) {
            console.error('[WindowRecovery] Failed to load saved windows list:', error);
            global.ErrorHandler?.handle(error, { action: 'restoreSessionWindows.loadState' });
            return;
        }
        if (!Array.isArray(savedWindows) || savedWindows.length === 0) {
            return;
        }

        const queue = savedWindows.slice();
        let restoreFailures = 0;
        while (queue.length > 0) {
            const batch = queue.splice(0, RESTORE_WINDOW_CONCURRENCY);
            const results = await Promise.allSettled(
                batch.map((sessionId) => restoreSavedWindow(sessionId, createSessionWindow))
            );
            restoreFailures += results.filter((r) => r.status === 'rejected').length;
        }
        if (restoreFailures > 0) {
            global.ErrorHandler?.handle(
                new Error(`[WindowRecovery] Failed to restore ${restoreFailures} window(s)`),
                { action: 'restoreSessionWindows.summary', restoreFailures }
            );
        }
    }

    global.WindowRecovery = {
        restoreSessionWindows
    };
})(typeof window !== 'undefined' ? window : globalThis);
