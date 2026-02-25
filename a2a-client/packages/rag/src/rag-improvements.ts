/**
 * RAG improvements per plan 4.5: Vue SFC, TypeScript interfaces, Laravel chunking.
 */

export const RAG_IMPROVEMENTS_VERSION = '4.5';

export const SUPPORTED_CHUNK_TYPES = [
  'vue-sfc',
  'vue-script',
  'vue-template',
  'vue-style',
  'interface',
  'type',
  'laravel-routes',
  'laravel-bindings',
];

export function getImprovementsCapability(): { version: string; chunkTypes: string[] } {
  return { version: RAG_IMPROVEMENTS_VERSION, chunkTypes: [...SUPPORTED_CHUNK_TYPES] };
}
