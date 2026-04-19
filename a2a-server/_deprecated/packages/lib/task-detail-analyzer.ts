/**
 * Task Detail Analyzer
 * Определяет уровень детализации входящей задачи: short/medium/detailed
 */

export type TaskDetailLevel = 'short' | 'medium' | 'detailed';

export interface TaskAnalysisResult {
    level: TaskDetailLevel;
    wordCount: number;
    charCount: number;
    hasTechnicalTerms: boolean;
    hasFilePaths: boolean;
    technicalTerms: string[];
    filePaths: string[];
    taskType: 'modification' | 'creation' | 'analysis' | 'unknown';
    needsContext: boolean;
    needsFiles: boolean;
    readyForAi: boolean;
}

// Technical terms that indicate a detailed task
const TECHNICAL_TERMS = [
    'laravel', 'vue', 'react', 'angular', 'inertia', 'api', 'rest',
    'controller', 'model', 'migration', 'service', 'middleware',
    'component', 'route', 'view', 'blade', 'typescript', 'javascript',
    'database', 'sql', 'mysql', 'postgresql', 'redis', 'queue',
    'authentication', 'authorization', 'jwt', 'oauth', 'cors', 'csrf',
    'testing', 'unit', 'feature', 'e2e', 'vitest', 'phpunit', 'jest',
    'docker', 'kubernetes', 'nginx', 'apache', 'aws', 'gcp', 'azure',
    'crud', 'restful', 'graphql',
    'repository', 'factory', 'seeder', 'request', 'resource',
    'observer', 'event', 'listener', 'mail', 'notification',
    'validation', 'authorization', 'policy', 'gate',
    'eloquent', 'query', 'relationship', 'scope',
    'props', 'emit', 'ref', 'reactive', 'computed', 'watch',
    'composable', 'store', 'pinia', 'vuex',
    'tailwind', 'css', 'scss', 'sass', 'responsive',
    'accessibility', 'a11y', 'seo',
    'performance', 'optimization', 'caching',
    'security', 'xss', 'csrf', 'injection',
];

// Regex patterns for file path detection
const FILE_PATH_PATTERNS = [
    /\/[a-zA-Z0-9_\-.]+\.[a-zA-Z]{2,}/,  // /path/file.ext
    /[a-zA-Z]:\\[a-zA-Z0-9_\-.]+/,        // Windows: C:\path\file
    /\.\/[a-zA-Z0-9_.\-/]+/,             // ./path/file
    /[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.\-/]+/, // directory/file
];

// Keywords that indicate task type
const TASK_TYPE_KEYWORDS = {
    modification: ['update', 'edit', 'modify', 'fix', 'change', 'add', 'remove', 'delete', 'refactor'],
    creation: ['create', 'generate', 'new', 'build', 'implement', 'add'],
    analysis: ['analyze', 'check', 'detect', 'find', 'review', 'audit', 'inspect'],
};

/**
 * Analyze task text and determine detail level
 */
export function analyzeTaskDetail(taskText: string): TaskAnalysisResult {
    if (!taskText || typeof taskText !== 'string') {
        return createDefaultResult();
    }

    const trimmed = taskText.trim();
    const charCount = trimmed.length;
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    // Check for technical terms
    const lowerText = trimmed.toLowerCase();
    const technicalTerms = TECHNICAL_TERMS.filter(term =>
        lowerText.includes(term.toLowerCase())
    );
    const hasTechnicalTerms = technicalTerms.length > 0;

    // Check for file paths
    const filePaths: string[] = [];
    for (const pattern of FILE_PATH_PATTERNS) {
        const matches = trimmed.match(new RegExp(pattern, 'gi'));
        if (matches) {
            filePaths.push(...matches);
        }
    }
    const hasFilePaths = filePaths.length > 0;

    // Determine task type
    const taskType = determineTaskType(words);

    // Calculate detail level
    const level = calculateDetailLevel({
        wordCount,
        charCount,
        hasTechnicalTerms,
        hasFilePaths,
        technicalTermsCount: technicalTerms.length,
    });

    return {
        level,
        wordCount,
        charCount,
        hasTechnicalTerms,
        hasFilePaths,
        technicalTerms,
        filePaths: [...new Set(filePaths)],
        taskType,
        needsContext: level === 'short',
        needsFiles: level === 'short' || level === 'medium',
        readyForAi: level === 'detailed',
    };
}

function determineTaskType(words: string[]): TaskAnalysisResult['taskType'] {
    for (const word of words) {
        const lower = word.toLowerCase();
        if (TASK_TYPE_KEYWORDS.modification.some(k => lower.includes(k))) {
            return 'modification';
        }
        if (TASK_TYPE_KEYWORDS.creation.some(k => lower.includes(k))) {
            return 'creation';
        }
        if (TASK_TYPE_KEYWORDS.analysis.some(k => lower.includes(k))) {
            return 'analysis';
        }
    }
    return 'unknown';
}

interface DetailLevelParams {
    wordCount: number;
    charCount: number;
    hasTechnicalTerms: boolean;
    hasFilePaths: boolean;
    technicalTermsCount: number;
}

function calculateDetailLevel(params: DetailLevelParams): TaskDetailLevel {
    const {wordCount, charCount, hasTechnicalTerms, hasFilePaths, technicalTermsCount} = params;

    // Detailed: long text with technical terms and/or file paths
    if (
        (wordCount >= 10 && charCount >= 50 && hasTechnicalTerms && technicalTermsCount >= 2) ||
        (wordCount >= 15 && charCount >= 80) ||
        (hasTechnicalTerms && hasFilePaths)
    ) {
        return 'detailed';
    }

    // Medium: moderate length or has some technical context
    if (
        (wordCount >= 5 && charCount >= 25 && hasTechnicalTerms) ||
        (wordCount >= 8 && charCount >= 40) ||
        hasFilePaths
    ) {
        return 'medium';
    }

    // Short: brief, vague, or missing context
    return 'short';
}

function createDefaultResult(): TaskAnalysisResult {
    return {
        level: 'short',
        wordCount: 0,
        charCount: 0,
        hasTechnicalTerms: false,
        hasFilePaths: false,
        technicalTerms: [],
        filePaths: [],
        taskType: 'unknown',
        needsContext: true,
        needsFiles: true,
        readyForAi: false,
    };
}

/**
 * Get suggested neurons based on task detail level
 */
export function getNeuronsByLevel(level: TaskDetailLevel): string[] {
    const neuronMap: Record<TaskDetailLevel, string[]> = {
        short: [
            'neuron-project-context-detector',
            'neuron-task-semantic-analyzer',
        ],
        medium: [
            'neuron-task-semantic-analyzer',
            'neuron-file-collector',
            'neuron-project-context-detector',
        ],
        detailed: [
            'neuron-task-semantic-analyzer',
            'neuron-project-context-detector',
            'neuron-file-collector',
        ],
    };

    return neuronMap[level] || neuronMap.short;
}
