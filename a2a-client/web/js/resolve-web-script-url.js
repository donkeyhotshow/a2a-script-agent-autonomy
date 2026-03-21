/**
 * Shared URL resolver for script src under <base id="app-base">.
 */
(function (global) {
    'use strict';

    function resolveWebScriptUrl(relativePath) {
        var baseEl = document.getElementById('app-base');
        var baseHref = (baseEl && baseEl.href) ? baseEl.href : document.baseURI;
        var path = relativePath.replace(/^\//, '');
        try {
            return new URL(path, baseHref).href;
        } catch (e) {
            return '/' + path;
        }
    }

    /**
     * @param {string} relativePath
     * @param {string} [resolvedAbsolute] from resolveWebScriptUrl(rel)
     */
    function isWebScriptInjected(relativePath, resolvedAbsolute) {
        var rel = String(relativePath || '').replace(/"/g, '');
        if (document.querySelector('script[src*="' + rel + '"]')) return true;
        if (resolvedAbsolute) {
            var abs = String(resolvedAbsolute).replace(/"/g, '');
            if (document.querySelector('script[src="' + abs + '"]')) return true;
        }
        return false;
    }

    /**
     * Inject a classic script once; resolves when loaded (or immediately if already present).
     * @param {string} relativePath
     * @param {{ onload?: () => void }} [hooks]
     * @returns {Promise<void>}
     */
    function appendWebScriptOnce(relativePath, hooks) {
        return new Promise(function (resolve, reject) {
            var rel = String(relativePath || '');
            var resolved = resolveWebScriptUrl(rel);
            if (isWebScriptInjected(rel, resolved)) {
                if (hooks && hooks.onload) hooks.onload();
                resolve();
                return;
            }
            var script = document.createElement('script');
            script.src = resolved;
            script.onload = function () {
                if (hooks && hooks.onload) hooks.onload();
                resolve();
            };
            script.onerror = function () {
                reject(new Error('Failed to load ' + rel));
            };
            document.head.appendChild(script);
        });
    }

    global.resolveWebScriptUrl = resolveWebScriptUrl;
    global.isWebScriptInjected = isWebScriptInjected;
    global.appendWebScriptOnce = appendWebScriptOnce;
})(typeof window !== 'undefined' ? window : globalThis);
