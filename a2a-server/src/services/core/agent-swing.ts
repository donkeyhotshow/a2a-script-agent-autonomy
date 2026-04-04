import { resolveGrayRoomLlmModelFromContext } from './request-processor/llm-model-resolver.js';

export interface AgentSwingResult {
  best_history: any[];
  score: number;
  options_considered: number;
}

export class AgentSwing {
  private readonly defaultStrategies = [
    'Strict: Retain only raw facts and file paths. Remove all code snippets entirely.',
    'Action-oriented: Summarize what user asked, what assistant did, and errors. Minimal prose.',
    'Balanced: Compress conversation heavily, but keep small code snippets if they were failing.'
  ];

  async compressWithLookahead(
    history: any[],
    ctx: Record<string, unknown>,
    promiseId: string,
    aiHubUrl: string,
    model: string,
    pollReadyThenFetch: (url: string, id: string) => Promise<string | null>
  ): Promise<AgentSwingResult> {
    if (!history || history.length === 0) {
      return { best_history: [], score: 1.0, options_considered: 1 };
    }

    // Cascade Model Optimization: Use a smaller model for lookahead drafting
    const sidecarModel = process.env.A2A_BLACK_ROOM_DEFAULT_MODEL || 'llama3.1:8b';
    const historyJson = JSON.stringify(history, null, 2);

    // K-step parallel lookahead (k=3)
    const promises = this.defaultStrategies.map(async (strategy, index) => {
      const prompt = `Compress the following conversation history into 3-7 short entries (JSON array of {"role":"...","message":"..."}).
Strategy: ${strategy}
Respond with ONLY the JSON array, no prose.

History:
${historyJson}`;

      try {
        const res = await fetch(`${aiHubUrl}/api/chat?promise=1`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Server-Promise-Id': `${promiseId}-swing-${index}` },
          body: JSON.stringify({ model: sidecarModel, messages: [{ role: 'user', content: prompt }], stream: false }),
        });

        if (res.status === 202) {
          const initData = (await res.json()) as { promiseId?: string };
          if (initData?.promiseId) {
            const compressedStr = await pollReadyThenFetch(aiHubUrl, initData.promiseId);
            if (compressedStr) {
              const parsed = JSON.parse(compressedStr.trim());
              if (Array.isArray(parsed)) {
                // Heuristic score: shorter is better, but must be > 0.
                const lengthRatio = JSON.stringify(parsed).length / historyJson.length;
                let score = 1.0 - lengthRatio; 
                if (parsed.length === 0) score = 0; // penalize complete loss
                
                return { history: parsed, score };
              }
            }
          }
        }
      } catch (e) {
        // Fallback or ignore
      }
      return { history: null, score: -1 };
    });

    const results = await Promise.all(promises);
    const validResults = results.filter(r => r.history !== null);

    if (validResults.length === 0) {
      throw new Error('All AgentSwing parallel branches failed');
    }

    let best = validResults[0]!;
    for (const r of validResults) {
      if (r.score > best.score) {
        best = r;
      }
    }

    return {
      best_history: best.history!,
      score: best.score,
      options_considered: validResults.length
    };
  }
}
