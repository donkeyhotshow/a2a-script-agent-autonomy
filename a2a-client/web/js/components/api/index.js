/**
 * API Module Index - главный файл для импорта всех API модулей
 * 
 * Использование:
 * <script src="js/components/api/api-client.js"></script>
 * <script src="js/components/api/api-endpoints.js"></script>
 * <script src="js/components/api/api-request.js"></script>
 * <script src="js/components/api/api-response.js"></script>
 * <script src="js/components/api/api-client-actions.js"></script>
 * <script src="js/components/api/index.js"></script>
 * <script src="js/components/ai-actions-api.js"></script>
 */

// Re-export all mixins for convenience
(function (global) {
    'use strict';

    // Collect all mixins
    global.ApiMixins = {
        apiClient: global.createApiClient,
        apiEndpoints: global.API_ENDPOINTS,
        buildEndpointUrl: global.buildEndpointUrl,
        mixinApiRequest: global.mixinApiRequest,
        mixinApiResponse: global.mixinApiResponse,
        mixinClientActions: global.mixinClientActions
    };

})(typeof window !== 'undefined' ? window : globalThis);
