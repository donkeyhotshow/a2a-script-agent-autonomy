/** Message serialization helpers. */

export function serializeMessagePayload(payload: unknown): string {
    return JSON.stringify(payload);
}

export function deserializeMessagePayload<T = unknown>(raw: string): T {
    return JSON.parse(raw) as T;
}

export function deserializeMessagePayloadSafe<T = unknown>(raw: string): T | null {
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}
