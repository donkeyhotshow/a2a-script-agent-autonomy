/**
 * RAG improvements per plan 4.5: Vue SFC, TypeScript interfaces, Laravel chunking.
 * Implemented in indexer.js, chunk-manager.js, ast-chunker.js.
 */

const RAG_IMPROVEMENTS_VERSION = '4.5';

const SUPPORTED_CHUNK_TYPES = [
  'vue-sfc',
  'vue-script',
  'vue-template',
  'vue-style',
  'interface',
  'type',
  'laravel-routes',
  'laravel-bindings',
];

/**
 * @returns {{ version: string, chunkTypes: string[] }}
 */
function getImprovementsCapability() {
  return {
    version: RAG_IMPROVEMENTS_VERSION,
    chunkTypes: [...SUPPORTED_CHUNK_TYPES],
  };
}

module.exports = {
  RAG_IMPROVEMENTS_VERSION,
  SUPPORTED_CHUNK_TYPES,
  getImprovementsCapability,
};
