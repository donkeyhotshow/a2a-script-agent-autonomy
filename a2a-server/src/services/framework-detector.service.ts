/**
 * Lightweight framework detection from package.json / composer.json blobs (tests + tooling).
 */

export interface FrameworkDetectionResult {
    frontend: string[];
    backend: string[];
    testing: string[];
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function depVersion(deps: Record<string, unknown> | undefined, name: string): string | null {
    if (!deps || typeof deps !== 'object') return null;
    const v = deps[name];
    return typeof v === 'string' ? v : null;
}

export class FrameworkDetectorService {
    async extractFrameworks(
        files: Array<{path: string; content: string}>
    ): Promise<FrameworkDetectionResult> {
        const frontend: string[] = [];
        const backend: string[] = [];
        const testing: string[] = [];

        for (const f of files) {
            const p = f.path.replace(/\\/g, '/');
            if (p.endsWith('package.json')) {
                const pkg = safeJsonParse(f.content);
                if (!pkg) continue;
                const deps = {
                    ...(typeof pkg['dependencies'] === 'object' && pkg['dependencies'] !== null
                        ? (pkg['dependencies'] as Record<string, unknown>)
                        : {}),
                    ...(typeof pkg['devDependencies'] === 'object' && pkg['devDependencies'] !== null
                        ? (pkg['devDependencies'] as Record<string, unknown>)
                        : {}),
                };
                const vue = depVersion(deps, 'vue');
                if (vue) frontend.push(`vue@${vue.replace(/^[\^~]/, '')}`);
                const vit = depVersion(deps, 'vitest');
                if (vit) testing.push(`vitest@${vit.replace(/^[\^~]/, '')}`);
            }
            if (p.endsWith('composer.json')) {
                const comp = safeJsonParse(f.content);
                if (!comp) continue;
                const req =
                    typeof comp['require'] === 'object' && comp['require'] !== null
                        ? (comp['require'] as Record<string, unknown>)
                        : {};
                const laravel = depVersion(req, 'laravel/framework');
                if (laravel) backend.push(`laravel@${laravel.replace(/^[\^~]/, '')}`);
            }
        }

        return {frontend, backend, testing};
    }
}
