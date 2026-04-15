// [STUB] black-room/types — requires real implementation
// TODO: implement actual black-room algorithm types

export interface AlgorithmContext {
  sessionId?: string;
  workbench?: unknown;
  history?: unknown[];
  files?: unknown;
  [key: string]: unknown;
}

export interface AlgorithmData {
  [key: string]: unknown;
}

export interface AlgorithmResult {
  status: 'completed' | 'failed' | 'pending';
  output?: unknown;
  error?: string;
  metrics?: {
    tokensOut?: number;
    durationMs?: number;
  };
}
