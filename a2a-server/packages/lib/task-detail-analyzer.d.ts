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
/**
 * Analyze task text and determine detail level
 */
export declare function analyzeTaskDetail(taskText: string): TaskAnalysisResult;
/**
 * Get suggested neurons based on task detail level
 */
export declare function getNeuronsByLevel(level: TaskDetailLevel): string[];
//# sourceMappingURL=task-detail-analyzer.d.ts.map