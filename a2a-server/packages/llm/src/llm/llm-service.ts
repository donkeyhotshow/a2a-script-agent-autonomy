/**
 * LLM Service — multi-provider completion for gray-room and other server-side use.
 *
 * Provider is selected via A2A_LLM_PROVIDER (or legacy LLM_PROVIDER) env var:
 *   groq   — Groq cloud API (default). Requires GROQ_API_KEY.
 *   ollama — Local Ollama server. Uses OLLAMA_BASE_URL / OLLAMA_MODEL.
 *   openai — OpenAI API. Requires OPENAI_API_KEY.
 *
 * Legacy chat() / debate() methods are preserved for backward compat but disabled.
 */

// ── Shared legacy types (kept for backward compat) ───────────────────────────

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

// ── New typed request / response ─────────────────────────────────────────────

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

// ── Internal Groq/OpenAI response shape ──────────────────────────────────────

interface OpenAICompatResponse {
  choices: Array<{message: {content: string | null}}>;
  model?: string;
  usage?: {prompt_tokens?: number; completion_tokens?: number};
}

interface OllamaChatResponse {
  message?: {content?: string};
  model?: string;
}

// ── LlmService ───────────────────────────────────────────────────────────────

export class LlmService {
  /**
   * Call the configured LLM provider and return the completion text.
   * Selects provider from A2A_LLM_PROVIDER → LLM_PROVIDER → 'groq'.
   */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const provider =
      process.env["A2A_LLM_PROVIDER"] ??
      process.env["LLM_PROVIDER"] ??
      "groq";

    switch (provider) {
      case "groq":
        return this._callGroq(request);
      case "ollama":
        return this._callOllama(request);
      case "openai":
        return this._callOpenAI(request);
      default:
        throw new Error(
          `[LlmService] Unknown LLM provider: "${provider}". ` +
            `Set A2A_LLM_PROVIDER to groq | ollama | openai.`,
        );
    }
  }

  // ── Providers ─────────────────────────────────────────────────────────────

  private async _callGroq(request: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env["GROQ_API_KEY"];
    if (!apiKey) throw new Error("[LlmService] GROQ_API_KEY is not set");

    const model =
      request.model ?? process.env["GROQ_MODEL"] ?? "llama-3.3-70b-versatile";
    const base =
      (process.env["GROQ_BASE_URL"] ?? "https://api.groq.com/openai/v1").replace(
        /\/+$/,
        "",
      );

    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept-Encoding": "identity",
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        ...(request.maxTokens !== undefined
          ? {max_tokens: request.maxTokens}
          : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[LlmService] Groq API ${res.status}: ${text}`);
    }

    const json = (await res.json()) as OpenAICompatResponse;
    return {
      content: json.choices[0]?.message.content ?? "",
      model: json.model,
      usage: json.usage,
    };
  }

  private async _callOllama(request: LLMRequest): Promise<LLMResponse> {
    const base = (
      process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434"
    ).replace(/\/+$/, "");
    const model =
      request.model ?? process.env["OLLAMA_MODEL"] ?? "llama3";

    const res = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Encoding": "identity",
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: false,
        options: {temperature: request.temperature ?? 0.7},
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[LlmService] Ollama API ${res.status}: ${text}`);
    }

    const json = (await res.json()) as OllamaChatResponse;
    return {
      content: json.message?.content ?? "",
      model: json.model,
    };
  }

  private async _callOpenAI(request: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) throw new Error("[LlmService] OPENAI_API_KEY is not set");

    const model =
      request.model ?? process.env["OPENAI_MODEL"] ?? "gpt-4o-mini";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept-Encoding": "identity",
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        ...(request.maxTokens !== undefined
          ? {max_tokens: request.maxTokens}
          : {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[LlmService] OpenAI API ${res.status}: ${text}`);
    }

    const json = (await res.json()) as OpenAICompatResponse;
    return {
      content: json.choices[0]?.message.content ?? "",
      model: json.model,
      usage: json.usage,
    };
  }

  // ── Legacy stubs (preserved for backward compat) ──────────────────────────

  async chat(_request: LlmRequest): Promise<LlmResponse> {
    throw new Error(
      "[LlmService] chat() is disabled — use complete() or the invoke mechanism",
    );
  }

  async debate(
    _task: string,
    _context: unknown,
  ): Promise<{plan: string; consensus: string}> {
    throw new Error(
      "[LlmService] debate() is disabled — use invoke mechanism",
    );
  }
}

export const llmService = new LlmService();

