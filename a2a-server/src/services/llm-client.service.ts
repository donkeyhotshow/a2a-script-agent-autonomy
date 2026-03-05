/**
 * LLM Client Service
 * 
 * Подключение к Ollama через AI-Integration Proxy (порт 11434)
 * Поддержка streaming и non-streaming ответов
 * 
 * Использует существующий Ollama адаптер из services/ai/ollama-adapter.ts
 * и LLM адаптер из services/ai/llm-adapter.ts
 */

import { createOllamaPromise, waitForPromise, type PromiseStatus } from './ai/ollama-adapter.js';
import { logger } from '../utils/logger.js';

const AI_HUB_URL = process.env.AI_HUB_URL ?? 'http://localhost:11434';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? '2000', 10);
const POLL_TIMEOUT_MS = parseInt(process.env.POLL_TIMEOUT_MS ?? '120000', 10);

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMGenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onProgress?: (chunk: string) => void;
}

export interface LLMChatOptions extends LLMGenerateOptions {
  messages: LLMMessage[];
}

export interface LLMGenerateResult {
  text: string;
  model: string;
  done: boolean;
  promiseId?: string;
}

export interface LLMChatResult {
  message: LLMMessage;
  model: string;
  done: boolean;
  promiseId?: string;
}

/**
 * Default model - can be overridden via OLLAMA_MODEL env var
 */
export function getDefaultModel(): string {
  return (process.env.OLLAMA_MODEL ?? '').trim() || 'rnj-L';
}

/**
 * LLM Client для работы с Ollama через AI-Integration Proxy
 * 
 * @example
 * ```typescript
 * const llm = new LLMClient();
 * 
 * // Simple generate
 * const result = await llm.generate('What is TypeScript?');
 * 
 * // Chat with messages
 * const chatResult = await llm.chat([
 *   { role: 'system', content: 'You are a helpful assistant.' },
 *   { role: 'user', content: 'Hello!' }
 * ]);
 * 
 * // Streaming
 * await llm.generate('Count to 5', { stream: true, onProgress: (chunk) => console.log(chunk) });
 * ```
 */
export class LLMClient {
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}) {
    this.model = options.model ?? getDefaultModel();
    this.defaultTemperature = options.temperature ?? 0.7;
    this.defaultMaxTokens = options.maxTokens ?? 2048;
  }

  /**
   * Простой генеративный вызов - отправка одного промпта
   * 
   * @param prompt - Текстовый промпт
   * @param options - Опции генерации
   */
  async generate(prompt: string, options?: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const model = options?.model ?? this.model;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const maxTokens = options?.maxTokens ?? this.defaultMaxTokens;
    const stream = options?.stream ?? false;

    logger.debug('[LLMClient] Generate request', { model, prompt: prompt.substring(0, 100), stream });

    try {
      // Create promise for non-blocking request
      const { promiseId } = await createOllamaPromise({
        model,
        prompt,
        stream: false, // Always use non-streaming for promise-based API
      });

      logger.info('[LLMClient] Promise created', { promiseId, model });

      // Wait for completion
      const text = await waitForPromise(promiseId, (status: PromiseStatus) => {
        logger.debug('[LLMClient] Promise status', { promiseId, status: status.status });
      });

      return {
        text: text?.trim() ?? '',
        model,
        done: true,
        promiseId,
      };
    } catch (error) {
      logger.error('[LLMClient] Generate error', { error: String(error) });
      throw error;
    }
  }

  /**
   * Chat-based вызов - отправка массива сообщений
   * 
   * @param messages - Массив сообщений (роль + контент)
   * @param options - Опции генерации
   */
  async chat(messages: LLMMessage[], options?: LLMGenerateOptions): Promise<LLMChatResult> {
    const model = options?.model ?? this.model;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const maxTokens = options?.maxTokens ?? this.defaultMaxTokens;

    logger.debug('[LLMClient] Chat request', { model, messageCount: messages.length });

    try {
      // Build prompt from messages (Ollama format)
      const prompt = this.messagesToPrompt(messages);

      // Use generate endpoint with messages as prompt
      const result = await this.generate(prompt, {
        model,
        temperature,
        maxTokens,
        stream: options?.stream,
        onProgress: options?.onProgress,
      });

      return {
        message: {
          role: 'assistant',
          content: result.text,
        },
        model: result.model,
        done: result.done,
        promiseId: result.promiseId,
      };
    } catch (error) {
      logger.error('[LLMClient] Chat error', { error: String(error) });
      throw error;
    }
  }

  /**
   * Streaming генерация с callback для обработки чанков
   * 
   * Note: На данный момент AI-Integration Proxy использует promise-based API.
   * Для real-time streaming потребуется отдельная реализация.
   * 
   * @param prompt - Промпт
   * @param onProgress - Callback для каждого чанка
   */
  async *generateStream(prompt: string, options?: Omit<LLMGenerateOptions, 'stream'>): AsyncGenerator<string> {
    const model = options?.model ?? this.model;
    
    // Для стриминга используем прямой API Ollama (не через proxy)
    const response = await fetch(`${AI_HUB_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: {
          temperature: options?.temperature ?? this.defaultTemperature,
          num_predict: options?.maxTokens ?? this.defaultMaxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              yield data.response;
            }
            if (data.done) {
              return;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Проверка доступности Ollama
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${AI_HUB_URL}/health/ready`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Получение списка доступных моделей
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${AI_HUB_URL}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json() as { models?: Array<{ name: string }> };
      return data.models?.map(m => m.name) ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Конвертация массива сообщений в промпт для Ollama
   */
  private messagesToPrompt(messages: LLMMessage[]): string {
    const parts: string[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        parts.push(`System: ${msg.content}`);
      } else if (msg.role === 'user') {
        parts.push(`User: ${msg.content}`);
      } else if (msg.role === 'assistant') {
        parts.push(`Assistant: ${msg.content}`);
      }
    }

    parts.push('Assistant:');
    return parts.join('\n\n');
  }
}

/**
 * Default singleton instance
 */
let defaultClient: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!defaultClient) {
    defaultClient = new LLMClient();
  }
  return defaultClient;
}

export default LLMClient;
