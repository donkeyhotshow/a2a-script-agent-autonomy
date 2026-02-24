import { logger } from '../utils/logger.js';

export type SOPRole = 'architect' | 'engineer' | 'reviewer' | 'evaluator';

export interface ModelRoute {
  modelId: string;
  provider: string;
  priority: number;
}

/**
 * LLMRouterService
 * Routes requests to specific models based on the required role and priority.
 */
export class LLMRouterService {
  private routes: Record<SOPRole, ModelRoute>;

  constructor() {
    // Default routes - can be overridden by environment variables
    this.routes = {
      architect: {
        modelId: process.env['LLM_MODEL_ARCHITECT'] || 'claude-3-5-sonnet-20240620',
        provider: 'anthropic',
        priority: 1,
      },
      engineer: {
        modelId: process.env['LLM_MODEL_ENGINEER'] || 'claude-3-5-sonnet-20240620',
        provider: 'anthropic',
        priority: 1,
      },
      reviewer: {
        modelId: process.env['LLM_MODEL_REVIEWER'] || 'gpt-4o',
        provider: 'openai',
        priority: 1,
      },
      evaluator: {
        modelId: process.env['LLM_MODEL_EVALUATOR'] || 'gpt-4o-mini',
        provider: 'openai',
        priority: 2,
      }
    };
  }

  /**
   * Gets the recommended model for a specific role
   */
  public getRouteForRole(role: SOPRole): ModelRoute {
    const route = this.routes[role];
    logger.info(`LLMRouter: Assigned model ${route.modelId} for role ${role}`);
    return route;
  }

  /**
   * Updates a route at runtime
   */
  public updateRoute(role: SOPRole, route: ModelRoute): void {
    this.routes[role] = route;
    logger.info(`LLMRouter: Updated route for ${role}`, { route });
  }
}

export const llmRouterService = new LLMRouterService();
