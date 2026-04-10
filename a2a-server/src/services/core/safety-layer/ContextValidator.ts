import { crypto } from 'node:crypto';

/**
 * ContextValidator
 * 
 * Ensures the integrity of the conversation history and workbench state.
 * Prevents context drift or accidental truncation during server processing.
 */
export class ContextValidator {
    /**
     * Compare the current context hash with a previous hash.
     * 
     * @param context - The current request context
     * @param expectedHash - The hash from the previous step/turn
     * @returns boolean - true if context matches the expected hash
     */
    public validate(context: Record<string, unknown>, expectedHash: string): boolean {
        const currentHash = this.calculateHash(context);
        return currentHash === expectedHash;
    }

    /**
     * Calculate a SHA256 hash of the critical context parts.
     */
    public calculateHash(data: unknown): string {
        try {
            // Focus on execution, history, and workbench slots
            const ctx = data as Record<string, unknown>;
            const relevant = {
                execution: ctx['execution'],
                history: ctx['history'],
                workbench: ctx['workbench'],
            };
            const payload = JSON.stringify(relevant);
            return crypto.createHash('sha256').update(payload).digest('hex');
        } catch (e) {
            return `error-hash-validator-${Date.now()}`;
        }
    }
}
