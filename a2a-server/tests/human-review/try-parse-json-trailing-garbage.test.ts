import {describe, expect, it} from 'vitest';
import {tryParseJsonFromLlmText} from '../../src/utils/strip-markdown-json-fence.js';

/**
 * Models often append prose after JSON; first-object slice should still parse when unambiguous.
 */
describe('human-review: tryParseJsonFromLlmText', () => {
    it('parses leading JSON object when followed by trailing explanation text', () => {
        const raw = '{"ok":true}\n\nHere is my explanation.';
        const p = tryParseJsonFromLlmText(raw) as {ok?: boolean} | null;
        expect(p?.ok).toBe(true);
    });
});
