/**
 * Vue Entity Extractor
 *
 * Extracts Vue entities (Components, Pages) from Vue SFC files.
 * Supports Vue 3 Composition API with <script setup> syntax.
 */

import type {
    RecognizedEntity,
    RecognizedRelation,
    EntityTypeName,
    EntityMetadata,
    VueProp,
} from '../../../types/entity.types.js';
import type { ExtractionInput, ExtractionResult } from '../types.js';
import {
    VUE_PATTERNS,
    USES_INERTIA,
    INERTIA_PATTERNS,
} from '../patterns/index.js';
import { generateEntityId, generateRelationId } from '../utils.js';

/**
 * Check if file is an Inertia page
 */
function isInertiaPage(path: string, content: string): boolean {
    // Check path convention
    if (path.includes('/Pages/')) {
        return true;
    }

    // Check for Inertia patterns in content
    for (const pattern of INERTIA_PATTERNS) {
        if (pattern.test(content)) {
            return true;
        }
    }

    return false;
}

/**
 * Extract component name from filename
 * Converts kebab-case or snake_case to PascalCase
 */
function extractComponentName(path: string): string {
    const filename = path.split(/[\\/]/).pop()?.replace('.vue', '') || 'Unknown';
    return filename
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
}

/**
 * Extract props from script content
 * Supports both TypeScript generic and object syntax
 */
function extractVueProps(content: string): VueProp[] {
    const props: VueProp[] = [];

    // TypeScript defineProps<{...}>()
    const tsMatch = content.match(VUE_PATTERNS.defineProps);
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

    // Object defineProps({...})
    const objMatch = content.match(/defineProps\s*\(\s*\{([\s\S]*?)\}\s*\)/);
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
}

/**
 * Extract emits from script content
 * Supports both TypeScript generic and array syntax
 */
function extractVueEmits(content: string): string[] {
    const emits: string[] = [];

    // Array form: defineEmits(['event1', 'event2'])
    const arrMatch = content.match(/defineEmits\s*\(\s*\[([\s\S]*?)\]\s*\)/);
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

    // TypeScript form: defineEmits<{...}>()
    const tsMatch = content.match(VUE_PATTERNS.defineEmits);
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
}

/**
 * Extract imports from script content
 */
function extractVueImports(content: string): string[] {
    const imports: string[] = [];
    VUE_PATTERNS.importStatement.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = VUE_PATTERNS.importStatement.exec(content)) !== null) {
        const names = match[1]?.split(',').map(s => s.trim()).filter(Boolean)
            || (match[2] ? [match[2]] : []);
        imports.push(...names);
    }

    return imports;
}

/**
 * Determine if this is a valid Vue file
 */
function isVueFile(content: string): boolean {
    return content.includes('<template') || content.includes('<script');
}

/**
 * Build relations from Vue entity
 */
function buildVueRelations(entity: RecognizedEntity, content: string): RecognizedRelation[] {
    const relations: RecognizedRelation[] = [];

    // Check for Inertia usage
    if (USES_INERTIA.test(content)) {
        const contextParts: string[] = [];

        if (content.includes('useForm')) {
            contextParts.push('Inertia form');
        }
        if (content.includes('router.')) {
            contextParts.push('Inertia router');
        }
        if (VUE_PATTERNS.inertiaUsePage.test(content)) {
            contextParts.push('usePage');
        }

        if (contextParts.length > 0) {
            relations.push({
                id: generateRelationId(entity.path, undefined, 'USES'),
                fromPath: entity.path,
                fromId: entity.id,
                type: 'USES',
                metadata: {
                    context: contextParts.join(', '),
                },
            });
        }
    }

    return relations;
}

/**
 * Main function: Extract Vue entity from content
 */
export function extractVueEntity(input: ExtractionInput): ExtractionResult {
    const { content, path } = input;

    // Validate Vue file
    if (!isVueFile(content)) {
        return { entity: null, relations: [] };
    }

    // Determine entity type
    const isInertia = isInertiaPage(path, content);
    const type: EntityTypeName = isInertia ? 'VUE_PAGE' : 'VUE_COMPONENT';

    // Extract component name
    const name = extractComponentName(path);

    // Extract script content
    const scriptMatch = content.match(VUE_PATTERNS.scriptSetup);
    const scriptContent = scriptMatch?.[1] || '';

    // Build metadata
    const metadata: EntityMetadata = {};

    if (scriptContent) {
        metadata.props = extractVueProps(scriptContent);
        metadata.emits = extractVueEmits(scriptContent);
        metadata.imports = extractVueImports(scriptContent);
    }

    const entity: RecognizedEntity = {
        id: generateEntityId(type, name, path),
        type,
        name,
        path,
        metadata,
    };

    const relations = buildVueRelations(entity, content);

    return { entity, relations };
}

/**
 * Check if extractor can handle this file
 */
export function canHandleVue(path: string): boolean {
    return path.toLowerCase().endsWith('.vue');
}
