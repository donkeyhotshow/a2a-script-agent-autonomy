/**
 * RAG improvements per plan 4.5: Vue SFC, TypeScript interfaces, Laravel chunking.
 */
export declare const RAG_IMPROVEMENTS_VERSION = "4.5";
export declare const SUPPORTED_CHUNK_TYPES: string[];

export declare function getImprovementsCapability(): {
    version: string;
    chunkTypes: string[];
};
