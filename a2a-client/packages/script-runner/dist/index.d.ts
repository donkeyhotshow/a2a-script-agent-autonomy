/**
 * Script Runner - execute TypeScript/JavaScript from MD action files
 */
export interface ScriptResult {
    success: boolean;
    data?: unknown;
    error?: string;
    duration_ms: number;
}
export interface ScriptContext {
    sessionId: string;
    workingDir: string;
    aliases?: Record<string, string>;
    previousOutput?: unknown;
}
export declare function executeScript(code: string, input: Record<string, unknown>, context: ScriptContext): Promise<ScriptResult>;
export declare class ScriptRunner {
    private scriptCache;
    registerScript(scriptId: string, code: string): void;
    run(scriptId: string, input: Record<string, unknown>, context: ScriptContext): Promise<ScriptResult>;
    hasScript(scriptId: string): boolean;
    clear(): void;
}
export declare const scriptRunner: ScriptRunner;
export default scriptRunner;
