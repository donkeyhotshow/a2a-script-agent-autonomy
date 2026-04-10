export type SessionIndex = {
  sessionId?: string;
  steps?: Array<{
    step: number;
    hasServerResponse?: boolean;
    hasClientResult?: boolean;
  }>;
  currentStep?: number;
  mode?: string;
  promiseId?: string;
  promiseStatus?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type StepArtifacts = {
  step: number;
  serverResponse?: Record<string, unknown> | null;
  clientResult?: Record<string, unknown> | null;
  messages?: unknown;
  requestToServer?: Record<string, unknown> | null;
  serverPromise?: Record<string, unknown> | null;
};

export type LoadedSession = {
  sessionId: string;
  index: SessionIndex;
  steps: Map<number, StepArtifacts>;
};
