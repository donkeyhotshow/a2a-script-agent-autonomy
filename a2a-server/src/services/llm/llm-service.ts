import { logger } from '../../utils/logger.js';

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
    const url = process.env.OLLAMA_URL || 'http://localhost:11435';
    
    // Using simple fetch to mirror existing pattern
    const res = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 4096
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as any;
    return {
      content: data.message?.content || '',
      model: data.model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      }
    };
  }
}

export const llmService = new LlmService();
