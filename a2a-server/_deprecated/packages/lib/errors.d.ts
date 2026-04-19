/**
 * User-visible copy for invoke/session paths. Never mention proxy, Local LLM upstream, or ports — details stay in server logs.
 */
export declare const CLIENT_SAFE_PROCESSING_ERROR = "We couldn't complete this step. Please try again.";
export declare function isRetryableError(err: string): boolean;
/**
 * Map upstream/network failures to a client-safe string. Non-infrastructure messages pass through.
 */
export declare function sanitizeErrorMessage(raw: string): string;
//# sourceMappingURL=errors.d.ts.map