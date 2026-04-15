/**
 * When the model wraps the whole payload in one ``` / ```json … ``` block,
 * strip outer fences so `JSON.parse` can run (vision QA + design manifest).
 */
export declare function stripOuterMarkdownJsonFence(raw: string): string;
/**
 * Best-effort JSON from LLM text: plain JSON, outer fence strip, fenced block,
 * or first `{…}` / `[…]` slice.
 */
export declare function tryParseJsonFromLlmText<T = unknown>(raw: string): T | null;
//# sourceMappingURL=strip-markdown-json-fence.d.ts.map