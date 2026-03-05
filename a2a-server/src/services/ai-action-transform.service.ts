/**
 * AI-Action Transform Service
 * 
 * Сервис для интеграции трансформационных схем из a2a-server/prompts/transforms/
 * с LLM клиентом и Transform Runtime
 * 
 * Pipeline:
 * 1. Загрузить request transform из шаблона
 * 2. Применить трансформацию к входным данным
 * 3. Отправить результат в LLM
 * 4. Применить response transform к ответу LLM
 * 
 * Трансформации загружаются из:
 * - a2a-server/prompts/transforms/server-transforms-request.json (generic)
 * - a2a-server/prompts/transforms/server-transforms-response.json (generic)
 * - a2a-server/prompts/transforms/{action}-request.json (specific)
 * - a2a-server/prompts/transforms/{action}-response.json (specific)
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { runTransformPipeline, loadTransformPipeline, type TransformPipeline, type TransformResult } from '../transform/index.js';
import { LLMClient, getLLMClient, type LLMMessage, type LLMChatResult } from './llm-client.service.js';
import { logger } from '../utils/logger.js';

// Путь к директории с трансформациями (новый путь на сервере)
const TRANSFORMS_DIR = path.resolve(process.cwd(), 'a2a-server/prompts/transforms');

// Default prompts directory
const PROMPTS_DIR = path.resolve(process.cwd(), 'a2a-server/prompts');

// Map promptName to transform files
const TRANSFORM_MAP: Record<string, { request: string; response: string }> = {
  'auto-ai-request.md': {
    request: 'auto-ai-request.json',
    response: 'auto-ai-response.json',
  },
  'coder-request.md': {
    request: 'coder-request.json',
    response: 'coder-response.json',
  },
  'analyze-request.md': {
    request: 'analyze-request.json',
    response: 'analyze-response.json',
  },
};

export interface AIActionContext {
  /** Текущее состояние контекста */
  context: {
    history: Array<{ role: string; message?: string; step?: string }>;
    execution?: {
      action?: string;
      step?: string;
      progress?: number;
    };
    [key: string]: unknown;
  };
  /** Результат предыдущего действия */
  result?: {
    message?: string;
    [key: string]: unknown;
  };
  /** Действие на выполнение */
  execute?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AIActionTransformOptions {
  /** Путь к директории с трансформациями */
  transformsDir?: string;
  /** Путь к директории с промптами */
  promptsDir?: string;
  /** Map имен промптов к файлам трансформаций */
  transformMap?: Record<string, { request: string; response: string }>;
  /** Имя LLM модели */
  model?: string;
  /** Температура генерации */
  temperature?: number;
  /** Максимальное количество токенов */
  maxTokens?: number;
  /** LLM Client (если нужен кастомный) */
  llmClient?: LLMClient;
}

export interface AIActionResult {
  /** Текст ответа LLM */
  message: string;
  /** Текущий шаг */
  step: string;
  /** Выполняемое действие */
  execute: Record<string, unknown>;
  /** Завершена ли задача */
  completed: boolean;
  /** Полный контекст после трансформации */
  context: AIActionContext;
  /** Метаданные */
  metadata: {
    promiseId?: string;
    model: string;
    transformTime: number;
  };
}

/**
 * AIActionTransformService - сервис для работы с AI-Action трансформациями
 * 
 * @example
 * ```typescript
 * const service = new AIActionTransformService();
 * 
 * const result = await service.runAIAction({
 *   context: {
 *     history: [],
 *     execution: { step: 'start' }
 *   },
 *   result: {
 *     message: 'Analyze this code'
 *   }
 * });
 * 
 * console.log(result.step); // 'plan'
 * console.log(result.execute); // { 'read-file': { path: '...' } }
 * ```
 */
export class AIActionTransformService {
  private transformsDir: string;
  private promptsDir: string;
  private llmClient: LLMClient;
  private requestTransform: TransformPipeline | null = null;
  private responseTransform: TransformPipeline | null = null;
  private transformMap: Record<string, { request: string; response: string }>;

  constructor(options: AIActionTransformOptions = {}) {
    this.transformsDir = options.transformsDir ?? TRANSFORMS_DIR;
    this.promptsDir = options.promptsDir ?? PROMPTS_DIR;
    this.llmClient = options.llmClient ?? getLLMClient();
    this.transformMap = options.transformMap ?? TRANSFORM_MAP;
  }

  /**
   * Инициализация - загрузка трансформационных схем
   * 
   * @param promptName - Имя промпта для выбора специфичной схемы трансформации
   */
  async initialize(promptName?: string): Promise<void> {
    const transformKey = promptName ?? 'auto-ai-request.md';
    const transforms = this.transformMap[transformKey] ?? {
      request: 'server-transforms-request.json',
      response: 'server-transforms-response.json',
    };

    logger.info('[AIActionTransform] Initializing', { 
      transformsDir: this.transformsDir,
      promptName: transformKey,
      requestTransform: transforms.request,
      responseTransform: transforms.response
    });

    // Load request transform
    const requestTransformPath = path.join(this.transformsDir, transforms.request);
    try {
      this.requestTransform = await loadTransformPipeline(requestTransformPath);
      logger.info('[AIActionTransform] Request transform loaded', { file: transforms.request });
    } catch (error) {
      logger.warn('[AIActionTransform] Failed to load request transform', { error: String(error) });
    }

    // Load response transform
    const responseTransformPath = path.join(this.transformsDir, transforms.response);
    try {
      this.responseTransform = await loadTransformPipeline(responseTransformPath);
      logger.info('[AIActionTransform] Response transform loaded', { file: transforms.response });
    } catch (error) {
      logger.warn('[AIActionTransform] Failed to load response transform', { error: String(error) });
    }
  }

  /**
   * Запуск AI-Action с полным pipeline трансформаций
   * 
   * @param context - Текущий контекст выполнения
   * @param options - Опции трансформации
   */
  async runAIAction(
    context: AIActionContext,
    options?: {
      promptName?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AIActionResult> {
    const startTime = Date.now();

    // Initialize if not done
    if (!this.requestTransform || !this.responseTransform) {
      await this.initialize(options?.promptName);
    }

    const promptName = options?.promptName ?? 'auto-ai-request.md';
    const promptPath = path.join(this.promptsDir, promptName);

    logger.info('[AIActionTransform] Running AI action', { 
      promptName, 
      contextStep: context.context.execution?.step 
    });

    // Step 1: Apply request transform
    let requestResult: TransformResult;
    try {
      requestResult = await runTransformPipeline(
        this.requestTransform!,
        context as unknown as Record<string, unknown>,
        { baseDir: this.transformsDir }
      );

      if (!requestResult.success) {
        throw new Error(`Request transform failed: ${requestResult.error}`);
      }

      logger.debug('[AIActionTransform] Request transform complete', { 
        files: Object.keys(requestResult.files ?? {}) 
      });
    } catch (error) {
      logger.error('[AIActionTransform] Request transform error', { error: String(error) });
      throw error;
    }

    // Get the rendered prompt from files
    const requestMd = requestResult.files?.['request.md'];
    if (!requestMd) {
      throw new Error('Request markdown not generated');
    }

    // Step 2: Call LLM
    let llmResult: LLMChatResult;
    try {
      const messages: LLMMessage[] = [
        { role: 'user', content: requestMd }
      ];

      llmResult = await this.llmClient.chat(messages, {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      });

      logger.info('[AIActionTransform] LLM response received', { 
        promiseId: llmResult.promiseId,
        responseLength: llmResult.message.content.length 
      });
    } catch (error) {
      logger.error('[AIActionTransform] LLM call error', { error: String(error) });
      throw error;
    }

    // Write response.md to temp file for transform
    const responseMdPath = path.join(this.transformsDir, 'response.md');
    await fs.writeFile(responseMdPath, llmResult.message.content, 'utf-8');

    // Step 3: Apply response transform
    let responseResult: TransformResult;
    try {
      responseResult = await runTransformPipeline(
        this.responseTransform!,
        context as unknown as Record<string, unknown>,
        { baseDir: this.transformsDir }
      );

      if (!responseResult.success) {
        throw new Error(`Response transform failed: ${responseResult.error}`);
      }

      logger.debug('[AIActionTransform] Response transform complete');
    } catch (error) {
      logger.error('[AIActionTransform] Response transform error', { error: String(error) });
      throw error;
    }

    // Extract result
    const output = responseResult.output;
    const transformTime = Date.now() - startTime;

    // Parse LLM response to extract step, message, execute, completed
    const llmData = (output.$llm as Record<string, unknown>) ?? {};
    
    const result: AIActionResult = {
      message: String(llmData.message ?? ''),
      step: String(llmData.step ?? 'unknown'),
      execute: (llmData.execute as Record<string, unknown>) ?? {},
      completed: Boolean(llmData.completed),
      context: output as unknown as AIActionContext,
      metadata: {
        promiseId: llmResult.promiseId,
        model: llmResult.model,
        transformTime,
      },
    };

    logger.info('[AIActionTransform] AI action complete', {
      step: result.step,
      completed: result.completed,
      transformTime,
    });

    return result;
  }

  /**
   * Применение только request трансформации (без LLM)
   * 
   * @param context - Контекст
   * @param promptName - Имя промпта
   */
  async applyRequestTransform(
    context: AIActionContext,
    promptName: string = 'auto-ai-request.md'
  ): Promise<{ requestMd: string; files: Record<string, string> }> {
    if (!this.requestTransform) {
      await this.initialize();
    }

    const result = await runTransformPipeline(
      this.requestTransform!,
      context as unknown as Record<string, unknown>,
      { baseDir: this.transformsDir }
    );

    if (!result.success) {
      throw new Error(`Request transform failed: ${result.error}`);
    }

    const requestMd = result.files?.['request.md'];
    if (!requestMd) {
      throw new Error('Request markdown not generated');
    }

    return { 
      requestMd, 
      files: result.files ?? {} 
    };
  }

  /**
   * Применение только response трансформации
   * 
   * @param context - Контекст
   * @param responseMd - Markdown ответ от LLM
   */
  async applyResponseTransform(
    context: AIActionContext,
    responseMd: string
  ): Promise<AIActionResult> {
    if (!this.responseTransform) {
      await this.initialize();
    }

    // Write response.md to temp file
    const responseMdPath = path.join(this.transformsDir, 'response.md');
    await fs.writeFile(responseMdPath, responseMd, 'utf-8');

    const result = await runTransformPipeline(
      this.responseTransform!,
      context as unknown as Record<string, unknown>,
      { baseDir: this.transformsDir }
    );

    if (!result.success) {
      throw new Error(`Response transform failed: ${result.error}`);
    }

    const output = result.output;
    const llmData = (output.$llm as Record<string, unknown>) ?? {};

    return {
      message: String(llmData.message ?? ''),
      step: String(llmData.step ?? 'unknown'),
      execute: (llmData.execute as Record<string, unknown>) ?? {},
      completed: Boolean(llmData.completed),
      context: output as unknown as AIActionContext,
      metadata: {
        model: '',
        transformTime: 0,
      },
    };
  }

  /**
   * Проверка здоровья сервиса
   */
  async checkHealth(): Promise<boolean> {
    return this.llmClient.checkHealth();
  }

  /**
   * Получение списка доступных моделей
   */
  async listModels(): Promise<string[]> {
    return this.llmClient.listModels();
  }
}

/**
 * Default singleton instance
 */
let defaultService: AIActionTransformService | null = null;

export function getAIActionTransformService(): AIActionTransformService {
  if (!defaultService) {
    defaultService = new AIActionTransformService();
  }
  return defaultService;
}

export default AIActionTransformService;
