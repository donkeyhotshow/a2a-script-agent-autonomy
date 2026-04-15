/**
 * Task Detail Analyzer
 * Определяет уровень детализации входящей задачи: short/medium/detailed
 */
const TECHNICAL_TERMS = [
    "laravel",
    "vue",
    "react",
    "angular",
    "inertia",
    "api",
    "rest",
    "controller",
    "model",
    "migration",
    "service",
    "middleware",
    "component",
    "route",
    "view",
    "blade",
    "typescript",
    "javascript",
    "database",
    "sql",
    "mysql",
    "postgresql",
    "redis",
    "queue",
    "authentication",
    "authorization",
    "jwt",
    "oauth",
    "cors",
    "csrf",
    "testing",
    "unit",
    "feature",
    "e2e",
    "vitest",
    "phpunit",
    "jest",
    "docker",
    "kubernetes",
    "nginx",
    "apache",
    "aws",
    "gcp",
    "azure",
    "crud",
    "restful",
    "graphql",
    "repository",
    "factory",
    "seeder",
    "request",
    "resource",
    "observer",
    "event",
    "listener",
    "mail",
    "notification",
    "validation",
    "policy",
    "gate",
    "eloquent",
    "query",
    "relationship",
    "scope",
    "props",
    "emit",
    "ref",
    "reactive",
    "computed",
    "watch",
    "composable",
    "store",
    "pinia",
    "vuex",
    "tailwind",
    "css",
    "scss",
    "sass",
    "responsive",
    "accessibility",
    "a11y",
    "seo",
    "performance",
    "optimization",
    "caching",
    "security",
    "xss",
    "injection",
];
const FILE_PATH_PATTERNS = [
    /\/[a-zA-Z0-9_\-.]+\.[a-zA-Z]{2,}/,
    /[a-zA-Z]:\\[a-zA-Z0-9_\-.]+/,
    /\.\/[a-zA-Z0-9_.\-/]+/,
    /[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.\-/]+/,
];
const TASK_TYPE_KEYWORDS = {
    modification: ["update", "edit", "modify", "fix", "change", "add", "remove", "delete", "refactor"],
    creation: ["create", "generate", "new", "build", "implement", "add"],
    analysis: ["analyze", "check", "detect", "find", "review", "audit", "inspect"],
};
export function analyzeTaskDetail(taskText) {
    if (!taskText || typeof taskText !== "string") {
        return createDefaultResult();
    }
    const trimmed = taskText.trim();
    const charCount = trimmed.length;
    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const lowerText = trimmed.toLowerCase();
    const technicalTerms = TECHNICAL_TERMS.filter((term) => lowerText.includes(term));
    const hasTechnicalTerms = technicalTerms.length > 0;
    const filePaths = [];
    for (const pattern of FILE_PATH_PATTERNS) {
        const matches = trimmed.match(new RegExp(pattern, "gi"));
        if (matches)
            filePaths.push(...matches);
    }
    const hasFilePaths = filePaths.length > 0;
    const taskType = determineTaskType(words);
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
        technicalTerms: [...technicalTerms],
        filePaths: [...new Set(filePaths)],
        taskType,
        needsContext: level === "short",
        needsFiles: level === "short" || level === "medium",
        readyForAi: level === "detailed",
    };
}
function determineTaskType(words) {
    for (const word of words) {
        const lower = word.toLowerCase();
        if (TASK_TYPE_KEYWORDS.modification.some((k) => lower.includes(k)))
            return "modification";
        if (TASK_TYPE_KEYWORDS.creation.some((k) => lower.includes(k)))
            return "creation";
        if (TASK_TYPE_KEYWORDS.analysis.some((k) => lower.includes(k)))
            return "analysis";
    }
    return "unknown";
}
function calculateDetailLevel(params) {
    const { wordCount, charCount, hasTechnicalTerms, hasFilePaths, technicalTermsCount } = params;
    if ((wordCount >= 10 && charCount >= 50 && hasTechnicalTerms && technicalTermsCount >= 2) ||
        (wordCount >= 15 && charCount >= 80) ||
        (hasTechnicalTerms && hasFilePaths)) {
        return "detailed";
    }
    if ((wordCount >= 5 && charCount >= 25 && hasTechnicalTerms) || (wordCount >= 8 && charCount >= 40) || hasFilePaths) {
        return "medium";
    }
    return "short";
}
function createDefaultResult() {
    return {
        level: "short",
        wordCount: 0,
        charCount: 0,
        hasTechnicalTerms: false,
        hasFilePaths: false,
        technicalTerms: [],
        filePaths: [],
        taskType: "unknown",
        needsContext: true,
        needsFiles: true,
        readyForAi: false,
    };
}
export function getNeuronsByLevel(level) {
    const neuronMap = {
        short: ["neuron-project-context-detector", "neuron-task-semantic-analyzer"],
        medium: ["neuron-task-semantic-analyzer", "neuron-file-collector", "neuron-project-context-detector"],
        detailed: ["neuron-task-semantic-analyzer", "neuron-project-context-detector", "neuron-file-collector"],
    };
    return neuronMap[level] || neuronMap.short;
}
//# sourceMappingURL=task-detail-analyzer.js.map