/**
 * User-visible copy for invoke/session paths. Never mention proxy, upstreams, or ports — details stay in server logs.
 */
export declare const CLIENT_SAFE_PROCESSING_ERROR = "We couldn't complete this step. Please try again.";
export declare function isRetryableError(err: string): boolean;
export declare function sanitizeErrorMessage(raw: string): string;
//# sourceMappingURL=errors.d.ts.map