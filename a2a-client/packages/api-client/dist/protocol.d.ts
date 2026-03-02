/**
 * A2A Protocol - context and file block handling
 */
declare const VERSION = "1.0";

export interface FileBlockLike {
    path: string;
    content: string;
    startLine?: number;
    endLine?: number;
}

export declare function buildNewTaskContext(sessionId: string, newTask: string[], architecturalFeatures?: string[]): Record<string, unknown>;

export declare function buildContinueContext(sessionId: string): Record<string, unknown>;

export declare function buildConfirmContext(sessionId: string): Record<string, unknown>;

export declare function buildFileResponseContext(sessionId: string): Record<string, unknown>;

export declare function serializeFileBlock(path: string, content: string, startLine?: number, endLine?: number): string;

export declare function parseFileBlock(text: string): {
    path: string;
    content: string;
    startLine?: number;
    endLine?: number;
} | null;

export declare function serializeMessage(context: Record<string, unknown>, files?: FileBlockLike[]): string;

export declare function parseMessage(text: string): {
    context: Record<string, unknown>;
    files: FileBlockLike[];
} | null;

export {VERSION};
