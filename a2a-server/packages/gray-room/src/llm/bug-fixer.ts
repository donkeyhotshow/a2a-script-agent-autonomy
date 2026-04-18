/**
 * BugFixer — LLM-based code repair utility.
 *
 * Given a code snippet and an error description, calls the AI hub to produce:
 *   - analysis of the root cause
 *   - one or more patch suggestions
 *   - a fixed version of the code
 *
 * Falls back gracefully when the hub is unavailable.
 */

import { logger } from '@a2a/server-utils/logger';
import { resolveAiHubBaseUrl } from '@a2a/server-utils';

export interface BugFixResult {
    fixed: boolean;
    analysis?: string;
    patches?: Array<{
        description: string;
        before?: string;
        after?: string;
    }>;
    fixedCode?: string;
}

const SYSTEM_PROMPT = `You are an expert software engineer and code debugger.
Analyse the provided code and error. Return a JSON response with:
{
  "analysis": "root cause explanation",
  "patches": [{ "description": "what to change", "before": "...", "after": "..." }],
  "fixedCode": "the complete corrected code"
}`;

class BugFixer {
    private readonly aiHubUrl: string;
    private readonly model: string;
    private readonly timeoutMs: number;

    constructor() {
        this.aiHubUrl = resolveAiHubBaseUrl().replace(/\/$/, '');
        this.model = process.env['A2A_MODEL'] ?? 'llama3';
        this.timeoutMs = 45_000;
    }

    async fix(code: string, error: string): Promise<BugFixResult> {
        logger.info('[BugFixer] Requesting LLM bug fix', {
            codeLen: code.length,
            errorPreview: error.slice(0, 80),
        });

        const userPrompt = `Code:\n\`\`\`\n${code.slice(0, 4_000)}\n\`\`\`\n\nError:\n${error.slice(0, 1_000)}`;

        try {
            const res = await fetch(`${this.aiHubUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: userPrompt },
                    ],
                    stream: false,
                    max_tokens: 2_048,
                }),
                signal: AbortSignal.timeout(this.timeoutMs),
            });

            if (!res.ok) {
                logger.warn('[BugFixer] Hub returned non-200', { status: res.status });
                return { fixed: false, analysis: `Hub error: ${res.status}` };
            }

            const body = (await res.json()) as {
                choices?: Array<{ message?: { content?: string } }>;
            };
            const raw = body.choices?.[0]?.message?.content?.trim() ?? '';

            // Try to extract JSON
            const jsonMatch = /\{[\s\S]*\}/.exec(raw);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]) as Partial<BugFixResult & { fixedCode?: string }>;
                    logger.info('[BugFixer] Fix produced', {
                        patches: parsed.patches?.length ?? 0,
                        hasFixedCode: Boolean(parsed.fixedCode),
                    });
                    return {
                        fixed: Boolean(parsed.fixedCode || (parsed.patches && parsed.patches.length > 0)),
                        analysis: parsed.analysis,
                        patches: parsed.patches,
                        fixedCode: parsed.fixedCode,
                    };
                } catch {
                    // fall through to raw fallback
                }
            }

            // Raw text response fallback
            return { fixed: true, analysis: raw, patches: [{ description: raw }] };
        } catch (err: unknown) {
            logger.error('[BugFixer] Hub unreachable', {
                error: err instanceof Error ? err.message : String(err),
            });
            return { fixed: false, analysis: `Hub unreachable: ${String(err)}` };
        }
    }
}

export const bugFixer = new BugFixer();
