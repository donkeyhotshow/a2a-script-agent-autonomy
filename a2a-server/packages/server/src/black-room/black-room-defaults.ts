// [STUB] black-room-defaults — requires real implementation
export const BLACK_ROOM_DEFAULTS = {
  timeoutMs: 30000,
  maxRetries: 3,
};

/** Sidecar / compress_history model when caller does not pass an override */
export const BLACK_ROOM_DEFAULT_LLM_MODEL =
  process.env["A2A_BLACK_ROOM_LLM_MODEL"] ??
  process.env["A2A_LLM_MODEL"] ??
  "llama3";
