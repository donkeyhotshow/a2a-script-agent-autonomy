/**
 * DSL Validator - validates YAML action definitions against schema
 *
 * Реализация на основе плана: plans/pivots/pivot-3-dsl-composability.md
 */

import type {DSLAction, DSLMixin, DSLStep, DSLAST} from './parser.js';

export interface ValidationError {
    path: string;
    message: string;
    severity: 'error' | 'warning';
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

export class DSLValidator {
    private errors: ValidationError[] = [];

    /**
     * Validate an action AST
     */
    validate(ast: DSLAST): ValidationResult {
        this.errors = [];

        if (ast.type === 'action') {
            this.validateAction(ast.data as DSLAction);
        } else if (ast.type === 'mixin') {
            this.validateMixin(ast.data as DSLMixin);
        }

        return {
            valid: this.errors.filter(e => e.severity === 'error').length === 0,
            errors: this.errors,
        };
    }

    /**
     * Validate action structure
     */
    private validateAction(action: DSLAction): void {
        // ID validation
        if (!action.id || action.id.trim() === '') {
            this.addError('action.id', 'Action must have a non-empty id');
        }

        if (!/^[a-z][a-z0-9-]*$/.test(action.id)) {
            this.addWarning(
                'action.id',
                'Action id should use kebab-case (e.g., fix-vue-imports)'
            );
        }

        // Version validation
        if (!action.version) {
            this.addWarning('action.version', 'Version should be specified');
        }

        // Steps validation
        if (!action.steps || action.steps.length === 0) {
            this.addError('action.steps', 'Action must have at least one step');
        }

        // Validate each step
        const stepIds = new Set<string>();
        const outputs = new Set<string>();

        for (let i = 0; i < action.steps.length; i++) {
            const step = action.steps[i];
            this.validateStep(step, i, stepIds, outputs);
        }

        // Validate extends
        if (action.extends && !action.extends.endsWith('.yaml')) {
            this.addWarning('action.extends', 'Base reference should end with .yaml');
        }

        // Validate mixins
        if (action.mixins) {
            for (const mixin of action.mixins) {
                if (!mixin.endsWith('.yaml')) {
                    this.addWarning('action.mixins', `Mixin "${mixin}" should end with .yaml`);
                }
            }
        }
    }

    /**
     * Validate a single step
     */
    private validateStep(
        step: DSLStep,
        index: number,
        stepIds: Set<string>,
        outputs: Set<string>
    ): void {
        const path = `action.steps[${index}]`;

        // Step ID validation
        if (!step.id) {
            this.addError(`${path}.id`, `Step ${index} must have an id`);
        } else if (stepIds.has(step.id)) {
            this.addError(`${path}.id`, `Duplicate step id: ${step.id}`);
        } else {
            stepIds.add(step.id);
        }

        // Must have either $mixin or script
        if (!step.$mixin && !step.script) {
            this.addError(
                path,
                `Step "${step.id}" must have either $mixin or script`
            );
        }

        // Cannot have both $mixin and script
        if (step.$mixin && step.script) {
            this.addWarning(
                path,
                `Step "${step.id}" has both $mixin and script - script will be used`
            );
        }

        // Output validation
        if (step.output) {
            if (outputs.has(step.output)) {
                this.addWarning(
                    `${path}.output`,
                    `Duplicate output name: ${step.output}`
                );
            } else {
                outputs.add(step.output);
            }
        }

        // Input references validation
        if (step.input) {
            this.validateInputReferences(step.input, path);
        }

        // Condition validation
        if (step.if && !this.isValidCondition(step.if)) {
            this.addWarning(
                `${path}.if`,
                `Invalid condition syntax: ${step.if}`
            );
        }
    }

    /**
     * Validate input references
     */
    private validateInputReferences(
        input: Record<string, unknown>,
        path: string
    ): void {
        for (const [key, value] of Object.entries(input)) {
            if (typeof value === 'string') {
                // Check for variable interpolation
                const matches = value.match(/\{\{\s*(\w+(?:\.\w+)*)\s*\}\}/g);
                if (matches) {
                    // Could validate references here
                }
            }
        }
    }

    /**
     * Validate mixin structure
     */
    private validateMixin(mixin: DSLMixin): void {
        // Mixin name validation
        if (!mixin.mixin || mixin.mixin.trim() === '') {
            this.addError('mixin.mixin', 'Mixin must have a name');
        }

        // Input validation
        if (mixin.input) {
            for (const [key, field] of Object.entries(mixin.input)) {
                if (!field.type) {
                    this.addWarning(
                        `mixin.input.${key}`,
                        `Field "${key}" should have a type`
                    );
                }
            }
        }

        // Output validation
        if (mixin.output) {
            for (const [key, field] of Object.entries(mixin.output)) {
                if (!field.type) {
                    this.addWarning(
                        `mixin.output.${key}`,
                        `Field "${key}" should have a type`
                    );
                }
            }
        }
    }

    /**
     * Check if condition syntax is valid
     */
    private isValidCondition(condition: string): boolean {
        // Simple validation - check balanced braces
        const openBraces = (condition.match(/\{/g) || []).length;
        const closeBraces = (condition.match(/\}/g) || []).length;

        return openBraces === closeBraces;
    }

    /**
     * Add an error
     */
    private addError(path: string, message: string): void {
        this.errors.push({
            path,
            message,
            severity: 'error',
        });
    }

    /**
     * Add a warning
     */
    private addWarning(path: string, message: string): void {
        this.errors.push({
            path,
            message,
            severity: 'warning',
        });
    }
}

export default DSLValidator;
