import * as ts from 'typescript';
import { VM } from 'vm2';

/** Max source size to limit parse / VM DoS. */
const MAX_TOOL_CODE_CHARS = 500_000;

const STATIC_DENY_PATTERNS: Array<{ re: RegExp; msg: string }> = [
  { re: /\bprocess\.exit\b/, msg: 'process.exit' },
  { re: /child_process/, msg: 'child_process' },
  { re: /\beval\s*\(/, msg: 'eval(' },
  { re: /\bnew\s+Function\b/, msg: 'new Function' },
  { re: /\bFunction\s*\(\s*['"`]/, msg: 'Function constructor from string' },
  { re: /import\s*\(\s*['"`]/, msg: 'dynamic import()' },
];

const FORBIDDEN_IDENTIFIERS = new Set([
  'process',
  'require',
  'global',
  'globalThis',
  'Buffer',
  'fetch',
]);

/**
 * Validate submitted `.skill.ts` body before writing to disk.
 * Layers: static patterns → TS parse + forbidden identifiers → transpile to CJS → vm2 VM (no require).
 */
export function validateSkillToolCodeForDeploy(toolCode: string): void {
  if (typeof toolCode !== 'string') {
    throw new Error('toolCode must be a string');
  }
  if (toolCode.length > MAX_TOOL_CODE_CHARS) {
    throw new Error(`toolCode exceeds ${MAX_TOOL_CODE_CHARS} characters`);
  }

  for (const { re, msg } of STATIC_DENY_PATTERNS) {
    if (re.test(toolCode)) {
      throw new Error(`Forbidden pattern: ${msg}`);
    }
  }

  const sourceFile = ts.createSourceFile(
    'skill.ts',
    toolCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  assertNoForbiddenIdentifiers(sourceFile);

  const js = transpileSkillToCommonJs(toolCode);
  assertTranspiledSafe(js);
  runInRestrictedVm(js);
}

function assertNoForbiddenIdentifiers(sourceFile: ts.SourceFile): void {
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && FORBIDDEN_IDENTIFIERS.has(node.text)) {
      throw new Error(`Forbidden identifier: ${node.text}`);
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) {
      if (FORBIDDEN_IDENTIFIERS.has(node.name.text)) {
        throw new Error(`Forbidden property access: .${node.name.text}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function transpileSkillToCommonJs(toolCode: string): string {
  const result = ts.transpileModule(toolCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: false,
    },
    fileName: 'skill.ts',
    reportDiagnostics: true,
  });

  const diags = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (diags.length > 0) {
    const msg = diags.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ');
    throw new Error(`TypeScript: ${msg}`);
  }

  return result.outputText;
}

function assertTranspiledSafe(js: string): void {
  if (/\brequire\s*\(/.test(js)) {
    throw new Error('Skill code must not load modules (remove imports / require)');
  }
  if (/\bimport\s*\(/.test(js)) {
    throw new Error('Transpiled code must not use dynamic import');
  }
  if (/\beval\s*\(/.test(js) || /\bnew\s+Function\b/.test(js)) {
    throw new Error('Transpiled code must not use eval/Function');
  }
}

function runInRestrictedVm(javascript: string): void {
  const moduleExports: Record<string, unknown> = {};
  const sandbox = {
    exports: moduleExports,
    module: { exports: moduleExports },
    __filename: '/virtual/skill.skill.ts',
    __dirname: '/virtual',
    console: {
      log: (): void => {},
      warn: (): void => {},
      error: (): void => {},
      info: (): void => {},
      debug: (): void => {},
    },
  };

  const vm = new VM({
    timeout: 3000,
    sandbox,
  });

  try {
    vm.run(javascript);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Sandbox execution failed: ${msg}`);
  }
}
