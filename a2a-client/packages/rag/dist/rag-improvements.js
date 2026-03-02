"use strict";
/**
 * RAG improvements per plan 4.5: Vue SFC, TypeScript interfaces, Laravel chunking.
 */
Object.defineProperty(exports, "__esModule", {value: true});
exports.SUPPORTED_CHUNK_TYPES = exports.RAG_IMPROVEMENTS_VERSION = void 0;
exports.getImprovementsCapability = getImprovementsCapability;
exports.RAG_IMPROVEMENTS_VERSION = '4.5';
exports.SUPPORTED_CHUNK_TYPES = [
    'vue-sfc',
    'vue-script',
    'vue-template',
    'vue-style',
    'interface',
    'type',
    'laravel-routes',
    'laravel-bindings',
];

function getImprovementsCapability() {
    return {version: exports.RAG_IMPROVEMENTS_VERSION, chunkTypes: [...exports.SUPPORTED_CHUNK_TYPES]};
}
