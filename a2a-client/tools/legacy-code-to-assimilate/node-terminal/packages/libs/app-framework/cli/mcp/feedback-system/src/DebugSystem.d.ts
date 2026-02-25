declare module '../../../../root/mcp/node-terminal/mcp/DebugSystem.cjs' {
    export const debugSystem: {
        registerProblem: (problem: { category: string; title: string; description: string; errorDetails?: string; context?: any }) => void;
        DEBUG_CATEGORIES: {
            USER_FEEDBACK: string;
            FILE_SYSTEM_ERROR: string;
            DOCUMENT_GENERATION: string;
            [key: string]: string;
        };
    };
    export const DEBUG_CATEGORIES: {
        USER_FEEDBACK: string;
        FILE_SYSTEM_ERROR: string;
        DOCUMENT_GENERATION: string;
        [key: string]: string;
    };
}
