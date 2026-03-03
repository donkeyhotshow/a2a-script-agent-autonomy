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
    version?: string;
    input?: Record<string, DSLField>;
    output?: Record<string, DSLField>;
    script?: string;
    mixins?: string[];  // Support mixin composition
}

export interface DSLBase {
    base: string;
    version?: string;
    description?: string;
    abstract?: boolean;
    mixins?: string[];
    steps: DSLStep[];
    context?: Record<string, unknown>;
}

export interface DSLField {
    type: string;
    optional?: boolean;
}

export interface DSLAST {
    type: 'action' | 'mixin' | 'base';
    data: DSLAction | DSLMixin | DSLBase;
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
     * Parse a base template definition
     */
    async parseBase(filePath: string): Promise<DSLAST> {
        const yaml = await this.loadYaml(filePath);
        const base = this.validateBase(yaml);

        return {
            type: 'base',
            data: base,
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
     * Validate base template structure
     */
    private validateBase(data: Record<string, unknown>): DSLBase {
        const base = data['base'];
        const steps = data['steps'];

        if (!base) {
            throw new Error('Base template must have a base name');
        }

        if (!steps) {
            throw new Error('Base template must have steps');
        }

        if (!Array.isArray(steps)) {
            throw new Error('steps must be an array');
        }

        const result: DSLBase = {
            base: String(base),
            steps: steps as DSLStep[],
        };

        if (data['version']) {
            result.version = String(data['version']);
        }
        if (data['description']) {
            result.description = String(data['description']);
        }
        if (data['abstract']) {
            result.abstract = Boolean(data['abstract']);
        }
        if (data['mixins']) {
            result.mixins = this.asStringArray(data['mixins']);
        }
        if (data['context']) {
            result.context = data['context'] as Record<string, unknown>;
        }

        return result;
    }

    /**
     * Get actions directory path
     */
    getActionsDir(): string {
        return this.actionsDir;
    }

    /**
     * Get mixins directory path
     */
    getMixinsDir(): string {
        return this.mixinsDir;
    }

    /**
     * Get base templates directory path
     */
    getBasesDir(): string {
        return this.basesDir;
    }

    /**
     * List all action files
     */
    async listActionFiles(): Promise<string[]> {
        return this.listYamlFiles(this.actionsDir);
    }

    /**
     * List all mixin files
     */
    async listMixinFiles(): Promise<string[]> {
        return this.listYamlFiles(this.mixinsDir);
    }

    /**
     * List all base template files
     */
    async listBaseFiles(): Promise<string[]> {
        return this.listYamlFiles(this.basesDir);
    }

    /**
     * Recursively list all YAML files in directory
     */
    private async listYamlFiles(dir: string): Promise<string[]> {
        const files: string[] = [];
        const {readdir} = await import('node:fs/promises');
        const {join} = await import('node:path');

        try {
            const entries = await readdir(dir, {withFileTypes: true});
            for (const entry of entries) {
                const fullPath = join(dir, entry.name);
                if (entry.isDirectory()) {
                    files.push(...await this.listYamlFiles(fullPath));
                } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
                    files.push(fullPath);
                }
            }
        } catch {
            // Directory doesn't exist or can't be read
        }

        return files;
    }
}

export default DSLParser;
