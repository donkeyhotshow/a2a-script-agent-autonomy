import { logger } from '../../utils/logger.js';
import { resolveAiHubBaseUrl } from '../../utils/ai-hub-url.js';
import { fetchAiHubChatJson } from '../../utils/ai-hub-chat-sync.js';

export type LlmProvider = 'anthropic' | 'openai' | 'gemini' | 'ollama';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmRequest {
  provider?: LlmProvider;
  model?: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LlmResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class LlmService {
  private defaultProvider: LlmProvider;
  private defaultModel: string;

  constructor() {
    this.defaultProvider = (process.env.A2A_LLM_PROVIDER as LlmProvider) || 'ollama';
    this.defaultModel = process.env.A2A_LLM_MODEL || 'qwen3:8b';
  }

  async chat(request: LlmRequest): Promise<LlmResponse> {
    const provider = request.provider || this.defaultProvider;
    const model = request.model || this.defaultModel;

    logger.info('[LlmService] Routing request', { provider, model });

    switch (provider) {
      case 'ollama':
        return this.chatOllama(model, request);
      case 'openai':
      case 'gemini':
      case 'anthropic':
        // Placeholder for real API calls - in a real system we'd use SDKs or fetch
        // For now, let's assume we proxy everything to our existing AI Hub/Ollama logic
        return this.chatOllama(model, request);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  private async chatOllama(model: string, request: LlmRequest): Promise<LlmResponse> {
    const base = resolveAiHubBaseUrl();
    const r = await fetchAiHubChatJson(base, {
      model,
      messages: request.messages,
      stream: false,
      options: {
        temperature: request.temperature || 0.7,
        num_predict: request.maxTokens || 4096,
      },
    });
    if (!r.ok) {
      throw new Error(`AI hub error: ${r.status} ${r.bodyText}`);
    }
    const data = r.data;
    return {
      content: data.message?.content || '',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    };
  }

  async debate(task: string, context: any): Promise<{ plan: string; consensus: string }> {
    logger.info('[LlmService] Starting internal debate', { task: task.slice(0, 30) });
    
    const architectResponse = await this.chat({
      messages: [
        { role: 'system', content: 'You are the Architect. Propose a detailed implementation plan.' },
        { role: 'user', content: `Task: ${task}\nContext: ${JSON.stringify(context).slice(0, 500)}` }
      ]
    });

    const criticResponse = await this.chat({
      messages: [
        { role: 'system', content: 'You are the Critic. Evaluate the plan for bugs and flaws.' },
        { role: 'user', content: `Plan: ${architectResponse.content}` }
      ]
    });

    const finalResponse = await this.chat({
      messages: [
        { role: 'system', content: 'You are the Architect (Refining). Update your plan based on feedback.' },
        { role: 'user', content: `Original Plan: ${architectResponse.content}\nCritic Feedback: ${criticResponse.content}` }
      ]
    });

    return { 
      plan: finalResponse.content, 
      consensus: criticResponse.content 
    };
  }
}

export const llmService = new LlmService();
