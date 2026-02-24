/** ContextManager compression (pass-through; gzip can be added). */

export function compressContextData(data: string): string {
  return data;
}

export function decompressContextData(data: string): string {
  return data;
}

