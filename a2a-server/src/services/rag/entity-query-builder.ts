import type {EntityTypeName, RecognizedEntity, ModelRelation} from '../../types/entity.types.js';
import type {EntityQuery} from './types.js';

type QueryContext = {
    entities?: RecognizedEntity[];
    files?: Array<{path: string}>;
};

const SELECTION_PATTERNS: Record<EntityTypeName, RegExp> = {
    MODEL: /\b([\w]+)\s+(?:model|модель)\b/gi,
    CONTROLLER: /\b([\w]+)\s+(?:controller|контроллер)\b/gi,
    SERVICE: /\b([\w]+)\s+(?:service|сервис)\b/gi,
    VUE_COMPONENT: /\b([\w]+)\s+(?:component|компонент)\b/gi,
    VUE_PAGE: /\b([\w]+)\s+(?:page|страница)\b/gi,
    REPOSITORY: /\b([\w]+)\s+(?:repository|репозиторий)\b/gi,
    REQUEST: /\b([\w]+)\s+(?:request|запрос)\b/gi,
    SERVICE: /\b([\w]+)\s+(?:service|сервис)\b/gi,
    CONFIG: /\b([\w]+)\s+(?:config|конфиг)\b/gi,
    OTHER: /\b([\w]+)\b/g,
};

const FILE_PATTERNS: Record<EntityTypeName, string> = {
    MODEL: '*.php',
    CONTROLLER: '*.php',
    SERVICE: '*.php',
    REPOSITORY: '*.php',
    MIDDLEWARE: '*.php',
    VUE_COMPONENT: '*.vue',
    VUE_PAGE: '*.vue',
    REQUEST: '*.php',
    COMPOSABLE: '*.ts',
    CONFIG: '*.php',
    PHP: '*.php',
    JS: '*.js',
    OTHER: '*.*',
};

const RELATION_KEYWORDS = ['hasMany', 'hasOne', 'belongsTo', 'uses', 'calls'];

export class EntityQueryBuilder {
    buildFromRequest(request: string): EntityQuery {
        const lowered = request.toLowerCase();
        const mentions = this.extractEntityMentions(request);
        const inferredTypes = this.inferEntityTypes(lowered);

        const names = new Set<string>();
        const types = new Set<EntityTypeName>();
        const relations = new Set<string>();
        const filePatterns = new Set<string>();

        mentions.forEach(entry => {
            if (entry.name) names.add(entry.name);
            types.add(entry.type);
        });

        inferredTypes.forEach(type => types.add(type));

        const fallback = this.extractFallbackNames(lowered);
        fallback.forEach(name => names.add(name));

        Array.from(types)
            .map(type => FILE_PATTERNS[type])
            .filter(Boolean)
            .forEach(pattern => filePatterns.add(pattern));

        RELATION_KEYWORDS.forEach(keyword => {
            if (lowered.includes(keyword.toLowerCase())) {
                relations.add(keyword);
            }
        });

        return {
            names: Array.from(names),
            types: Array.from(types),
            relations: Array.from(relations),
            filePatterns: Array.from(filePatterns),
            contextDepth: 2,
        };
    }

    buildFromContext(files: Array<{path: string}>, context: QueryContext = {}): EntityQuery {
        const names = new Set<string>();
        const types = new Set<EntityTypeName>();
        const relations = new Set<string>();
        const filePatterns = new Set<string>();

        for (const entity of context.entities ?? []) {
            names.add(entity.name);
            types.add(entity.type);

            const metadata = entity.metadata as {relations?: ModelRelation[]} | undefined;
            metadata?.relations?.forEach(relation => {
                if (relation.related) {
                    relations.add(relation.related);
                }
                relations.add(relation.type);
            });
        }

        files.forEach(file => {
            const ext = file.path.split('.').pop() ?? '';
            filePatterns.add(`*.${ext}`);
            const guessed = this.guessTypeFromPath(file.path);
            if (guessed) {
                types.add(guessed);
            }
        });

        Array.from(types)
            .map(type => FILE_PATTERNS[type])
            .filter(Boolean)
            .forEach(pattern => filePatterns.add(pattern));

        return {
            names: Array.from(names),
            types: Array.from(types),
            relations: Array.from(relations),
            filePatterns: Array.from(filePatterns),
            contextDepth: 3,
        };
    }

    private extractEntityMentions(text: string): Array<{name: string; type: EntityTypeName}> {
        const matches: Array<{name: string; type: EntityTypeName}> = [];

        for (const [type, pattern] of Object.entries(SELECTION_PATTERNS)) {
            let match: RegExpExecArray | null;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(text)) !== null) {
                if (match[1]) {
                    matches.push({
                        type: type as EntityTypeName,
                        name: this.normalizeName(match[1]),
                    });
                }
            }
        }

        return matches;
    }

    private inferEntityTypes(text: string): EntityTypeName[] {
        const result: EntityTypeName[] = [];

        if (text.includes('controller') || text.includes('контроллер')) {
            result.push('CONTROLLER');
        }
        if (text.includes('model') || text.includes('модель')) {
            result.push('MODEL');
        }
        if (text.includes('component') || text.includes('компонент')) {
            result.push('VUE_COMPONENT');
        }
        if (text.includes('service') || text.includes('сервис')) {
            result.push('SERVICE');
        }
        if (text.includes('request') || text.includes('запрос')) {
            result.push('REQUEST');
        }

        return result;
    }

    private extractFallbackNames(text: string): string[] {
        const tokens = text.match(/\b[A-Za-z_]\w+\b/g) ?? [];
        return tokens.slice(0, 3);
    }

    private normalizeName(raw: string): string {
        return raw.trim().replace(/[^A-Za-z0-9_]/g, '');
    }

    private guessTypeFromPath(path: string): EntityTypeName | null {
        const lower = path.toLowerCase();
        if (lower.includes('/models/') && lower.endsWith('.php')) return 'MODEL';
        if (lower.includes('/controllers/') && lower.endsWith('.php')) return 'CONTROLLER';
        if (lower.includes('/services/') && lower.endsWith('.php')) return 'SERVICE';
        if (lower.includes('/components/') && lower.endsWith('.vue')) return 'VUE_COMPONENT';
        if (lower.includes('/pages/') && lower.endsWith('.vue')) return 'VUE_PAGE';
        if (lower.includes('/requests/') && lower.endsWith('.php')) return 'REQUEST';
        if (lower.endsWith('.ts')) return 'COMPOSABLE';
        if (lower.endsWith('.js')) return 'JS';
        return null;
    }
}
