"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = void 0;
exports.DEFAULT_SETTINGS = {
    searchableAttributes: ['content', 'name', 'path', 'type'],
    filterableAttributes: ['type', 'extension', 'framework'],
    sortableAttributes: ['score', 'lastModified', 'path'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
};
