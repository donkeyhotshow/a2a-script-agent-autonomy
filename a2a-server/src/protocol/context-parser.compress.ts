/** Context compression (pass-through; gzip can be added per plan). */

export function compressContext(data: string): string {
    return data;
}

export function decompressContext(data: string): string {
    return data;
}
