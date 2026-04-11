/**
 * Derive frameworks bucket from synthetic codeBlocks (e.g. package.json) for request context.
 */

import { logger } from "@a2a/server-utils/logger";

const FRONTEND = new Set([
    'vue',
    'react',
    'react-dom',
    'angular',
    'svelte',
    'next',
    'nuxt',
    'solid-js',
    'preact',
]);

const TESTING = new Set([
    'vitest',
    'jest',
    'mocha',
    'cypress',
    'playwright',
    '@playwright/test',
    '@testing-library/react',
    '@testing-library/vue',
]);

const BACKEND = new Set([
    'express',
    'fastify',
    'koa',
    '@nestjs/core',
    'nestjs',
    'hono',
    '@hono/node-server',
]);

function normalizeVersion(range: string): string {
    const trimmed = range.trim();
    const exact = trimmed.match(/(\d+\.\d+\.\d+)/)?.[1] ?? trimmed.match(/(\d+\.\d+)/)?.[1];
    if (exact) return exact;
    return trimmed.replace(/^[\^~>=<]+\s*/, '').split(/\s+/)[0] || trimmed;
}

function categorize(pkg: string): 'frontend' | 'backend' | 'testing' | null {
    const base = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
    if (FRONTEND.has(base) || FRONTEND.has(pkg)) return 'frontend';
    if (TESTING.has(base) || TESTING.has(pkg)) return 'testing';
    if (BACKEND.has(base) || BACKEND.has(pkg)) return 'backend';
    return null;
}

export type FrameworkBuckets = {
    frontend: string[];
    backend: string[];
    testing: string[];
};

export function detectFrameworksFromCodeBlocks(
    codeBlocks: Array<{ path?: string; content?: string }> | undefined
): FrameworkBuckets | undefined {
    if (!codeBlocks?.length) return undefined;

    const pkgBlock = codeBlocks.find((b) => {
        const p = (b.path ?? '').replace(/\\/g, '/').toLowerCase();
        return p === 'package.json' || p.endsWith('/package.json');
    });
    if (!pkgBlock?.content?.trim()) return undefined;

    let parsed: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    try {
        parsed = JSON.parse(pkgBlock.content) as typeof parsed;
    } catch (err: unknown) {
        logger.debug('[framework-from-codeblocks] package.json block is not valid JSON', {
            error: err instanceof Error ? err.message : String(err),
        });
        return undefined;
    }

    const merged: Record<string, string> = {
        ...(parsed.dependencies ?? {}),
        ...(parsed.devDependencies ?? {}),
    };

    const frontend: string[] = [];
    const backend: string[] = [];
    const testing: string[] = [];

    for (const [name, range] of Object.entries(merged)) {
        if (typeof range !== 'string') continue;
        const cat = categorize(name);
        if (!cat) continue;
        const ver = normalizeVersion(range);
        const label = `${name}@${ver}`;
        if (cat === 'frontend') frontend.push(label);
        else if (cat === 'testing') testing.push(label);
        else backend.push(label);
    }

    if (!frontend.length && !backend.length && !testing.length) return undefined;

    return { frontend, backend, testing };
}
