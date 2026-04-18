/**
 * ISandbox — interface for all execution sandbox implementations.
 */

export interface SandboxOpts {
    cwd: string;
    timeoutMs?: number;
    env?: Record<string, string>;
    allowNetwork?: boolean;
    memoryLimitMb?: number;
}

export interface SandboxResult {
    status: 'ok' | 'error' | 'timeout';
    stdout: string;
    stderr: string;
    exitCode: number | null;
    durationMs: number;
}

export interface ISandbox {
    run(command: string, opts: SandboxOpts): Promise<SandboxResult>;
}
