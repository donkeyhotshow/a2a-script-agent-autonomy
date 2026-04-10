/**
 * Shared URL resolver for script src under <base id="app-base">.
 */
(function (global) {
    'use strict';

    function normalizeRelativePath(relativePath) {
        var value = relativePath ?? '';
        var normalized = String(value).trim();
        if (!normalized) {
            var errMsg = '[resolveWebScriptUrl] relativePath is required';
            console.error(errMsg, relativePath);
            throw new Error(errMsg);
        }
        return normalized;
    }

    function resolveWebScriptUrl(relativePath) {
        var baseEl = document.getElementById('app-base');
        var baseHref = (baseEl && baseEl.href) ? baseEl.href : document.baseURI;
        var path = normalizeRelativePath(relativePath).replace(/^\//, '');
        try {
            return new URL(path, baseHref).href;
        } catch (e) {
            console.error('[resolveWebScriptUrl] Invalid path:', relativePath, e);
            throw e;
        }
    }

    /**
     * @param {string} relativePath
     * @param {string} [resolvedAbsolute] from resolveWebScriptUrl(rel)
     */
    function isWebScriptInjected(relativePath, resolvedAbsolute) {
        var rel = normalizeRelativePath(relativePath).replace(/"/g, '');
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
            var rel = normalizeRelativePath(relativePath);
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

    /**
     * Inject an ES module script once; resolves when evaluated.
     * @param {string} relativePath
     * @param {{ onload?: () => void }} [hooks]
     * @returns {Promise<void>}
     */
    function appendWebModuleOnce(relativePath, hooks) {
        return new Promise(function (resolve, reject) {
            var rel = normalizeRelativePath(relativePath);
            var resolved = resolveWebScriptUrl(rel);
            var safe = rel.replace(/"/g, '');
            if (document.querySelector('script[type="module"][data-a2a-module="' + safe + '"]')) {
                if (hooks && hooks.onload) hooks.onload();
                resolve();
                return;
            }
            var script = document.createElement('script');
            script.type = 'module';
            script.dataset.a2aModule = rel;
            script.src = resolved;
            script.onload = function () {
                if (hooks && hooks.onload) hooks.onload();
                resolve();
            };
            script.onerror = function () {
                reject(new Error('Failed to load module ' + rel));
            };
            document.head.appendChild(script);
        });
    }

    global.resolveWebScriptUrl = resolveWebScriptUrl;
    global.isWebScriptInjected = isWebScriptInjected;
    global.appendWebScriptOnce = appendWebScriptOnce;
    global.appendWebModuleOnce = appendWebModuleOnce;
})(typeof window !== 'undefined' ? window : globalThis);
