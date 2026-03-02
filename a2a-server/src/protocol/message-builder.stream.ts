/** Stream-friendly message chunking. */

export const STREAM_CHUNK_SEPARATOR = '\n';

export function streamEncode(messages: unknown[]): string {
    return messages.map((m) => JSON.stringify(m)).join(STREAM_CHUNK_SEPARATOR);
}

export function* streamDecode(chunk: string): Generator<unknown> {
    const parts = chunk.split(STREAM_CHUNK_SEPARATOR).filter(Boolean);
    for (const p of parts) {
        try {
            yield JSON.parse(p);
        } catch {
            // skip malformed
        }
    }
}
