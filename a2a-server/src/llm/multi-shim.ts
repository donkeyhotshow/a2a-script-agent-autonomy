import { LiteLLM } from 'litellm';

const SHIM = new LiteLLM({
  model_map: {
    'gpt-4o': 'openai/gpt-4o',
    'gemini-flash': 'google/gemini-1.5-flash',
    'deepseek': 'deepseek/deepseek-chat',
  }
});

export async function smartCall(prompt: string, options: { latencyMs?: number } = {}) {
  const model = options.latencyMs && options.latencyMs > 2000 
    ? 'gemini-flash' 
    : 'gpt-4o';
    
  return await SHIM.complete({
    model,
    messages: [{ role: 'user', content: prompt }]
  });
}
