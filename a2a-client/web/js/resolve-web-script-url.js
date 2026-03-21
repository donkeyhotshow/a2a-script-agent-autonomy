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

    global.resolveWebScriptUrl = resolveWebScriptUrl;
    global.isWebScriptInjected = isWebScriptInjected;
})(typeof window !== 'undefined' ? window : globalThis);
