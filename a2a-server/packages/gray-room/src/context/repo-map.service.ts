/**
 * RepoMapService — generates a concise markdown directory tree for the repo.
 *
 * Walks the filesystem starting from `repoRoot` using Node.js `fs.Dirent`
 * to avoid spawning child processes.  Respects a configurable ignore list
 * (node_modules, .git, dist, _deprecated, .cache by default).
 */

import { promises as fs } from 'node:fs';
import { join, relative } from 'node:path';
import { logger } from '@a2a/server-utils/logger';

const DEFAULT_IGNORE = new Set([
    'node_modules', '.git', 'dist', '.cache', '.turbo',
    '_deprecated', '_completed', 'coverage', '.nyc_output',
]);

const MAX_DEPTH = 4;
const MAX_ENTRIES = 200;

export class RepoMapService {
    private readonly ignore: Set<string>;

    constructor(ignoreNames?: string[]) {
        this.ignore = ignoreNames
            ? new Set([...DEFAULT_IGNORE, ...ignoreNames])
            : DEFAULT_IGNORE;
    }

    async generateMapMd(repoRoot: string): Promise<string> {
        logger.info('[RepoMapService] Generating repo map', { repoRoot });

        const lines: string[] = [`# Repository Map`, ``, `Root: \`${repoRoot}\``, ``];
        let entryCount = 0;

        const walk = async (dir: string, depth: number): Promise<void> => {
            if (depth > MAX_DEPTH || entryCount >= MAX_ENTRIES) return;
            let entries: Awaited<ReturnType<typeof fs.readdir>>;
            try {
                entries = await fs.readdir(dir, { withFileTypes: true });
            } catch {
                return;
            }

            const sorted = entries.sort((a, b) => {
                if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
                return a.isDirectory() ? -1 : 1; // dirs first
            });

            for (const entry of sorted) {
                if (this.ignore.has(entry.name) || entry.name.startsWith('.')) continue;
                if (entryCount >= MAX_ENTRIES) {
                    lines.push(`${'  '.repeat(depth)}… (truncated)`);
                    return;
                }

                const rel = relative(repoRoot, join(dir, entry.name));
                const indent = '  '.repeat(depth);
                if (entry.isDirectory()) {
                    lines.push(`${indent}- 📁 **${entry.name}/**`);
                    entryCount++;
                    await walk(join(dir, entry.name), depth + 1);
                } else if (entry.isFile()) {
                    lines.push(`${indent}- 📄 \`${entry.name}\` _(${rel})_`);
                    entryCount++;
                }
            }
        };

        await walk(repoRoot, 0);

        if (entryCount === 0) {
            lines.push('_(empty or unreadable directory)_');
        }

        logger.info('[RepoMapService] Map generated', { entries: entryCount });
        return lines.join('\n');
    }
}

export const repoMapService = new RepoMapService();
