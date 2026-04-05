import { logger } from '../../../utils/logger.js';
import { llmService } from '../../llm/llm-service.js';

export interface Decision {
  action: string;
  reason: string;
  done: boolean;
  retry: boolean;
}

/**
 * Validate Decision output from LLM - ensures contract compliance
 */
function validateDecision(raw: unknown): Decision | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const validActions = ['done', 'retry', 'halt', 'continue'];
  const action = typeof obj.action === 'string' && validActions.includes(obj.action.toLowerCase()) 
    ? obj.action.toLowerCase() 
    : null;
  if (!action) return null;
  
  return {
    action,
    reason: typeof obj.reason === 'string' ? obj.reason : 'No reason provided',
    done: typeof obj.done === 'boolean' ? obj.done : action === 'done',
    retry: typeof obj.retry === 'boolean' ? obj.retry : action === 'retry'
  };
}

/**
 * Fallback decision when LLM fails or returns invalid JSON
 */
function fallbackDecision(error: string): Decision {
  logger.warn('[DecisionCell] Using fallback decision', { error });
  return { 
    action: 'halt', 
    reason: `Fallback: ${error}`, 
    done: false, 
    retry: false 
  };
}

export class DecisionCell {
  private consecutiveErrors: number = 0;
  
  async decide(sessionId: string, task: string, context: any): Promise<Decision> {
    logger.info('[DecisionCell] Evaluating state', { sessionId });

    const response = await llmService.chat({
      messages: [
        { role: 'system', content: 'You are a decision cell. Analyze the current context and task. Decide if the task is "done", needs "retry" (and with what action), or should "halt". Output valid JSON ONLY: { "action": "done|retry|halt|continue", "reason": "...", "done": boolean, "retry": boolean }' },
        { role: 'user', content: `Task: ${task}\nContext: ${JSON.stringify(context, null, 2)}` }
      ]
    });

    // Try to extract and validate JSON from response
    const content = response.content?.trim() || '';
    let decision: Decision | null = null;
    
    // Try direct JSON parse first
    try {
      const parsed = JSON.parse(content);
      decision = validateDecision(parsed);
    } catch (err: unknown) {
      logger.debug('[DecisionCell] Direct JSON parse failed', {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          decision = validateDecision(parsed);
        } catch (err2: unknown) {
          logger.debug('[DecisionCell] Extracted JSON parse failed', {
            sessionId,
            error: err2 instanceof Error ? err2.message : String(err2),
          });
        }
      }
    }

    if (decision) {
      this.consecutiveErrors = 0;
      logger.info('[DecisionCell] Decision made', { 
        sessionId, 
        action: decision.action, 
        done: decision.done,
        retry: decision.retry 
      });
      return decision;
    }

    // Track consecutive errors for circuit breaking
    this.consecutiveErrors++;
    const isCircuitBroken = this.consecutiveErrors >= 3;
    
    if (isCircuitBroken) {
      logger.error('[DecisionCell] Circuit broken - too many errors', { 
        sessionId, 
        errors: this.consecutiveErrors 
      });
      return fallbackDecision('Circuit broken after 3 consecutive failures');
    }

    return fallbackDecision(`Invalid response: ${content.slice(0, 100)}`);
  }
}

export const decisionCell = new DecisionCell();
