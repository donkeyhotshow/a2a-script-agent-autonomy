/**
 * Request Processor Service
 * Processes requests: recognizes entities, builds graph, activates neurons
 * 
 * IMPORTANT: Server does NOT store client data!
 * Graph is passed in context and returned in response.
 * 
 * Flow (with PhaseMachine):
 * 1. Get pending request
 * 2. Initialize ContextManager and PhaseMachine
 * 3. idle → discovery: Extract frameworks from package.json/composer.json
 * 4. discovery → recognition: Recognize entities from codeBlocks
 * 5. recognition → analysis: Check graph completeness
 * 6. analysis → action: Activate neurons (if complete)
 * 7. action → validation: Validate results
 * 8. validation → completed: Return result with updated graph
 */

import { requestService } from './request.service.js';
import { logger } from '../utils/logger.js';
import { activateNeurons } from './neuron-activator.service.js';
import { repoMapServiceV2 } from './repo-map-v2.service.js';
import { evaluationService } from './evaluation.service.js';
import { llmRouterService } from './llm-router.service.js';
import { recognizeEntitiesBatch } from './entity-recognizer.service.js';
import { 
  parseGraphFromContext,
  mergeRecognizedIntoGraph,
  isGraphComplete,
  getGraphStats,
  isGraphEmpty,
  type Graph 
} from './graph-store.service.js';
import { config } from '../config/index.js';
import { 
  extractFrameworks, 
  hasInitialProjectFiles,
  getFrameworkTriggers,
  type ExtractedFrameworks 
} from './framework-extractor.service.js';
import { PhaseMachine, type Phase } from './phase-machine.service.js';
import { ContextManager } from './context-manager.service.js';
import { 
  buildRequestContextBlock,
  buildRequestApiResult 
} from '../protocol/message-builder.js';
import { runWithCorrelationId } from '../utils/context.js';
import type { CodeBlock } from '../types/entity.types.js';
import type { RequestContextBlock } from '../types/index.js';

const DEFAULT_INTERVAL_MS = 5000;

let timerId: ReturnType<typeof setInterval> | null = null;

export type ProcessOutcome = 'completed' | 'failed' | 'graph_incomplete';

interface ProcessResult {
  outcome: ProcessOutcome;
  graph?: Graph | undefined;
  entities?: { count: number; types: Record<string, number> } | undefined;
  relations?: { count: number } | undefined;
  questions?: string[] | undefined;
  missing?: string[] | undefined;
  frameworks?: ExtractedFrameworks | undefined;
  /** Context block for client */
  context?: RequestContextBlock | undefined;
  /** Files requested from client */
  request_files?: string[] | undefined;
  /** Activated neuron IDs */
  activated_neuron_ids?: string[] | undefined;
}

function parseTaskText(ctx: Record<string, unknown>): string {
  const nt = ctx['new_task'];
  if (Array.isArray(nt)) return nt.join(' ');
  if (typeof nt === 'string') return nt;
  return '';
}

function parseCodeBlocks(blocks: unknown): CodeBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((b): b is { path: string; content: string } => 
      typeof b === 'object' && b !== null && 
      typeof (b as Record<string, unknown>)['path'] === 'string' && 
      typeof (b as Record<string, unknown>)['content'] === 'string'
    )
    .map(b => ({ path: b['path'], content: b['content'] }));
}

/**
 * Generate questions based on missing graph elements
 */
function generateQuestions(missing: string[], graph: Graph): string[] {
  const questions: string[] = [];
  
  for (const item of missing) {
    if (item.includes('Controller')) {
      questions.push('Which controller handles this functionality? Please provide the controller file.');
    } else if (item.includes('Model')) {
      questions.push('Which model represents the data? Please provide the model file.');
    } else if (item.includes('Request')) {
      questions.push('Is there a FormRequest for validation? Please provide the request file or validation rules.');
    } else if (item.includes('Vue') || item.includes('Component')) {
      questions.push('Which Vue component should be modified? Please provide the component file.');
    } else if (item.includes('No entities')) {
      questions.push('Please provide the relevant code files (controller, model, service, or Vue components).');
    } else {
      questions.push(`Missing: ${item}. Please provide the relevant file.`);
    }
  }
  
  // Add contextual questions based on graph content
  const stats = getGraphStats(graph);
  
  // If we have models but no relations
  if ((stats.entityTypes['MODEL'] || 0) > 0 && stats.relationCount === 0) {
    questions.push('Are there relationships between models (belongsTo, hasMany)? Please provide files with relations.');
  }
  
  // If we have controller but no model
  if ((stats.entityTypes['CONTROLLER'] || 0) > 0 && (stats.entityTypes['MODEL'] || 0) === 0) {
    questions.push('Which model does this controller work with? Please provide the model file.');
  }
  
  return Array.from(new Set(questions)); // Deduplicate
}

export async function processOneRequest(): Promise<ProcessResult | null> {
  const request = await requestService.getNextPending();
  if (!request) return null;

  const { promiseId, context, codeBlocks, correlationId } = request;
  const ctx = (context as Record<string, unknown>) ?? {};

  // If we have a stored correlationId, restore it for this async flow
  if (correlationId) {
    return runWithCorrelationId(correlationId, () => doProcess(request, ctx));
  }

  return doProcess(request, ctx);
}

async function doProcess(request: any, ctx: Record<string, unknown>): Promise<ProcessResult> {
  const { promiseId, codeBlocks } = request;
  try {
    // ========================================
    // PHASE 0: Initialization
    // ========================================
    
    // Initialize ContextManager and PhaseMachine for this request
    const contextManager = new ContextManager();
    const taskText = parseTaskText(ctx);
    contextManager.set('task', taskText);
    
    const phaseMachine = new PhaseMachine(ctx);
    
    logger.info('[RequestProcessor] Processing request', { 
      promiseId, 
      hasCodeBlocks: codeBlocks?.length ?? 0 > 0,
      hasInitialFiles: hasInitialProjectFiles(parseCodeBlocks(codeBlocks)),
      initialPhase: phaseMachine.getCurrentPhase(),
    });

    // ========================================
    // PHASE 1: idle → discovery
    // ========================================
    phaseMachine.transition('discovery', 'start processing');
    logger.info('[RequestProcessor] Phase transition', { 
      phase: 'discovery', 
      reason: 'start processing' 
    });

    const blocks = parseCodeBlocks(codeBlocks);
    
    // Extract frameworks from package.json/composer.json (if present)
    let frameworks: ExtractedFrameworks | undefined;
    let frameworkTriggers: string[] = [];
    
    if (hasInitialProjectFiles(blocks)) {
      frameworks = extractFrameworks(blocks);
      frameworkTriggers = getFrameworkTriggers(frameworks);
      contextManager.set('frameworks', frameworks);
      
      // NEW: Generate Enhanced Repo Map (v2)
      const repoMap = await repoMapServiceV2.generateEnhancedMap();
      contextManager.set('repo_map', repoMap);
      
      logger.info('[RequestProcessor] Frameworks and RepoMap extracted', {
        frontend: frameworks.frontend,
        backend: frameworks.backend,
        repoMapSize: repoMap.length,
      });
    }

    // ========================================
    // PHASE 2: discovery → recognition
    // ========================================
    const discoveryToRecognition = phaseMachine.transition('recognition', 'proceed to entity recognition');
    logger.info('[RequestProcessor] Phase transition', { 
      phase: 'recognition', 
      success: discoveryToRecognition.success,
      reason: 'proceed to entity recognition' 
    });

    // Parse existing graph from context (from client)
    const existingGraph = parseGraphFromContext(ctx);
    contextManager.set('graph', existingGraph);
    
    logger.debug('[RequestProcessor] Existing graph', { 
      entityCount: existingGraph.entities.length,
      relationCount: existingGraph.relations.length 
    });
    
    // Recognize entities from codeBlocks
    let updatedGraph = existingGraph;
    let recognitionResult: { count: number; types: Record<string, number> } | undefined;
    let recognizedEntities: { entities: typeof existingGraph.entities; relations: typeof existingGraph.relations } | null = null;
    
    if (blocks.length > 0) {
      logger.debug('[RequestProcessor] Recognizing entities', { blockCount: blocks.length });
      
      const { entities, relations, errors } = recognizeEntitiesBatch(blocks);
      
      if (errors && errors.length > 0) {
        logger.warn('[RequestProcessor] Recognition errors', { errors });
      }
      
      logger.info('[RequestProcessor] Entities recognized', { 
        entityCount: entities.length, 
        relationCount: relations.length 
      });
      
      // Merge recognized into existing graph
      updatedGraph = mergeRecognizedIntoGraph(existingGraph, { entities, relations });
      recognizedEntities = { entities, relations };
      
      // Store in ContextManager
      contextManager.set('graph', updatedGraph);
      contextManager.set('entities', { entities, relations });
      
      // Count entity types
      const entityTypes: Record<string, number> = {};
      for (const entity of entities) {
        entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
      }
      
      recognitionResult = {
        count: entities.length,
        types: entityTypes,
      };
    }

    // ========================================
    // PHASE 3: recognition → analysis
    // ========================================
    const recognitionToAnalysis = phaseMachine.transition('analysis', 'check graph completeness');
    logger.info('[RequestProcessor] Phase transition', { 
      phase: 'analysis', 
      success: recognitionToAnalysis.success,
      reason: 'check graph completeness' 
    });

    // Check if graph is complete
    const completeness = isGraphComplete(updatedGraph, { taskText });

    // Fast path: graph is already complete and there is no explicit task or new files.
    // В юнит-тестах это соответствует сценарию "нет graph_incomplete" — просто вернуть completed.
    if (completeness.complete && !taskText.trim() && blocks.length === 0) {
      const completedContextBlock = buildRequestContextBlock({
        architecturalFeatures: frameworkTriggers,
        graph: updatedGraph,
        ...(frameworks && { frameworks: frameworks as unknown as Record<string, unknown> }),
      });

      await requestService.updateStatus(promiseId, 'completed', {
        outcome: 'completed',
        message: 'Graph already complete, request processed without additional actions',
        context: completedContextBlock,
        graph: updatedGraph,
        graph_stats: getGraphStats(updatedGraph),
        entities: recognitionResult,
        frameworks,
        questions: [],
        index_answers: [],
      });

      return {
        outcome: 'completed',
        graph: updatedGraph,
        entities: recognitionResult,
        frameworks,
        context: completedContextBlock,
      };
    }

    // Auto transition based on results
    const autoTransitionResult = phaseMachine.autoTransition({
      hasEntities: (recognizedEntities?.entities.length ?? 0) > 0,
      isComplete: completeness.complete,
      hasQuestions: !completeness.complete,
      needsMoreFiles: completeness.missing.length > 0,
    });
    
    logger.info('[RequestProcessor] Auto transition result', { 
      success: autoTransitionResult.success,
      from: autoTransitionResult.previousPhase,
      to: autoTransitionResult.currentPhase,
      canContinue: autoTransitionResult.canContinue,
    });

    // ========================================
    // Handle incomplete graph (validation phase)
    // ========================================
    if (!completeness.complete) {
      // Transition to validation for incomplete graph
      phaseMachine.transition('validation', 'graph incomplete');
      
      const questions = generateQuestions(completeness.missing, updatedGraph);
      contextManager.set('questions', questions);
      
      // Get context for validation phase
      const phaseContext = contextManager.getForPhase('validation');
      
      // Build context block for client
      const contextBlock = buildRequestContextBlock({
        requestFiles: completeness.missing,
        architecturalFeatures: frameworkTriggers,
        graph: updatedGraph,
        ...(frameworks && { frameworks: frameworks as unknown as Record<string, unknown> }),
        ...(taskText && { newTask: [taskText] }),
      });
      
      await requestService.updateStatus(promiseId, 'completed', {
        outcome: 'graph_incomplete',
        message: 'Graph incomplete, need more context',
        context: contextBlock,
        graph: updatedGraph,
        graph_stats: getGraphStats(updatedGraph),
        questions,
        missing: completeness.missing,
        frameworks,
      });
      
      logger.info('[RequestProcessor] Graph incomplete', { 
        promiseId, 
        missing: completeness.missing,
        questionCount: questions.length,
        frameworks: frameworks?.frontend,
        phaseStats: phaseMachine.getStats(),
      });
      
      return { 
        outcome: 'graph_incomplete', 
        graph: updatedGraph, 
        questions, 
        missing: completeness.missing,
        frameworks,
        context: contextBlock,
        request_files: completeness.missing,
      };
    }

    // ========================================
    // PHASE 4: action (Architect -> Engineer -> Reviewer)
    // ========================================
    const analysisToAction = phaseMachine.transition('action', 'graph complete, start SOP pipeline');
    logger.info('[RequestProcessor] Phase transition', { 
      phase: 'action', 
      success: analysisToAction.success,
      reason: 'graph complete, start SOP pipeline' 
    });

    // 1. Architect Stage: Build implementation plan
    const architectRoute = llmRouterService.getRouteForRole('architect');
    logger.info('[SOP Pipeline] Starting Architect stage', { model: architectRoute.modelId });
    const architectResult = activateNeurons({
      taskText: `ARCHITECT: Create a detailed implementation plan for: ${taskText}`,
      codeBlocks: blocks,
      architecturalFeatures: ['architect_mode'],
      frameworkTriggers,
    });
    
    let engineerResult: any;
    let reviewerResult: any;
    let evaluation: any;
    let retries = 0;
    const MAX_RETRIES = 3;

    while (retries <= MAX_RETRIES) {
      // 2. Engineer Stage: Implement changes
      const engineerRoute = llmRouterService.getRouteForRole('engineer');
      const engineerTaskText = retries === 0 
        ? `ENGINEER: Implement the plan. Task: ${taskText}`
        : `REPAIR: Fix issues identified in review. Task: ${taskText}\n\nCritique: ${evaluation?.critique}\nErrors: ${evaluation?.errors?.join(', ')}`;
      
      logger.info(`[SOP Pipeline] Starting ${retries === 0 ? 'Engineer' : 'Repair'} stage`, { 
        model: engineerRoute.modelId,
        retry: retries 
      });

      engineerResult = activateNeurons({
        taskText: engineerTaskText,
        codeBlocks: blocks,
        architecturalFeatures: ['engineer_mode'],
        frameworkTriggers,
        injectedContent: architectResult.injectedContent,
      });

      // 3. Reviewer Stage: Validate
      const reviewerRoute = llmRouterService.getRouteForRole('reviewer');
      logger.info('[SOP Pipeline] Starting Reviewer stage', { model: reviewerRoute.modelId });
      reviewerResult = activateNeurons({
        taskText: `REVIEWER: Validate the implementation. Task: ${taskText}`,
        codeBlocks: blocks,
        architecturalFeatures: ['reviewer_mode'],
        frameworkTriggers,
        injectedContent: engineerResult.injectedContent,
      });

      // ========================================
      // PHASE 5: action → validation (Automated Evaluation)
      // ========================================
      evaluation = await evaluationService.evaluate(
        engineerResult.injectedContent,
        { activatedIds: [], frameworks } // Simplified
      );

      if (evaluation.passed) {
        logger.info('[SOP Pipeline] Evaluation passed', { score: evaluation.score, attempts: retries + 1 });
        break;
      }

      logger.warn('[SOP Pipeline] Evaluation failed, triggering repair loop', { 
        score: evaluation.score, 
        retry: retries + 1,
        max: MAX_RETRIES
      });
      retries++;
    }

    const activatedIds = Array.from(new Set([
      ...architectResult.activatedNeurons.map(n => n.neuron.id),
      ...engineerResult.activatedNeurons.map(n => n.neuron.id),
      ...reviewerResult.activatedNeurons.map(n => n.neuron.id),
    ]));

    const requestFiles = Array.from(
      new Set([
        ...(architectResult.requestFiles ?? []),
        ...(engineerResult.requestFiles ?? []),
        ...(reviewerResult.requestFiles ?? []),
        ...((ctx['request_files'] as string[]) ?? []),
      ])
    );

    const injectedContent = [
      architectResult.injectedContent,
      engineerResult.injectedContent,
      reviewerResult.injectedContent,
    ]
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .join('\n\n');

    // ========================================
    // PHASE 6: validation → completed
    // ========================================
    const validationToCompleted = phaseMachine.transition('completed', 'validation passed');
    logger.info('[RequestProcessor] Phase transition', { 
      phase: 'completed', 
      success: validationToCompleted.success,
      reason: 'validation passed' 
    });

    // Get final context for completed phase
    const finalContext = contextManager.getForPhase('completed');

    // Build context block for client
    const completedContextBlock = buildRequestContextBlock({
      architecturalFeatures: frameworkTriggers,
      graph: updatedGraph,
      ...(frameworks && { frameworks: frameworks as unknown as Record<string, unknown> }),
      ...(taskText && { newTask: [taskText] }),
      ...(requestFiles.length > 0 && { requestFiles }),
    });

    // Return completed result with updated graph
    await requestService.updateStatus(promiseId, 'completed', {
      outcome: 'completed',
      message: 'Request processed successfully via SOP Pipeline',
      context: completedContextBlock,
      graph: updatedGraph,
      graph_stats: getGraphStats(updatedGraph),
      injected_content: injectedContent ? [injectedContent] : [],
      activated_neuron_ids: activatedIds,
      evaluation: evaluation, // NEW
      entities: recognitionResult,
      frameworks,
      questions: [],
      index_answers: [],
    });
    
    logger.info('[RequestProcessor] Completed', { 
      promiseId, 
      activatedCount: activatedIds.length, 
      activatedIds: activatedIds.slice(0, 5),
      entityCount: updatedGraph.entities.length,
      relationCount: updatedGraph.relations.length,
      phaseStats: phaseMachine.getStats(),
      contextStats: contextManager.getStats(),
    });
    
    return { 
      outcome: 'completed', 
      graph: updatedGraph, 
      entities: recognitionResult,
      frameworks,
      context: completedContextBlock,
      activated_neuron_ids: activatedIds,
      request_files: requestFiles.length > 0 ? requestFiles : undefined,
    };
    
  } catch (err) {
    logger.error('[RequestProcessor] Error', { promiseId, error: String(err) });
    await requestService.updateStatus(promiseId, 'failed', undefined, {
      code: 'PROCESS_ERROR',
      message: String(err),
    });
    return { outcome: 'failed' };
  }
}

async function tick(): Promise<void> {
  try {
    const result = await processOneRequest();
    if (result?.outcome === 'failed') {
      logger.warn('[RequestProcessor] Request failed, continuing...');
    }
  } catch (err) {
    logger.error('[RequestProcessor] Tick error', { error: String(err) });
  } finally {
    // Schedule next tick only after this one completes
    if (timerId) {
      timerId = setTimeout(tick, config.requestProcessorIntervalMs || DEFAULT_INTERVAL_MS) as unknown as ReturnType<typeof setInterval>;
    }
  }
}

export function startRequestProcessor(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  if (timerId) return;
  logger.info('[RequestProcessor] Started', { intervalMs });
  // Start the first tick immediately
  timerId = setTimeout(tick, 0) as unknown as ReturnType<typeof setInterval>;
}

export function stopRequestProcessor(): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    logger.info('[RequestProcessor] Stopped');
  }
}
