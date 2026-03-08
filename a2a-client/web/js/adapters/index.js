/**
 * Session Store Adapters Index
 * Unified export for all adapter modules
 * 
 * Usage:
 * <script src="js/adapters/session-viewmodel-adapter.js"></script>
 * <script src="js/adapters/session-manager-adapter.js"></script>
 * <script src="js/adapters/ai-actions-integration.js"></script>
 * <script src="js/session-store-adapters.js"></script>
 */

// All adapters are loaded as separate script files
// This index provides a clear entry point and documents the module structure

if (typeof window !== 'undefined') {
    window.SessionStoreAdapters = window.SessionStoreAdapters || {
        // Placeholder - actual adapters are loaded from individual files
        loaded: true,
        version: '2.0.0'
    };
}
