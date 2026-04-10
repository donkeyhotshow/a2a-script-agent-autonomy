# DecisionCell (archived implementation)

Source (removed from build): `a2a-server/src/services/core/request-processor/decision-cell.ts`.

```typescript
import { logger } from '../../../utils/logger.js';
import { tryParseJsonFromLlmText } from '../../../utils/strip-markdown-json-fence.js';
import { llmService } from '../../llm/llm-service.js';

export interface Decision {
  action: string;
  reason: string;
  done: boolean;
  retry: boolean;
}

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

    let response: Awaited<ReturnType<typeof llmService.chat>>;
    try {
      response = await llmService.chat({
        messages: [
          { role: 'system', content: 'You are a decision cell. Analyze the current context and task. Decide if the task is "done", needs "retry" (and with what action), or should "halt". Output valid JSON ONLY: { "action": "done|retry|halt|continue", "reason": "...", "done": boolean, "retry": boolean }' },
          { role: 'user', content: `Task: ${task}\nContext: ${JSON.stringify(context, null, 2)}` }
        ]
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn('[DecisionCell] LLM call failed', { sessionId, error: msg });
      return fallbackDecision(`LLM error: ${msg}`);
    }

    const content = response.content?.trim() || '';
    const parsed = tryParseJsonFromLlmText(content);
    const decision = parsed !== null ? validateDecision(parsed) : null;
    if (decision === null && content.length > 0) {
      logger.debug('[DecisionCell] JSON parse/validate failed', {
        sessionId,
        preview: content.slice(0, 120),
      });
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
```
