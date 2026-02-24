/**
 * Workflow stages for the Role-based SOP pipeline.
 */
export type WorkflowStage = 'architect' | 'engineer' | 'reviewer';

export interface StageResult {
  stage: WorkflowStage;
  success: boolean;
  output?: any;
  error?: string;
}

export interface PipelineResult {
  promiseId: string;
  stages: StageResult[];
  finalOutcome: 'completed' | 'failed' | 'rejected';
  summary?: string;
}

export interface ArchitectPlan {
  summary: string;
  filesToModify: string[];
  filesToCreate: string[];
  impactedComponents: string[];
}

export interface ReviewerFeedback {
  approved: boolean;
  issues: string[];
  recommendations: string[];
}
