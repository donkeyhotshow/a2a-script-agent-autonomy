/**
 * vue-import-resolve — Etalon script.
 * Produced by decomposition scenario (vue-import-fix).
 * Resolves import paths using tsconfig paths + Vite resolve.alias.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve, relative, join } from "node:path";

export const SCRIPT_ID = "vue-import-resolve";

export interface ResolvedPatch {
  file: string;
  line: number;
  from: string;
  to: string;
}

export function resolveImports(
  brokenImports: Array<{ file: string; line: number; specifier: string }>,
  tsconfigPath: string,
  viteConfigPath?: string,
): ResolvedPatch[] {
  const baseDir = resolve(dirname(tsconfigPath));
  const config = loadAliases(tsconfigPath, viteConfigPath);
  const patches: ResolvedPatch[] = [];

  for (const imp of brokenImports) {
    let absPath: string | null = null;

    if (imp.specifier.startsWith(".")) {
      absPath = resolve(dirname(imp.file), imp.specifier);
      absPath = tryResolveExists(absPath);
    } else {
      absPath = resolvePath(imp.specifier, baseDir, config);
      if (absPath) {
        absPath = tryResolveExists(absPath);
      }
    }

    if (!absPath) {
      const base = imp.specifier.split(/[/\\]/).pop() ?? "";
      if (base) {
        const candidates = findAllCandidates(baseDir, base);
        if (candidates.length === 1) {
          absPath = candidates[0];
        }
      }
    }

    if (absPath && existsSync(absPath)) {
      const to = toImportSpecifier(absPath, imp.file);
      patches.push({ file: imp.file, line: imp.line, from: imp.specifier, to });
    }
  }

  return patches;
}

function findAllCandidates(rootDir: string, baseName: string): string[] {
  const out: string[] = [];
  const ext = /\.(ts|tsx|vue)$/;

  function walk(dir: string) {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.name === "node_modules") continue;
      if (e.isDirectory()) walk(full);
      else if (ext.test(e.name)) {
        const noExt = e.name.replace(ext, "");
        if (noExt === baseName || typoMatch(baseName, noExt)) out.push(full);
      }
    }
  }

  walk(rootDir);
  return out;
}

function toImportSpecifier(absTarget: string, fromFile: string): string {
  const fromDir = dirname(fromFile);
  let rel = relative(fromDir, absTarget).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  rel = rel.replace(/\.(ts|tsx|vue)$/, "");
  return rel;
}

function tryResolveExists(p: string): string | null {
  if (existsSync(p)) return p;
  for (const ext of [".ts", ".tsx", ".vue"]) {
    if (existsSync(p + ext)) return p + ext;
  }
  for (const indexName of ["index.ts", "index.tsx", "index.vue"]) {
    const indexPath = join(p, indexName);
    if (existsSync(indexPath)) return indexPath;
  }
  const dir = dirname(p);
  const base = p.split(/[/\\]/).pop() ?? "";
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir);
  for (const f of files) {
    const noExt = f.replace(/\.(ts|tsx|vue)$/, "");
    if (noExt === base) return join(dir, f);
    if (typoMatch(base, noExt)) return join(dir, f);
  }
  return null;
}

function typoMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  if (l.length - s.length > 1) return false;
  let i = 0;
  while (i < s.length && s[i] === l[i]) i++;
  return l.slice(i + 1) === s.slice(i) || l.slice(i) === s.slice(i + 1);
}

function loadAliases(
  tsconfigPath: string,
  viteConfigPath?: string,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (existsSync(tsconfigPath)) {
    Object.assign(out, readTsconfigPaths(tsconfigPath));
  }
  if (viteConfigPath && existsSync(viteConfigPath)) {
    Object.assign(out, readViteAliases(viteConfigPath, dirname(tsconfigPath)));
  }
  return out;
}

function readTsconfigPaths(tsconfigPath: string): Record<string, string[]> {
  const raw = readFileSync(tsconfigPath, "utf-8");
  const json = JSON.parse(raw) as {
    compilerOptions?: { paths?: Record<string, string[]> };
  };
  return json.compilerOptions?.paths ?? {};
}

function readViteAliases(
  viteConfigPath: string,
  baseDir: string,
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
      const k = key.includes("*")
        ? key
        : key === "@"
          ? "@/*"
          : key.endsWith("/")
            ? key + "*"
            : key + "/*";
      const v = val.includes("*")
        ? val
        : val.endsWith("/")
          ? val + "*"
          : val
            ? val + "/*"
            : "./";
      pairs[k] = [v];
    }
    return pairs;
  } catch {
    return {};
  }
}

function resolvePath(
  specifier: string,
  baseDir: string,
  paths: Record<string, string[]>,
): string | null {
  const sortedPatterns = Object.entries(paths).sort((a, b) => {
    const prefixA =
      a[0].indexOf("*") >= 0 ? a[0].slice(0, a[0].indexOf("*")) : a[0];
    const prefixB =
      b[0].indexOf("*") >= 0 ? b[0].slice(0, b[0].indexOf("*")) : b[0];
    return prefixB.length - prefixA.length;
  });

  for (const [pattern, targets] of sortedPatterns) {
    const starIdx = pattern.indexOf("*");
    const prefix = starIdx >= 0 ? pattern.slice(0, starIdx) : pattern;

    if (
      specifier === prefix ||
      (specifier.startsWith(prefix) &&
        (prefix.endsWith("/") ||
          specifier[prefix.length] === "/" ||
          specifier[prefix.length] === undefined))
    ) {
      const suffix = starIdx >= 0 ? specifier.slice(prefix.length) : "";
      const target = targets[0]?.replace("*", suffix);
      if (target) {
        return target.startsWith("/") || /^[A-Za-z]:/.test(target)
          ? target
          : resolve(baseDir, target);
      }
    }
  }
  return null;
}
