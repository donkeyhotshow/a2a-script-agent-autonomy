/**
 * Modular TaskFlow Render Facade
 * 
 * This file serves as an aggregation point after the decomposition of the underlying
 * rendering modules into smaller, focused files:
 * - render-utils.js
 * - render-blocks.js
 * - render-form.js
 * - render-layout.js
 */

(function (global) {
    'use strict';

    if (!global.TaskFlowRender) {
        console.warn('[TaskFlowRender] Modules were missing. Did render-*.js load?');
        global.TaskFlowRender = {};
    }

    // TaskFlowRender properties are already attached by the sub-modules
    // so we don't strictly need to do anything here except for maintaining the file structure.

})(typeof window !== 'undefined' ? window : global);
