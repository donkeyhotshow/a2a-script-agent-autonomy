import { logger } from '../../../utils/logger.js';
import { llmService } from '../../llm/llm-service.js';

export interface Decision {
  action: string;
  reason: string;
  done: boolean;
  retry: boolean;
}

export class DecisionCell {
  async decide(sessionId: string, task: string, context: any): Promise<Decision> {
    logger.info('[DecisionCell] Evaluating state', { sessionId });

    const response = await llmService.chat({
      messages: [
        { role: 'system', content: 'You are a decision cell. Analyze the current context and task. Decide if the task is "done", needs "retry" (and with what action), or should "halt". Output JSON: { "action": "...", "reason": "...", "done": boolean, "retry": boolean }' },
        { role: 'user', content: `Task: ${task}\nContext: ${JSON.stringify(context, null, 2)}` }
      ]
    });

    try {
      const decision = JSON.parse(response.content) as Decision;
      logger.info('[DecisionCell] Decision made', { sessionId, action: decision.action, done: decision.done });
      return decision;
    } catch (e) {
      logger.error('[DecisionCell] Parse error', { sessionId, error: e });
      return { action: 'halt', reason: 'Failed to parse decision', done: false, retry: false };
    }
  }
}

export const decisionCell = new DecisionCell();
