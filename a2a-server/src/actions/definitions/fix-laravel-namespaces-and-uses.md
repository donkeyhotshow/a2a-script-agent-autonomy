# fix-laravel-namespaces-and-uses

Align Laravel / PHP `namespace` with PSR-4 paths and fix invalid `use` imports (mirrors websitestore `scripts/detect/*` and `fix_use_statements.php`).

**Priority:** 9

## Sub-actions (5 steps)

### 1. laravel-use-detect

Find `use` statements whose FQCN does not resolve under `app/` or `features/` (demo list when scan is empty).

**Input:** none  
**Output:** broken_uses[]

```typescript
export default async function run(input: { rootDir: string }): Promise<{ broken_uses: Array<{ file: string; line: number; fqcn: string }> }> {
  return { broken_uses: [] };
}
```

### 2. laravel-use-resolve

Map wrong FQCN → correct FQCN (fallback table + optional single-file class search).

**Input:** broken_uses[]  
**Output:** patches[]

```typescript
export default async function run(input: { broken_uses: unknown[] }): Promise<{ patches: unknown[] }> {
  return { patches: [] };
}
```

### 3. laravel-use-apply

Replace `from` with `to` on the affected lines.

**Input:** patches[]  
**Output:** fixed_files[]

```typescript
export default async function run(input: { patches: unknown[] }): Promise<{ fixed_files: unknown[] }> {
  return { fixed_files: [] };
}
```

### 4. laravel-use-cleanup

Remove `.patch`, `.tmp`, `.bak` artifacts (reported in final summary with composer step).

**Input:** none  
**Output:** cleanup_count

```typescript
export default async function run(input: { rootDir?: string }): Promise<{ cleanup_count: number }> {
  return { cleanup_count: 0 };
}
```

### 5. laravel-composer-autoload

Run `composer dump-autoload -o` after class / namespace fixes.

**Input:** none  
**Output:** `execute-command` result (`exitCode`, `stdout`)

```typescript
export default async function run(): Promise<{ command: string; exitCode: number }> {
  return { command: 'composer dump-autoload -o', exitCode: 0 };
}
```

## Context

- Framework: Laravel
- Layout: `features/business/<feature>/app/...` with namespaces `App\Features\Business\<Feature>\...` (websitestore.com.ua)
- Root `app/` for non–feature modules

## Triggers

- fix laravel namespace
- fix php use statements
- PSR-4 namespace
- composer dump-autoload
- виправити namespace laravel
- laravel use import
