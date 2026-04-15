/**
 * When the model wraps the whole payload in one ``` / ```json … ``` block,
 * strip outer fences so `JSON.parse` can run (vision QA + design manifest).
 */
export function stripOuterMarkdownJsonFence(raw) {
    return raw
        .replace(/^```(?:json)?/im, '')
        .replace(/```$/m, '')
        .trim();
}
/**
 * Best-effort JSON from LLM text: plain JSON, outer fence strip, fenced block,
 * or first `{…}` / `[…]` slice.
 */
export function tryParseJsonFromLlmText(raw) {
    const s = String(raw ?? '');
    const tryParse = (fragment) => {
        try {
            return JSON.parse(fragment.trim());
        }
        catch {
            return null;
        }
    };
    let p = tryParse(s);
    if (p !== null)
        return p;
    p = tryParse(stripOuterMarkdownJsonFence(s));
    if (p !== null)
        return p;
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fence?.[1]) {
        p = tryParse(fence[1]);
        if (p !== null)
            return p;
    }
    const i = s.indexOf('{');
    const j = s.lastIndexOf('}');
    if (i >= 0 && j > i) {
        p = tryParse(s.slice(i, j + 1));
        if (p !== null)
            return p;
    }
    const a = s.indexOf('[');
    const b = s.lastIndexOf(']');
    if (a >= 0 && b > a) {
        p = tryParse(s.slice(a, b + 1));
        if (p !== null)
            return p;
    }
    return null;
}
//# sourceMappingURL=strip-markdown-json-fence.js.map