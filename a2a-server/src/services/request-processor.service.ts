/**
 * Request Processor Service
 * Processes requests: recognizes entities, builds graph, activates neurons
 * 
 * IMPORTANT: Server does NOT store client data!
 * Graph is passed in context and returned in response.
 * 
 * Flow:
 * 1. Get pending request
 * 2. Parse graph from context (from client)
 * 3. Extract frameworks from package.json/composer.json (if present)
 * 4. Recognize entities from codeBlocks
 * 5. Merge recognized into existing graph
 * 6. Activate neurons
 * 7. Return result with updated graph
 */

import { requestService } from './request.service.js';
import { logger } from '../utils/logger.js';
import { activateNeurons } from './neuron-activator.service.js';
import { recognizeEntitiesBatch } from './entity-recognizer.service.js';
import { 
  parseGraphFromContext,
  mergeRecognizedIntoGraph,
  isGraphComplete,
  getGraphStats,
  isGraphEmpty,
  type Graph 
} from './graph-store.service.js';
import { 
  extractFrameworks, 
  hasInitialProjectFiles,
  getFrameworkTriggers,
  type ExtractedFrameworks 
} from './framework-extractor.service.js';
import type { CodeBlock } from '../types/entity.types.js';

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

  const { promiseId, context, codeBlocks } = request;
  const ctx = (context as Record<string, unknown>) ?? {};

  try {
    const taskText = parseTaskText(ctx);
    const blocks = parseCodeBlocks(codeBlocks);
    
    logger.info('[RequestProcessor] Processing request', { 
      promiseId, 
      hasCodeBlocks: blocks.length > 0,
      hasInitialFiles: hasInitialProjectFiles(blocks),
    });

    // Step 1: Extract frameworks from package.json/composer.json (if present)
    let frameworks: ExtractedFrameworks | undefined;
    let frameworkTriggers: string[] = [];
    
    if (hasInitialProjectFiles(blocks)) {
      frameworks = extractFrameworks(blocks);
      frameworkTriggers = getFrameworkTriggers(frameworks);
      
      logger.info('[RequestProcessor] Frameworks extracted', {
        frontend: frameworks.frontend,
        backend: frameworks.backend,
        triggers: frameworkTriggers,
      });
    }

    // Step 2: Parse existing graph from context (from client)
    const existingGraph = parseGraphFromContext(ctx);
    
    logger.debug('[RequestProcessor] Existing graph', { 
      entityCount: existingGraph.entities.length,
      relationCount: existingGraph.relations.length 
    });
    
    // Step 5: Recognize entities from codeBlocks
    let updatedGraph = existingGraph;
    let recognitionResult: { count: number; types: Record<string, number> } | undefined;
    
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
      
      // Step 6: Merge recognized into existing graph
      updatedGraph = mergeRecognizedIntoGraph(existingGraph, { entities, relations });
      
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
    
    // Step 7: Check if graph is complete
    const completeness = isGraphComplete(updatedGraph, { taskText });
    
    if (!completeness.complete) {
      // Graph incomplete - generate questions
      const questions = generateQuestions(completeness.missing, updatedGraph);
      
      await requestService.updateStatus(promiseId, 'completed', {
        outcome: 'graph_incomplete',
        message: 'Graph incomplete, need more context',
        context: { 
          ...ctx, // Preserves new_task!
          graph: updatedGraph,
          frameworks,
        },
        graph: updatedGraph,
        graph_stats: getGraphStats(updatedGraph),
        questions,
        missing: completeness.missing,
        frameworks, // Include frameworks in response
      });
      
      logger.info('[RequestProcessor] Graph incomplete', { 
        promiseId, 
        missing: completeness.missing,
        questionCount: questions.length,
        frameworks: frameworks?.frontend,
      });
      
      return { 
        outcome: 'graph_incomplete', 
        graph: updatedGraph, 
        questions, 
        missing: completeness.missing,
        frameworks,
      };
    }
    
    // Step 8: Activate neurons
    const activationResult = activateNeurons({
      taskText,
      codeBlocks: blocks,
      architecturalFeatures: [], // Removed architectural_features from protocol
      frameworkTriggers, // Pass framework triggers for neuron activation
    });

    const activatedIds = activationResult.activatedNeurons.map((a) => a.neuron.id);
    const requestFiles = Array.from(new Set([...(activationResult.requestFiles ?? []), ...((ctx['request_files'] as string[]) ?? [])]));

    // Step 9: Return completed result with updated graph
    await requestService.updateStatus(promiseId, 'completed', {
      outcome: 'completed',
      message: 'Request processed successfully',
      context: { 
        ...ctx, // Preserves new_task!
        graph: updatedGraph,
        frameworks,
      },
      graph: updatedGraph,
      graph_stats: getGraphStats(updatedGraph),
      injected_content: activationResult.injectedContent,
      activated_neuron_ids: activatedIds,
      entities: recognitionResult,
      frameworks, // Include frameworks in response
      questions: [],
      index_answers: [],
    });
    
    logger.info('[RequestProcessor] Completed', { 
      promiseId, 
      activatedCount: activatedIds.length, 
      activatedIds: activatedIds.slice(0, 5),
      entityCount: updatedGraph.entities.length,
      relationCount: updatedGraph.relations.length
    });
    
    return { 
      outcome: 'completed', 
      graph: updatedGraph, 
      entities: recognitionResult,
      frameworks,
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
  const result = await processOneRequest();
  if (result?.outcome === 'failed') {
    // Don't stop processor on failure, continue processing
    logger.warn('[RequestProcessor] Request failed, continuing...');
  }
}

export function startRequestProcessor(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  if (timerId) return;
  logger.info('[RequestProcessor] Started', { intervalMs });
  timerId = setInterval(() => {
    tick().catch((err) => {
      logger.error('[RequestProcessor] Tick error', { error: String(err) });
    });
  }, intervalMs);
}

export function stopRequestProcessor(): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    logger.info('[RequestProcessor] Stopped');
  }
}
