declare module 'vm2' {
    export class VM {
        constructor(options: { timeout?: number; sandbox?: Record<string, unknown> });

        run(code: string): Promise<unknown>;
    }
}
