# ai-fallback

Generic LLM handling when no specific action matches. Priority: 10. **План:** [actions-definitions-for-auto-ai](../../../../docs/actions-definitions-for-auto-ai.md).

## Context
```json
{ "type": "fallback", "llm_required": true }
```

## Triggers
- (any unmatched user task text)
- задай вопрос
- помоги с
- что такое

## Sub-actions

### 1. ai-fallback-prompt
Построение промпта из задачи и доступного контекста.

**Input:** task, context?, history?  
**Output:** prompt

```typescript
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface PromptResult {
  prompt: string;
  contextUsed: string[];
  estimatedTokens: number;
}

// System prompt for fallback mode
const FALLBACK_SYSTEM_PROMPT = `You are a helpful AI coding assistant. You have access to the user's project context and can:
- Answer questions about the codebase
- Explain code and concepts
- Suggest solutions to problems
- Help with debugging
- Provide code examples

Be concise, accurate, and helpful. If you don't have enough context to answer accurately, ask clarifying questions.`;

const CONTEXT_PROMPT = `
Current project context:
- Language: {language}
- Framework: {framework}
- Project structure: {structure}

Recent files: {recentFiles}
`;

const MAX_CONTEXT_TOKENS = 4000;
const CHARS_PER_TOKEN = 4;

export default async function buildPrompt(input: { 
  task: string;
  context?: {
    language?: string;
    framework?: string;
    structure?: string;
    recentFiles?: string[];
    projectRoot?: string;
  };
  history?: Message[];
}): Promise<PromptResult> {
  const contextUsed: string[] = [];
  const parts: string[] = [];
  
  // Add system prompt
  parts.push(FALLBACK_SYSTEM_PROMPT);
  contextUsed.push('system_prompt');
  
  // Add context if available
  if (input.context) {
    let contextStr = CONTEXT_PROMPT
      .replace('{language}', input.context.language || 'unknown')
      .replace('{framework}', input.context.framework || 'unknown')
      .replace('{structure}', input.context.structure || 'unknown')
      .replace('{recentFiles}', (input.context.recentFiles || []).join(', ') || 'none');
    
    parts.push(contextStr);
    contextUsed.push('project_context');
  }
  
  // Add conversation history (limited)
  if (input.history && input.history.length > 0) {
    const recentHistory = input.history.slice(-6); // Last 3 exchanges
    const historyStr = recentHistory
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');
    
    parts.push(`\nConversation history:\n${historyStr}`);
    contextUsed.push('history');
  }
  
  // Add the actual task
  parts.push(`\nUser question/request: ${input.task}`);
  contextUsed.push('user_task');
  
  const fullPrompt = parts.join('\n\n');
  const estimatedTokens = Math.ceil(fullPrompt.length / CHARS_PER_TOKEN);
  
  return {
    prompt: fullPrompt,
    contextUsed,
    estimatedTokens
  };
}
```

### 2. ai-fallback-llm
Вызов внешнего AI с промптом.

**Input:** prompt, options?  
**Output:** response, usage

```typescript
interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface LLMResponse {
  response: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'content_filter';
}

// Configuration for LLM providers
interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
}

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'ollama',
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  defaultModel: process.env.OLLAMA_MODEL || 'codellama'
};

export default async function callLLM(input: { 
  prompt: string;
  options?: LLMOptions;
}): Promise<LLMResponse> {
  const config = DEFAULT_CONFIG;
  const model = input.options?.model || config.defaultModel;
  const temperature = input.options?.temperature ?? 0.7;
  const maxTokens = input.options?.maxTokens || 2048;
  
  // Prepare request based on provider
  let url: string;
  let headers: Record<string, string> = {};
  let body: object;
  
  switch (config.provider) {
    case 'openai':
      url = `${config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
      };
      body = {
        model,
        messages: [{ role: 'user', content: input.prompt }],
        temperature,
        max_tokens: maxTokens
      };
      break;
    
    case 'anthropic':
      url = `${config.baseUrl || 'https://api.anthropic.com'}/v1/messages`;
      headers = {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        ...(config.apiKey ? { 'x-api-key': config.apiKey } : {})
      };
      body = {
        model,
        messages: [{ role: 'user', content: input.prompt }],
        temperature,
        max_tokens: maxTokens
      };
      break;
    
    case 'ollama':
    default:
      url = `${config.baseUrl}/api/generate`;
      body = {
        model,
        prompt: input.prompt,
        temperature,
        options: {
          num_predict: maxTokens
        }
      };
      break;
  }
  
  try {
    // In production, make actual API call
    // const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    
    // Mock response for demonstration
    const mockResponse: LLMResponse = {
      response: generateMockResponse(input.prompt),
      usage: {
        promptTokens: Math.ceil(input.prompt.length / 4),
        completionTokens: 150,
        totalTokens: Math.ceil(input.prompt.length / 4) + 150
      },
      model,
      finishReason: 'stop'
    };
    
    return mockResponse;
  } catch (error) {
    throw new Error(`LLM call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateMockResponse(prompt: string): string {
  // This would be replaced with actual LLM response in production
  const task = prompt.toLowerCase();
  
  if (task.includes('explain') || task.includes('что такое')) {
    return "I'd be happy to explain! However, I need more specific context about which part of the code you'd like me to explain. Could you please provide more details about the specific file, function, or concept you're interested in?";
  }
  
  if (task.includes('help') || task.includes('помоги')) {
    return "I'm here to help! To assist you better, could you please clarify:\n1. What specific task would you like me to help with?\n2. Are there any particular files or areas of the codebase you'd like me to focus on?";
  }
  
  return "I understand you're asking about something in your project. To provide a more accurate answer, could you please provide more context about:\n- What specific question do you have?\n- Are there particular files or code sections relevant to your question?";
}
```

### 3. ai-fallback-respond
Форматирование ответа для пользователя (message block).

**Input:** response, format?  
**Output:** message

```typescript
interface Message {
  type: 'text' | 'code' | 'file' | 'error' | 'question';
  content: string;
  metadata?: {
    language?: string;
    filePath?: string;
    suggestions?: string[];
    requiresInput?: boolean;
  };
}

type ResponseFormat = 'auto' | 'markdown' | 'plain' | 'structured';

export default async function formatResponse(input: { 
  response: string;
  format?: ResponseFormat;
}): Promise<{ message: Message }> {
  const format = input.format || 'auto';
  
  // Detect if response contains code blocks
  const hasCodeBlocks = input.response.includes('```');
  const hasFileReferences = input.response.includes('/') || input.response.includes('\\');
  
  // Auto-detect format
  let finalFormat = format;
  if (format === 'auto') {
    if (hasCodeBlocks) {
      finalFormat = 'markdown';
    } else if (hasFileReferences && input.response.length > 200) {
      finalFormat = 'structured';
    } else {
      finalFormat = 'plain';
    }
  }
  
  switch (finalFormat) {
    case 'markdown':
      return formatAsMarkdown(input.response);
    
    case 'plain':
      return formatAsPlain(input.response);
    
    case 'structured':
      return formatAsStructured(input.response);
    
    default:
      return formatAsMarkdown(input.response);
  }
}

function formatAsMarkdown(response: string): { message: Message } {
  // Extract code blocks and their languages
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const codeBlocks: Array<{ lang: string; code: string }> = [];
  
  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    codeBlocks.push({
      lang: match[1] || 'text',
      code: match[2].trim()
    });
  }
  
  return {
    message: {
      type: 'code',
      content: response,
      metadata: {
        language: codeBlocks.length > 0 ? codeBlocks[0].lang : undefined
      }
    }
  };
}

function formatAsPlain(response: string): { message: Message } {
  return {
    message: {
      type: 'text',
      content: response
    }
  };
}

function formatAsStructured(response: string): { message: Message } {
  // Try to extract structured information
  const fileRefs: string[] = [];
  const fileRegex = /[a-zA-Z]:\\[^:\s]+|\/[\w/.-]+(?:\.\w+)/g;
  
  let match;
  while ((match = fileRegex.exec(response)) !== null) {
    fileRefs.push(match[0]);
  }
  
  return {
    message: {
      type: 'text',
      content: response,
      metadata: {
        filePath: fileRefs.length > 0 ? fileRefs[0] : undefined,
        suggestions: extractSuggestions(response)
      }
    }
  };
}

function extractSuggestions(response: string): string[] {
  const suggestions: string[] = [];
  
  // Look for common suggestion patterns
  const patterns = [
    /you (could|should|may want to) (.+?)(?:\.|$)/gi,
    /try (.+?)(?:\.|$)/gi,
    /consider (.+?)(?:\.|$)/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(response)) !== null) {
      suggestions.push(match[0].trim());
    }
  }
  
  return suggestions.slice(0, 3);
}
```
