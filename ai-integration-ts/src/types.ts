export type PromiseStatus = 'pending' | 'done' | 'error';

export interface PromiseRecord {
  promiseId: string;
  status: PromiseStatus;
  createdAt: number;
  updatedAt: number;
  method: string;
  path: string;
  targetUrl: string;
  logFolder: string;
  serverPromiseId?: string;
  error?: string;
  resultStatusCode?: number;
  resultContentType?: string;
}

export interface RequestSnapshot {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
  targetUrl: string;
}
