/** File block delta (minimal change set). */

export interface FileBlockDelta {
  path: string;
  op: 'add' | 'change' | 'remove';
  content?: string;
}

export function applyDelta(base: Record<string, string>, delta: FileBlockDelta[]): Record<string, string> {
  const out = { ...base };
  for (const d of delta) {
    if (d.op === 'remove') delete out[d.path];
    else if (d.content !== undefined) out[d.path] = d.content;
  }
  return out;
}
