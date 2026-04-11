/**
 * Centralized Action Type Constants
 * Single source of truth for all valid action types
 */

// Core action types used across handler registry and validation
export const ACTION_TYPES = [
  'read-file',
  'write-file',
  'file-exists',
  'list-directory',
  'execute-command',
  'grep-search',
  'edit-patch',
  'run-script',
] as const;

// Type definition derived from the constant array
export type ActionType = typeof ACTION_TYPES[number];

// Pre-initialized Set for fast validation lookups
export const VALID_ACTION_TYPES_SET = new Set<ActionType>(ACTION_TYPES);
