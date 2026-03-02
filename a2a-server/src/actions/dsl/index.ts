/**
 * DSL Module - Domain-Specific Language for Action Definitions
 *
 * Реализация на основе плана: plans/pivots/pivot-3-dsl-composability.md
 *
 * Provides:
 * - Parser: YAML to AST
 * - Validator: Schema validation
 * - Resolver: Mixin resolution and variable interpolation
 * - Generator: TypeScript code generation
 */

export {DSLParser} from './parser.js';
export type {
    DSLAction,
    DSLStep,
    DSLMixin,
    DSLAST,
    DSLInput,
    DSLVariant
} from './parser.js';

export {DSLValidator} from './validator.js';
export type {ValidationError, ValidationResult} from './validator.js';

export {DSLResolver} from './resolver.js';
export type {ResolvedAction, ResolvedStep} from './resolver.js';

/**
 * Main DSL class - combines all components
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {DSLParser} from './parser.js';
import {DSLValidator} from './validator.js';
import {DSLResolver} from './resolver.js';
import type {DSLAction, DSLAST, DSLMixin} from './parser.js';

export class DSL {
    private parser: DSLParser;
    private validator: DSLValidator;
    private resolver: DSLResolver;
    private mixins = new Map<string, DSLMixin>();

    constructor(basePath: string) {
        this.parser = new DSLParser(basePath);
        this.validator = new DSLValidator();
        this.resolver = new DSLResolver();
    }

    /**
     * Register a mixin
     */
    registerMixin(mixin: DSLMixin): void {
        this.mixins.set(mixin.mixin, mixin);
    }

    /**
     * Load all mixins from directory
     */
    async loadMixins(dirPath: string): Promise<void> {
        const yamlFiles = await this.collectYamlFiles(dirPath);

        for (const filePath of yamlFiles) {
            try {
                const ast = await this.parser.parseMixin(filePath);
                const mixin = ast.data as DSLMixin;
                this.registerMixin(mixin);
            } catch (error) {
                console.error(`[DSL] Failed to load mixin ${filePath}:`, error);
            }
        }
    }

    private async collectYamlFiles(dirPath: string): Promise<string[]> {
        const files: string[] = [];

        let entries: fs.Dirent[];
        try {
            entries = await fs.readdir(dirPath, {withFileTypes: true});
        } catch {
            return files;
        }

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                files.push(...await this.collectYamlFiles(fullPath));
                continue;
            }

            if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
                files.push(fullPath);
            }
        }

        return files;
    }

    /**
     * Parse and validate an action
     */
    async parseAction(filePath: string): Promise<{
        ast: DSLAST;
        validation: import('./validator.js').ValidationResult;
    }> {
        const ast = await this.parser.parseAction(filePath);
        const validation = this.validator.validate(ast);

        if (!validation.valid) {
            throw new Error(
                `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`
            );
        }

        return {ast, validation};
    }

    /**
     * Resolve an action (process mixins and variables)
     */
    resolveAction(action: DSLAction): import('./resolver.js').ResolvedAction {
        return this.resolver.resolve(action, this.mixins);
    }

    /**
     * Full pipeline: parse, validate, resolve
     */
    async processAction(filePath: string): Promise<import('./resolver.js').ResolvedAction> {
        const {ast} = await this.parseAction(filePath);
        const action = ast.data as DSLAction;
        return this.resolveAction(action);
    }
}

export default DSL;
