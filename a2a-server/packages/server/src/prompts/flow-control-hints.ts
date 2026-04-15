// [STUB] flow-control-hints — requires real implementation
export const FLOW_CONTROL_HINTS = {
  GRAY_ROOM: 'gray-room',
  DIALOG: 'dialog',
  AGENT: 'agent',
} as const;

export type FlowControlHint = typeof FLOW_CONTROL_HINTS[keyof typeof FLOW_CONTROL_HINTS];
