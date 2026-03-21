/**
 * Shared execute.form detection (load before session-data.js).
 */
(function (global) {
    'use strict';

    /**
     * True when execute asks for user input (choices/input), excluding wait-only steps.
     * @param {object|null|undefined} ex
     * @returns {boolean}
     */
    function executeHasActionableForm(ex) {
        if (!ex || !ex.form || ex.wait) return false;
        var f = ex.form;
        if (f.choices && f.choices.length > 0) return true;
        if (f.input == null) return false;
        if (Array.isArray(f.input)) return f.input.length > 0;
        return true;
    }

    global.executeHasActionableForm = executeHasActionableForm;
})(typeof window !== 'undefined' ? window : globalThis);
