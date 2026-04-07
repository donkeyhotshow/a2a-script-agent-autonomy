"use strict";
/**
 * @a2a/types - Shared TypeScript types for A2A packages
 * Shared between @a2a/client, @a2a/server, and other packages.
 *
 * Protocol types for new-request-flow: https://github.com/org-carrier/a2a-script-agent/tree/main/docs/new-request-flow
 *
 * This file re-exports from modular sub-packages for backward compatibility.
 * The actual types have been split into:
 * - protocol/ - Protocol types (new-request-flow)
 * - state/ - Task and session state types
 * - search/ - Search functionality types
 * - rag/ - RAG (Retrieval-Augmented Generation) types
 * - api/ - API response types
 * - arch/ - Architectural feature types
 * - file/ - File operation types
 * - message/ - Client/server message types
 * - factory/ - Factory functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSearchQuery = exports.createFileBlock = exports.createTask = exports.createContextBlock = exports.sanitizeSessionForClient = exports.validateSessionData = exports.createSession = exports.EXCHANGE_LOG_TYPES = exports.MESSAGE_ROLES = exports.SESSION_ACTIONS = exports.LEGACY_SESSION_STATUS = exports.SESSION_STATUS = exports.Session = void 0;
// Re-export from modular packages
__exportStar(require("./protocol/index.js"), exports);
__exportStar(require("./state/index.js"), exports);
__exportStar(require("./search/index.js"), exports);
__exportStar(require("./rag/index.js"), exports);
__exportStar(require("./api/index.js"), exports);
__exportStar(require("./arch/index.js"), exports);
__exportStar(require("./file/index.js"), exports);
__exportStar(require("./message/index.js"), exports);
__exportStar(require("./factory/index.js"), exports);
// Re-export Session types from types.js
var types_js_1 = require("./types.js");
Object.defineProperty(exports, "Session", { enumerable: true, get: function () { return types_js_1.Session; } });
Object.defineProperty(exports, "SESSION_STATUS", { enumerable: true, get: function () { return types_js_1.SESSION_STATUS; } });
Object.defineProperty(exports, "LEGACY_SESSION_STATUS", { enumerable: true, get: function () { return types_js_1.LEGACY_SESSION_STATUS; } });
Object.defineProperty(exports, "SESSION_ACTIONS", { enumerable: true, get: function () { return types_js_1.SESSION_ACTIONS; } });
Object.defineProperty(exports, "MESSAGE_ROLES", { enumerable: true, get: function () { return types_js_1.MESSAGE_ROLES; } });
Object.defineProperty(exports, "EXCHANGE_LOG_TYPES", { enumerable: true, get: function () { return types_js_1.EXCHANGE_LOG_TYPES; } });
Object.defineProperty(exports, "createSession", { enumerable: true, get: function () { return types_js_1.createSession; } });
Object.defineProperty(exports, "validateSessionData", { enumerable: true, get: function () { return types_js_1.validateSessionData; } });
Object.defineProperty(exports, "sanitizeSessionForClient", { enumerable: true, get: function () { return types_js_1.sanitizeSessionForClient; } });
// Re-export factory functions for convenience
var index_js_1 = require("./factory/index.js");
Object.defineProperty(exports, "createContextBlock", { enumerable: true, get: function () { return index_js_1.createContextBlock; } });
Object.defineProperty(exports, "createTask", { enumerable: true, get: function () { return index_js_1.createTask; } });
Object.defineProperty(exports, "createFileBlock", { enumerable: true, get: function () { return index_js_1.createFileBlock; } });
Object.defineProperty(exports, "createSearchQuery", { enumerable: true, get: function () { return index_js_1.createSearchQuery; } });
