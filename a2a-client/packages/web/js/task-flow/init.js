/**
 * TaskFlow Init - minimal entry for legacy helpers.
 * Operator UI owns layout/rendering; TaskFlow init only signals readiness.
 */

export function init() {
    // Operator UI owns the layout; TaskFlow modules are used as helpers/renderers.
    console.log('[TaskFlow] Ready (operator layout)');
}

// Back-compat global hook.
window.TaskFlow = window.TaskFlow || {};
window.TaskFlow.init = init;

// Auto-init when DOM is ready (safe no-op-ish).
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
