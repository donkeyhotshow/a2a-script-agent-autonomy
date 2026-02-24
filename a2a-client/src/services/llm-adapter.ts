/**
 * LLM Adapter — external AI integration (OpenAI, etc.)
 * Fallback: placeholder when API key unavailable.
 */

import { logger } from '../utils/logger.js';

const PLACEHOLDER = 'Request processed (placeholder for ChatGPT)';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface LLMInput {
  context: Record<string, unknown>;
  injectedContent: string;
  requestFiles?: string[];
}

/**
 * Call external LLM with context block. Returns placeholder when unavailable.
 */
export async function callLLM(input: LLMInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return PLACEHOLDER;
  }

  const prompt = buildPrompt(input);
  try {
    const res = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      logger.warn('[LLM] API error', { status: res.status });
      return PLACEHOLDER;
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content?.trim();
    return content ?? PLACEHOLDER;
  } catch (err) {
    logger.warn('[LLM] Request failed', { error: String(err) });
    return PLACEHOLDER;
  }
}

function buildPrompt(input: LLMInput): string {
  const parts: string[] = [
    'You are an A2A coding assistant. Analyze the context and provide a concise response.',
    '',
    '## Context',
    JSON.stringify(input.context, null, 2),
  ];
  if (input.injectedContent) {
    parts.push('', '## Injected knowledge', input.injectedContent);
  }
  if (input.requestFiles?.length) {
    parts.push('', '## Requested files', input.requestFiles.join(', '));
  }
  parts.push('', 'Provide a brief analysis or next steps.');
  return parts.join('\n');
}
