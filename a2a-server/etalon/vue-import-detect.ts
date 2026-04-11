/**
 * vue-import-detect — Etalon script.
 * Produced by decomposition scenario (vue-import-fix).
 * Detects broken imports by parsing imports and checking file existence.
 * Supports tsconfig paths + Vite resolve.alias. Skips package imports.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
export const SCRIPT_ID = "vue-import-detect";

export interface BrokenImport {
  file: string;
  line: number;
  specifier: string;
}

const IMPORT_RE = /(?:from\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;

function stripQuery(s: string): string {
  return s.replace(/[?#].*$/, "");
}

export function detectBrokenImports(
  rootDir: string,
  tsconfigPath?: string,
  viteConfigPath?: string,
): BrokenImport[] {
  const root = resolve(rootDir);
  const paths = loadAliases(root, tsconfigPath, viteConfigPath);
  const baseDir = tsconfigPath ? resolve(dirname(tsconfigPath)) : root;
  const broken: BrokenImport[] = [];
  for (const file of collectFiles(root, [".ts", ".tsx", ".vue"])) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let m: RegExpExecArray | null;
      IMPORT_RE.lastIndex = 0;
      while ((m = IMPORT_RE.exec(lines[i])) !== null) {
        const spec = stripQuery(m[1]);
        if (isPackageImport(spec)) continue;
        if (spec.startsWith(".")) {
          const resolved = resolve(dirname(file), spec);
          if (!resolveExists(resolved))
            broken.push({ file, line: i + 1, specifier: spec });
        } else if (Object.keys(paths).length) {
          const resolved = resolveAlias(spec, baseDir, paths);
          if (resolved && !resolveExists(resolved))
            broken.push({ file, line: i + 1, specifier: spec });
        }
      }
    }
  }
  return broken;
}

function isPackageImport(spec: string): boolean {
  if (spec.startsWith(".")) return false;
  if (spec.startsWith("@/")) return false;
  if (spec.startsWith("@a2a/")) return false;
  if (/^@(components|utils|lib|features)\//.test(spec)) return false;
  if (/^@[\w-]+\//.test(spec)) return true;
  if (spec.startsWith("#")) return true;
  return !spec.includes("/");
}

function collectFiles(
  dir: string,
  exts: string[],
  out: string[] = [],
): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.name === "node_modules") continue;
    if (e.isDirectory()) collectFiles(full, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

function resolveExists(p: string): boolean {
  return (
    existsSync(p) ||
    existsSync(p + ".ts") ||
    existsSync(p + ".vue") ||
    existsSync(join(p, "index.ts"))
  );
}

function loadAliases(
  rootDir: string,
  tsconfigPath?: string,
  viteConfigPath?: string,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (tsconfigPath) {
    Object.assign(out, readTsconfigPaths(tsconfigPath));
  }
  if (viteConfigPath) {
    Object.assign(out, readViteAliases(viteConfigPath, rootDir));
  }
  return out;
}

function readTsconfigPaths(tsconfigPath: string): Record<string, string[]> {
  try {
    const raw = readFileSync(tsconfigPath, "utf-8");
    const json = JSON.parse(raw) as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    return json.compilerOptions?.paths ?? {};
  } catch {
    return {};
  }
}

function readViteAliases(
  viteConfigPath: string,
  _rootDir: string,
): Record<string, string[]> {
  try {
    const raw = readFileSync(viteConfigPath, "utf-8");
    const aliasMatch = raw.match(/alias:\s*\{([^}]+)\}/s);
    if (!aliasMatch) return {};
    const block = aliasMatch[1];
    const pairs: Record<string, string[]> = {};
    const re = /['"]([^'"]+)['"]\s*:\s*['"]([^'"]*)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block)) !== null) {
      const key = m[1];
      const val = m[2].replace(/^\.\//, "").replace(/^\//, "");
      const k =
        key === "@" ? "@/*" : key.endsWith("/") ? key + "*" : key + "/*";
      const v = val.endsWith("/") ? val + "*" : val ? val + "/*" : "./";
      pairs[k] = [v];
    }
    return pairs;
  } catch {
    return {};
  }
}

function resolveAlias(
  spec: string,
  baseDir: string,
  paths: Record<string, string[]>,
): string | null {
  for (const [pattern, targets] of Object.entries(paths)) {
    const starIdx = pattern.indexOf("*");
    const prefix = starIdx >= 0 ? pattern.slice(0, starIdx) : pattern;
    if (spec === prefix || spec.startsWith(prefix)) {
      const suffix = starIdx >= 0 ? spec.slice(prefix.length) : "";
      const target = targets[0]?.replace("*", suffix);
      if (target) return resolve(baseDir, target);
    }
  }
  return null;
}
