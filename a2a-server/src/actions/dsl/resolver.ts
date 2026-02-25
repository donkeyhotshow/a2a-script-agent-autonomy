/**
 * DSL Resolver - resolves mixin references and variable interpolation
 */

import type { DSLAction, DSLStep, DSLMixin, DSLAST } from './parser.js';

export interface ResolvedAction extends DSLAction {
  resolvedMixins: Map<string, DSLMixin>;
  resolvedSteps: ResolvedStep[];
}

export interface ResolvedStep extends DSLStep {
  resolvedScript: string;
  resolvedInput: Record<string, unknown>;
}

export class DSLResolver {
  private mixinCache = new Map<string, DSLMixin>();

  /**
   * Resolve an action - process mixins and variables
   */
  resolve(action: DSLAction, mixins: Map<string, DSLMixin>): ResolvedAction {
    const resolvedMixins = new Map<string, DSLMixin>();
    
    // Resolve mixins
    if (action.mixins) {
      for (const mixinName of action.mixins) {
        const mixin = mixins.get(mixinName);
        if (mixin) {
          resolvedMixins.set(mixinName, mixin);
        }
      }
    }

    // Resolve steps
    const resolvedSteps = action.steps.map(step => 
      this.resolveStep(step, resolvedMixins)
    );

    return {
      ...action,
      resolvedMixins,
      resolvedSteps,
    };
  }

  /**
   * Resolve a single step
   */
  private resolveStep(step: DSLStep, mixins: Map<string, DSLMixin>): ResolvedStep {
    // Resolve $mixin reference
    let resolvedScript = step.script || '';
    let resolvedInput = { ...step.input };

    if (step.$mixin) {
      const mixin = mixins.get(step.$mixin);
      if (mixin?.script) {
        resolvedScript = mixin.script;
      }
      
      // Merge mixin input defaults with step input
      if (mixin?.input) {
        for (const [key, field] of Object.entries(mixin.input)) {
          if (resolvedInput[key] === undefined) {
            resolvedInput[key] = this.getDefaultValue(field.type);
          }
        }
      }
    }

    // Resolve variable interpolation in input
    resolvedInput = this.resolveVariables(resolvedInput, step);

    return {
      ...step,
      resolvedScript,
      resolvedInput,
    };
  }

  /**
   * Resolve variable interpolation in inputs
   */
  private resolveVariables(
    input: Record<string, unknown>,
    step: DSLStep
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        // Replace {{ stepId.output }}
        resolved[key] = value.replace(
          /\{\{\s*(\w+)\.([\w.]+)\s*\}\}/g,
          (_, stepId, outputPath) => {
            // This would be resolved at runtime
            return `\${inputs.${stepId}.${outputPath}}`;
          }
        );
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Get default value for a type
   */
  private getDefaultValue(type: string): unknown {
    switch (type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }

  /**
   * Resolve extends (base template)
   */
  async resolveExtends(
    action: DSLAction,
    loadBase: (name: string) => Promise<DSLAction | null>
  ): Promise<DSLAction> {
    if (!action.extends) {
      return action;
    }

    const baseName = action.extends.replace('.yaml', '');
    const base = await loadBase(baseName);

    if (!base) {
      throw new Error(`Base template not found: ${baseName}`);
    }

    // Merge base with action (action overrides base)
    return this.mergeActions(base, action);
  }

  /**
   * Merge base action with derived action
   */
  private mergeActions(base: DSLAction, derived: DSLAction): DSLAction {
    // Merge steps
    const baseSteps = base.steps || [];
    const derivedSteps = derived.steps || [];

    // Derived steps override base steps with same id
    const stepMap = new Map(baseSteps.map(s => [s.id, s]));
    for (const step of derivedSteps) {
      stepMap.set(step.id, step);
    }

    return {
      id: derived.id,
      version: derived.version,
      context: { ...base.context, ...derived.context },
      triggers: derived.triggers || base.triggers,
      mixins: [...(base.mixins || []), ...(derived.mixins || [])],
      steps: Array.from(stepMap.values()),
    };
  }

  /**
   * Check for circular mixin dependencies
   */
  detectCircularMixins(mixins: Map<string, DSLMixin>): ValidationError[] {
    const errors: ValidationError[] = [];
    const visited = new Set<string>();
    const stack: string[] = [];

    for (const [name, mixin] of mixins) {
      if (this.hasCircularDependency(name, mixins, visited, stack, errors)) {
        // Circular dependency found
      }
    }

    return errors;
  }

  private hasCircularDependency(
    name: string,
    mixins: Map<string, DSLMixin>,
    visited: Set<string>,
    stack: string[],
    errors: ValidationError[]
  ): boolean {
    if (stack.includes(name)) {
      errors.push({
        path: `mixins.${name}`,
        message: `Circular mixin dependency: ${stack.join(' -> ')} -> ${name}`,
        severity: 'error',
      });
      return true;
    }

    if (visited.has(name)) {
      return false;
    }

    visited.add(name);
    stack.push(name);

    const mixin = mixins.get(name);
    // Check for nested mixins - would need to track mixin references
    // This is simplified

    stack.pop();
    return false;
  }
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export default DSLResolver;
