// LLM service disabled - server does not control LLM providers.
// All LLM operations should go through invoke mechanism.

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  messages: LlmMessage[];
}

export interface LlmResponse {
  content: string;
}

export class LlmService {
  async chat(request: LlmRequest): Promise<LlmResponse> {
    // Disabled - use invoke mechanism instead
    throw new Error("LLM service disabled - use invoke mechanism");
  }

  async debate(
    task: string,
    context: any,
  ): Promise<{ plan: string; consensus: string }> {
    // Disabled - use invoke mechanism instead
    throw new Error("LLM service disabled - use invoke mechanism");
  }
}

export const llmService = new LlmService();
