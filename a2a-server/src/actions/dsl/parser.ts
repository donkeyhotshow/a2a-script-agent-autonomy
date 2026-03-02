/**
 * DSL Parser - parses YAML action definitions into AST
 *
 * Реализация на основе плана: plans/pivots/pivot-3-dsl-composability.md
 */

import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import yaml from 'js-yaml';

export interface DSLInput {
    rootDir: string;
}

export interface DSLAction {
    id: string;
    version: string;
    extends?: string;
    mixins?: string[];
    context?: Record<string, unknown>;
    variants?: DSLVariant[];
    triggers?: string[];
    steps: DSLStep[];
}

export interface DSLVariant {
    framework: string;
    mixins?: string[];
    steps?: DSLStep[];
}

export interface DSLStep {
    id: string;
    description?: string;
    $mixin?: string;
    script?: string;
    output?: string;
    input?: Record<string, unknown>;
    if?: string;

    [key: string]: unknown;
}

export interface DSLMixin {
    mixin: string;
    description?: string;
    input?: Record<string, DSLField>;
    output?: Record<string, DSLField>;
    script?: string;
}

export interface DSLField {
    type: string;
    optional?: boolean;
}

export interface DSLAST {
    type: 'action' | 'mixin' | 'base';
    data: DSLAction | DSLMixin;
    raw: string;
    path: string;
}

export class DSLParser {
    private actionsDir: string;
    private mixinsDir: string;
    private basesDir: string;

    constructor(private basePath: string) {
        this.actionsDir = join(basePath, 'definitions', 'yaml', 'actions');
        this.mixinsDir = join(basePath, 'definitions', 'yaml', 'mixins');
        this.basesDir = join(basePath, 'definitions', 'yaml', 'base');
    }

    /**
     * Parse a YAML action definition file
     */
    async parseAction(filePath: string): Promise<DSLAST> {
        const yaml = await this.loadYaml(filePath);
        const action = this.validateAction(yaml);

        return {
            type: 'action',
            data: action,
            raw: JSON.stringify(yaml),
            path: filePath,
        };
    }

    /**
     * Parse a mixin definition
     */
    async parseMixin(filePath: string): Promise<DSLAST> {
        const yaml = await this.loadYaml(filePath);
        const mixin = this.validateMixin(yaml);

        return {
            type: 'mixin',
            data: mixin,
            raw: JSON.stringify(yaml),
            path: filePath,
        };
    }

    /**
     * Load and parse YAML file
     */
    private async loadYaml(filePath: string): Promise<Record<string, unknown>> {
        // Use js-yaml for robust YAML parsing
        const content = readFileSync(filePath, 'utf-8');
        try {
            const parsed = yaml.load(content);
            if (typeof parsed !== 'object' || parsed === null) {
                throw new Error('YAML file must contain an object');
            }
            return parsed as Record<string, unknown>;
        } catch (error) {
            console.error(`[DSLParser] Error parsing YAML file ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Validate action structure
     */
    private validateAction(data: Record<string, unknown>): DSLAction {
        const id = data['id'];
        const steps = data['steps'];

        if (!id) {
            throw new Error('Action must have an id');
        }

        if (!steps) {
            throw new Error('Action must have steps');
        }

        if (!Array.isArray(steps)) {
            throw new Error('steps must be an array');
        }

        const action: DSLAction = {
            id: String(id),
            version: '1.0',
            steps: steps as DSLStep[],
        };

        if (data['version']) {
            action.version = String(data['version']);
        }
        if (data['extends']) {
            action.extends = String(data['extends']);
        }
        if (data['mixins']) {
            action.mixins = this.asStringArray(data['mixins']);
        }
        if (data['context']) {
            action.context = data['context'] as Record<string, unknown>;
        }
        if (data['variants']) {
            action.variants = data['variants'] as DSLVariant[];
        }
        if (data['triggers']) {
            action.triggers = this.asStringArray(data['triggers']);
        }

        return action;
    }

    /**
     * Convert value to string array
     */
    private asStringArray(value: unknown): string[] {
        if (Array.isArray(value)) {
            return value.map(v => String(v));
        }
        return [];
    }

    /**
     * Validate mixin structure
     */
    private validateMixin(data: Record<string, unknown>): DSLMixin {
        const mixin = data['mixin'];

        if (!mixin) {
            throw new Error('Mixin must have a mixin name');
        }

        const result: DSLMixin = {
            mixin: String(mixin),
        };

        if (data['description']) {
            result.description = String(data['description']);
        }
        if (data['input']) {
            result.input = data['input'] as Record<string, DSLField>;
        }
        if (data['output']) {
            result.output = data['output'] as Record<string, DSLField>;
        }
        if (data['script']) {
            result.script = String(data['script']);
        }

        return result;
    }

    /**
     * List all action files
     */
    listActionFiles(): string[] {
        // In production, use fs.readdirSync with recursive option
        // For now, return empty array - will be implemented
        return [];
    }

    /**
     * List all mixin files
     */
    listMixinFiles(): string[] {
        return [];
    }
}

export default DSLParser;
