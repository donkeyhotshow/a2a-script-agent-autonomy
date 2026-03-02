declare module 'chokidar' {
    interface WatchOptions {
        persistent?: boolean;
        ignoreInitial?: boolean;
        awaitWriteFinish?: { stabilityThreshold?: number; pollInterval?: number };
        ignored?: string[];
    }

    interface FSWatcher {
        on(event: string, fn: (path: string) => void): FSWatcher;

        close(): void;
    }

    function watch(path: string, options?: WatchOptions): FSWatcher;
}
