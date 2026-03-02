/**
 * File relevance scoring for RAG indexing/search.
 * Combines lightweight heuristics with optional ML model hook.
 */

export type FileRelevanceLabel = 'important' | 'normal' | 'low' | 'ignore-candidate';

export interface FileRelevanceFeatures {
    /** Project-relative path (POSIX-style, `/`-separated) */
    relativePath: string;
    /** File extension including dot, e.g. ".ts" */
    ext: string;
    /** File size in bytes */
    size: number;
}

export interface FileRelevanceScore {
    /** Final relevance multiplier in range ~[0.2, 1.2] */
    relevance: number;
    /** Discrete label for easier filtering */
    label: FileRelevanceLabel;
    /** Human-readable reasons used to build this score */
    reasons: string[];
}

/**
 * Optional ML model interface.
 * Implementations can be trained on a dataset of project files
 * and plugged into the scorer via RAG config.
 */
export interface FileRelevanceModel {
    /**
     * Return value should be in [0, 1], where:
     *  - 1.0 = highly relevant
     *  - 0.0 = should almost certainly be ignored
     */
    predict(features: FileRelevanceFeatures): number;
}

function clamp(value: number, min: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

function tokenizePath(relativePath: string): string[] {
    const normalized = relativePath.toLowerCase().replace(/\\/g, '/');
    const parts = normalized.split('/');
    const tokens: string[] = [];

    for (const part of parts) {
        if (!part) continue;
        const base = part.split('.')[0] ?? part;
        tokens.push(...base.split(/[-_]/g));
    }

    return tokens.filter(Boolean);
}

/**
 * Pure heuristic scoring.
 * This is the baseline that is always available, even without ML.
 */
function heuristicScore(features: FileRelevanceFeatures): FileRelevanceScore {
    const reasons: string[] = [];
    const relPath = features.relativePath.toLowerCase();
    const fileName = relPath.split('/').pop() ?? '';
    const ext = features.ext.toLowerCase();
    const size = features.size;
    const tokens = tokenizePath(features.relativePath);

    let score = 1.0;

    // Obvious archive/binary formats – almost never useful for RAG
    const archiveExts = ['.zip', '.tar', '.tar.gz', '.tgz', '.gz', '.rar', '.7z', '.bz2'];
    if (archiveExts.some((e) => ext === e)) {
        score *= 0.2;
        reasons.push('archive-extension');
    }

    // Backup / copy / old variants
    if (/[.~](bak|backup)?$/.test(fileName) || /\b(copy|backup|old)\b/.test(fileName)) {
        score *= 0.3;
        reasons.push('backup-filename');
    }

    // Low-signal storage / cache / logs paths
    const lowSignalDirs = [
        '/storage/',
        '/backups/',
        '/backup/',
        '/archives/',
        '/archive/',
        '/tmp/',
        '/temp/',
        '/logs/',
        '/log/',
        '/cache/',
        '/coverage/',
    ];
    if (lowSignalDirs.some((segment) => relPath.includes(segment))) {
        score *= 0.4;
        reasons.push('low-signal-directory');
    }

    // Very large files are usually not good RAG sources
    if (size > 5 * 1024 * 1024) {
        score *= 0.3;
        reasons.push('very-large-file');
    } else if (size > 1 * 1024 * 1024) {
        score *= 0.6;
        reasons.push('large-file');
    }

    // Configuration / lock files are rarely good RAG chunks
    const lockLike = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock'];
    if (lockLike.includes(fileName)) {
        score *= 0.4;
        reasons.push('lock-file');
    }

    // Token-based penalties for obviously low-signal paths
    const lowSignalTokens = [
        'log',
        'logs',
        'tmp',
        'temp',
        'cache',
        'backup',
        'backups',
        'archive',
        'archives',
        'dump',
        'dumps',
        'snapshot',
        'snapshots',
    ];
    let lowSignalHits = 0;
    for (const token of tokens) {
        if (lowSignalTokens.includes(token)) {
            lowSignalHits++;
        }
    }
    if (lowSignalHits > 0) {
        // Each hit reduces relevance a bit, capped via clamp later
        const factor = Math.max(0.2, 1 - lowSignalHits * 0.2);
        score *= factor;
        reasons.push('low-signal-tokens');
    }

    // Heterogeneous / noisy path structure (many unique, random-like segments)
    if (tokens.length >= 5) {
        const uniqueCount = new Set(tokens).size;
        const diversity = uniqueCount / tokens.length;
        if (diversity > 0.8) {
            score *= 0.7;
            reasons.push('heterogeneous-path-structure');
        }
    }

    // Penalize very random-looking segments (ids, hashes, timestamps in path)
    let randomLikeCount = 0;
    for (const token of tokens) {
        const hasDigits = /\d/.test(token);
        const longHexLike = /^[0-9a-f]{8,}$/i.test(token);
        if (longHexLike || (hasDigits && token.length >= 8)) {
            randomLikeCount++;
        }
    }
    if (randomLikeCount >= 2) {
        const factor = Math.max(0.2, 1 - randomLikeCount * 0.15);
        score *= factor;
        reasons.push('random-like-path-segments');
    }

    // Derive discrete label from final score
    const clamped = clamp(score, 0.2, 1.2);
    let label: FileRelevanceLabel = 'normal';
    if (clamped <= 0.25) label = 'ignore-candidate';
    else if (clamped < 0.6) label = 'low';
    else if (clamped > 0.9) label = 'important';

    return {
        relevance: clamped,
        label,
        reasons,
    };
}

/**
 * Main scoring entrypoint.
 * If ML model is provided, its prediction is blended with heuristics.
 */
export function scoreFileRelevance(
    features: FileRelevanceFeatures,
    model?: FileRelevanceModel
): FileRelevanceScore {
    const base = heuristicScore(features);

    if (!model) {
        return base;
    }

    let mlScore: number;
    try {
        mlScore = clamp(model.predict(features), 0, 1);
    } catch {
        // Fail-safe: if ML model throws, fall back to heuristics only
        return base;
    }

    // Simple blend: 50% heuristics, 50% ML
    const blended = clamp(0.5 * base.relevance + 0.5 * mlScore, 0.2, 1.2);
    let label: FileRelevanceLabel = 'normal';
    if (blended <= 0.25) label = 'ignore-candidate';
    else if (blended < 0.6) label = 'low';
    else if (blended > 0.9) label = 'important';

    const reasons = [...base.reasons];
    reasons.push('ml-blended');

    return {
        relevance: blended,
        label,
        reasons,
    };
}

