/**
 * Structural validation for transform pipeline JSON (dev / diagnostics).
 */

export function validatePipeline(pipeline: unknown): string[] {
  const errors: string[] = [];

  if (!pipeline || typeof pipeline !== 'object') {
    errors.push('Pipeline must be an object');
    return errors;
  }

  const p = pipeline as Record<string, unknown>;

  if (p.type !== 'pipeline') {
    errors.push(`Invalid type: ${p.type}. Expected 'pipeline'.`);
  }

  if (!Array.isArray(p.steps)) {
    errors.push('Steps must be an array');
    return errors;
  }

  if (p.steps.length === 0) {
    errors.push('Pipeline must have at least one step');
  }

  const validOps = [
    'copy',
    'set',
    'append-to-array',
    'parse-json-from-md',
    'render-markdown',
    'switch',
    'apply-scratchpad-ops',
    'apply-workbench-section-ops',
    'truncate-section',
    'pick-context',
    'drop',
    'truncate-history',
    'include-if',
    'pick-files',
    'merge-files-to-context',
    'merge-workbench-sections',
    'summarize-files',
    'for-each',
  ];

  for (let i = 0; i < p.steps.length; i++) {
    const step = p.steps[i] as Record<string, unknown>;

    if (!step.op) {
      errors.push(`Step ${i}: Missing 'op' property`);
      continue;
    }

    if (!validOps.includes(step.op as string)) {
      errors.push(`Step ${i}: Unknown operation '${step.op}'`);
    }

    switch (step.op) {
      case 'copy':
        if (!step.from) errors.push(`Step ${i} (copy): Missing 'from'`);
        if (!step.to) errors.push(`Step ${i} (copy): Missing 'to'`);
        break;
      case 'set':
        if (!step.path) errors.push(`Step ${i} (set): Missing 'path'`);
        if (step.value === undefined && !step.valueFrom) {
          errors.push(`Step ${i} (set): Must have either 'value' or 'valueFrom'`);
        }
        break;
      case 'append-to-array':
        if (!step.to) errors.push(`Step ${i} (append-to-array): Missing 'to'`);
        if (!step.value) errors.push(`Step ${i} (append-to-array): Missing 'value'`);
        break;
      case 'parse-json-from-md':
        if (!step.fromFile) errors.push(`Step ${i} (parse-json-from-md): Missing 'fromFile'`);
        if (!step.to) errors.push(`Step ${i} (parse-json-from-md): Missing 'to'`);
        break;
      case 'render-markdown':
        if (!step.templateRef) errors.push(`Step ${i} (render-markdown): Missing 'templateRef'`);
        if (!step.data) errors.push(`Step ${i} (render-markdown): Missing 'data'`);
        if (!step.outputFile) errors.push(`Step ${i} (render-markdown): Missing 'outputFile'`);
        break;
      case 'switch':
        if (!step.discriminator) errors.push(`Step ${i} (switch): Missing 'discriminator'`);
        if (!step.cases) errors.push(`Step ${i} (switch): Missing 'cases'`);
        break;
      case 'apply-scratchpad-ops':
        if (!step.from) errors.push(`Step ${i} (apply-scratchpad-ops): Missing 'from'`);
        break;
      case 'apply-workbench-section-ops':
        if (!step.from) errors.push(`Step ${i} (apply-workbench-section-ops): Missing 'from'`);
        break;
      case 'truncate-section':
        if (!step.path) errors.push(`Step ${i} (truncate-section): Missing 'path'`);
        if (step.maxChars === undefined || typeof step.maxChars !== 'number') {
          errors.push(`Step ${i} (truncate-section): Missing or invalid 'maxChars'`);
        }
        break;
      case 'pick-context':
        if (!Array.isArray(step.include) || step.include.length === 0) {
          errors.push(`Step ${i} (pick-context): Missing or empty 'include'`);
        }
        break;
      case 'drop':
        if (!step.path) errors.push(`Step ${i} (drop): Missing 'path'`);
        break;
      case 'truncate-history':
        if (typeof step.keep !== 'number') errors.push(`Step ${i} (truncate-history): Missing 'keep'`);
        break;
      case 'include-if':
        if (!step.path) errors.push(`Step ${i} (include-if): Missing 'path'`);
        if (!step.condition) errors.push(`Step ${i} (include-if): Missing 'condition'`);
        break;
      case 'pick-files':
        if (!step.paths) errors.push(`Step ${i} (pick-files): Missing 'paths'`);
        break;
      case 'merge-files-to-context':
        break;
      case 'merge-workbench-sections':
        if (!step.from) errors.push(`Step ${i} (merge-workbench-sections): Missing 'from'`);
        if (!step.to) errors.push(`Step ${i} (merge-workbench-sections): Missing 'to'`);
        break;
      case 'summarize-files':
        break;
      case 'for-each':
        if (!step.arrayPath) errors.push(`Step ${i} (for-each): Missing 'arrayPath'`);
        if (!step.as) errors.push(`Step ${i} (for-each): Missing 'as'`);
        if (!Array.isArray(step.steps) || step.steps.length === 0) {
          errors.push(`Step ${i} (for-each): Missing or empty 'steps'`);
        }
        break;
    }
  }

  return errors;
}
