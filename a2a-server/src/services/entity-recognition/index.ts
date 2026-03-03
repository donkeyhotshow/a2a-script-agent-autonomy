/**
 * Entity Recognition Module
 *
 * Public API for entity recognition functionality.
 *
 * @example
 * ```typescript
 * import { recognizeEntities, recognizeEntitiesBatch } from './entity-recognition/index.js';
 *
 * const result = recognizeEntities({ path: 'User.php', content: '...' });
 * ```
 */

// ============================================
// Main Service API (Backward Compatible)
// ============================================

export {
    recognizeEntities,
    recognizeEntitiesBatch,
    guessEntityTypeFromPath,
    canRecognize,
} from './entity-recognizer.service.js';

// ============================================
// Types
// ============================================

export type {
    ExtractionInput,
    ExtractionResult,
    EntityExtractor,
    ClassInfo,
} from './types.js';

// Re-export public types from entity.types
export type {
    CodeBlock,
    RecognitionResult,
    RecognizedEntity,
    RecognizedRelation,
    EntityTypeName,
    RelationTypeName,
    EntityMetadata,
    ModelRelation,
    ControllerMethod,
    VueProp,
} from '../../types/entity.types.js';

// ============================================
// Extractors
// ============================================

export {
    // Main extractors
    extractPHPEntity,
    extractVueEntity,
    // Utilities
    canHandlePHP,
    canHandleVue,
    findExtractor,
    canExtract,
    extractEntity,
} from './extractors/index.js';

// ============================================
// Patterns
// ============================================

export {
    // PHP Patterns
    PHP_PATTERNS,
    RELATION_PATTERNS,
    CLASS_DECLARATION,
    NAMESPACE,
    MODEL_EXTENDS,
    MODEL_TABLE,
    MODEL_FILLABLE,
    MODEL_CASTS,
    BELONGS_TO,
    HAS_MANY,
    HAS_ONE,
    BELONGS_TO_MANY,
    MORPH_TO,
    MORPH_MANY,
    CONTROLLER_EXTENDS,
    CONTROLLER_METHOD,
    MIDDLEWARE,
    FORM_REQUEST_EXTENDS,
    RULES_METHOD,
    SERVICE_CLASS,
    // Vue Patterns
    VUE_PATTERNS,
    INERTIA_PATTERNS,
    SCRIPT_SETUP,
    SCRIPT_SECTION,
    DEFINE_PROPS_TS,
    DEFINE_PROPS_INTERFACE,
    DEFINE_PROPS_OBJ,
    WITH_DEFAULTS,
    DEFINE_EMITS_TS,
    DEFINE_EMITS_ARR,
    IMPORT_STATEMENT,
    COMPOSABLE_IMPORT,
    INERTIA_LINK,
    INERTIA_USE_PAGE,
    INERTIA_USE_FORM,
    INERTIA_ROUTER,
    USES_INERTIA,
    COMPONENT_OPTIONS,
    DEFINE_COMPONENT,
    LIFECYCLE_HOOK,
    VUE_USE_COMPOSABLE,
    TEMPLATE_SECTION,
    SLOT_USAGE,
    COMPONENT_USAGE,
} from './patterns/index.js';

// ============================================
// Utilities
// ============================================

export {
    generateEntityId,
    generateRelationId,
    getLineNumber,
    normalizePath,
    getFileExtension,
    matchesPattern,
} from './utils.js';

// ============================================
// Internal API (for testing)
// ============================================

import { extractPHPEntity, extractVueEntity } from './extractors/index.js';
import {
    PHP_PATTERNS,
    VUE_PATTERNS,
    CLASS_DECLARATION,
    NAMESPACE,
    BELONGS_TO,
    HAS_MANY,
    HAS_ONE,
    BELONGS_TO_MANY,
    MORPH_TO,
    MORPH_MANY,
    CONTROLLER_METHOD,
    IMPORT_STATEMENT,
    DEFINE_PROPS_TS,
    DEFINE_PROPS_OBJ,
    DEFINE_EMITS_ARR,
    DEFINE_EMITS_TS,
} from './patterns/index.js';

/**
 * Internal exports for testing purposes.
 * @internal
 */
export const _internal = {
    // Extractor functions
    extractPHPEntity,
    extractVueEntity,

    // Pattern objects
    PHP_PATTERNS,
    VUE_PATTERNS,

    // Individual patterns
    extractClassName: (content: string) => {
        const match = content.match(CLASS_DECLARATION);
        return match ? { name: match[1], extends: match[2], implements: match[3]?.split(',').map(s => s.trim()).filter(Boolean) } : null;
    },
    extractNamespace: (content: string) => {
        const match = content.match(NAMESPACE);
        return match?.[1];
    },
    extractModelRelations: (content: string) => {
        const patterns = [
            { pattern: BELONGS_TO, type: 'belongsTo' },
            { pattern: HAS_MANY, type: 'hasMany' },
            { pattern: HAS_ONE, type: 'hasOne' },
            { pattern: BELONGS_TO_MANY, type: 'belongsToMany' },
            { pattern: MORPH_TO, type: 'morphTo' },
            { pattern: MORPH_MANY, type: 'morphMany' },
        ];

        const relations: Array<{ name: string; type: string; related?: string }> = [];
        for (const { pattern, type } of patterns) {
            pattern.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(content)) !== null) {
                if (match[1]) {
                    relations.push({
                        name: match[1],
                        type,
                        related: match[2]?.trim().replace(/['"]/g, ''),
                    });
                }
            }
        }
        return relations;
    },
    extractControllerMethods: (content: string) => {
        const methods: Array<{ name: string; visibility: string; parameters: string[] }> = [];
        CONTROLLER_METHOD.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = CONTROLLER_METHOD.exec(content)) !== null) {
            if (!match[1]) continue;
            const visibility = match[0].startsWith('public') ? 'public'
                : match[0].startsWith('protected') ? 'protected'
                    : 'private';

            methods.push({
                name: match[1],
                visibility,
                parameters: match[2]?.split(',').map(s => s.trim()).filter(Boolean) || [],
            });
        }
        return methods.filter(m => !['__construct', 'middleware'].includes(m.name));
    },
    extractVueProps: (content: string) => {
        const props: Array<{ name: string; type?: string; required?: boolean; default?: string }> = [];

        const tsMatch = content.match(DEFINE_PROPS_TS);
        if (tsMatch?.[1]) {
            const propsStr = tsMatch[1];
            const propLines = propsStr.split(';').filter(s => s.trim());

            for (const line of propLines) {
                const propMatch = line.trim().match(/(\w+)\s*(\?)?(?::\s*(\w+))?/);
                if (propMatch?.[1]) {
                    props.push({
                        name: propMatch[1],
                        type: propMatch[3],
                        required: !propMatch[2],
                    });
                }
            }
        }

        const objMatch = content.match(DEFINE_PROPS_OBJ);
        if (objMatch?.[1]) {
            const propsStr = objMatch[1];
            const propRegex = /(\w+):\s*\{([^}]+)\}/g;

            let match: RegExpExecArray | null;
            while ((match = propRegex.exec(propsStr)) !== null) {
                if (!match[1] || !match[2]) continue;

                const typeMatch = match[2].match(/type:\s*(\w+)/);
                const requiredMatch = match[2].match(/required:\s*(true|false)/);
                const defaultMatch = match[2].match(/default:\s*([^,}\n]+)/);

                props.push({
                    name: match[1],
                    type: typeMatch?.[1],
                    required: requiredMatch?.[1] === 'true',
                    default: defaultMatch?.[1]?.trim(),
                });
            }
        }

        return props;
    },
    extractVueEmits: (content: string) => {
        const emits: string[] = [];

        const arrMatch = content.match(DEFINE_EMITS_ARR);
        if (arrMatch?.[1]) {
            const emitStr = arrMatch[1];
            const emitRegex = /['"](\w+)['"]/g;

            let match: RegExpExecArray | null;
            while ((match = emitRegex.exec(emitStr)) !== null) {
                if (match[1]) {
                    emits.push(match[1]);
                }
            }
        }

        const tsMatch = content.match(DEFINE_EMITS_TS);
        if (tsMatch?.[1]) {
            const emitStr = tsMatch[1];
            const emitRegex = /(\w+)\s*:/g;

            let match: RegExpExecArray | null;
            while ((match = emitRegex.exec(emitStr)) !== null) {
                if (match[1]) {
                    emits.push(match[1]);
                }
            }
        }

        return emits;
    },
    extractVueImports: (content: string) => {
        const imports: string[] = [];
        IMPORT_STATEMENT.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = IMPORT_STATEMENT.exec(content)) !== null) {
            const names = match[1]?.split(',').map(s => s.trim()).filter(Boolean)
                || (match[2] ? [match[2]] : []);
            imports.push(...names);
        }

        return imports;
    },
};
