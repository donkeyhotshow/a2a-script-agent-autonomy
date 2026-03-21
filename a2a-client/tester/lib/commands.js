/**
 * Command Utilities
 */

import fetch from 'node-fetch';

/**
 * Command types and their expected responses
 */
export const COMMAND_TYPES = {
  // Panel commands
  PANEL_SHOW: 'panel_control',
  PANEL_HIDE: 'panel_control',
  PANEL_MOVE: 'panel_control',
  PANEL_RESIZE: 'panel_control',
  PANEL_MINIMIZE: 'panel_control',
  PANEL_MAXIMIZE: 'panel_control',
  PANEL_CLOSE: 'panel_control',

  // Session commands
  SESSION_CREATE: 'session_control',
  SESSION_LIST: 'session_control',
  SESSION_SWITCH: 'session_control',
  SESSION_DELETE: 'session_control',
  SESSION_STATUS: 'session_control',

  // Utility commands
  PING: 'ping',
  ECHO: 'echo',
  GET_STATUS: 'get_status',
  GET_TIMESTAMP: 'get_timestamp'
};

/**
 * Panel actions
 */
export const PANEL_ACTIONS = {
  SHOW: 'show',
  HIDE: 'hide',
  MOVE: 'move',
  RESIZE: 'resize',
  MINIMIZE: 'minimize',
  MAXIMIZE: 'maximize',
  CLOSE: 'close'
};

/**
 * Session actions
 */
export const SESSION_ACTIONS = {
  CREATE: 'create',
  LIST: 'list',
  SWITCH: 'switch',
  DELETE: 'delete',
  STATUS: 'status'
};

/**
 * Send command to web client via API server
 */
export async function sendCommand(command, data = {}, options = {}) {
  const {
    apiUrl = 'http://localhost:3001',
    sessionId = 'tester-session',
    timeout = 5000,
    retries = 1
  } = options;

  const payload = {
    type: 'tester_command',
    command,
    data,
    sessionId,
    timestamp: new Date().toISOString()
  };

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${apiUrl}/api/tester/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError;
}

/**
 * Send panel control command
 */
export async function sendPanelCommand(action, panelId, options = {}) {
  const { position, size, ...otherOptions } = options;

  const data = {
    action,
    panelId,
    ...(position && { position }),
    ...(size && { size })
  };

  return await sendCommand(COMMAND_TYPES.PANEL_SHOW, data, otherOptions);
}

/**
 * Send session control command
 */
export async function sendSessionCommand(action, sessionOptions = {}) {
  const { sessionId, title, ...otherOptions } = sessionOptions;

  const data = {
    action,
    ...(sessionId && { sessionId }),
    ...(title && { title })
  };

  return await sendCommand(COMMAND_TYPES.SESSION_CREATE, data, otherOptions);
}

/**
 * Obsolete: Client API never exposed GET /api/sessions/:id/events.
 * Poll `GET /api/a2a/sessions/:sessionId/promise/:promiseId` or talk to a2a-server directly.
 */
export async function waitForResponse(_commandId, _options = {}) {
  throw new Error(
    '[tester] waitForResponse is removed: no session events endpoint. Use promise polling on Client API or a2a-server /api/v1/requests/:id/result.'
  );
}

/**
 * Validate command data
 */
export function validateCommand(command, data) {
  const errors = [];

  switch (command) {
    case COMMAND_TYPES.PANEL_SHOW:
    case COMMAND_TYPES.PANEL_HIDE:
    case COMMAND_TYPES.PANEL_MINIMIZE:
    case COMMAND_TYPES.PANEL_MAXIMIZE:
    case COMMAND_TYPES.PANEL_CLOSE:
      if (!data.panelId) {
        errors.push('panelId is required for panel commands');
      }
      break;

    case COMMAND_TYPES.PANEL_MOVE:
      if (!data.panelId) {
        errors.push('panelId is required');
      }
      if (!data.position || typeof data.position.x !== 'number' || typeof data.position.y !== 'number') {
        errors.push('position with x and y coordinates is required');
      }
      break;

    case COMMAND_TYPES.PANEL_RESIZE:
      if (!data.panelId) {
        errors.push('panelId is required');
      }
      if (!data.size || typeof data.size.width !== 'number' || typeof data.size.height !== 'number') {
        errors.push('size with width and height is required');
      }
      break;

    case COMMAND_TYPES.SESSION_CREATE:
      if (!data.title) {
        errors.push('title is required for session creation');
      }
      break;

    case COMMAND_TYPES.SESSION_SWITCH:
    case COMMAND_TYPES.SESSION_DELETE:
    case COMMAND_TYPES.SESSION_STATUS:
      if (!data.sessionId) {
        errors.push('sessionId is required');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create command with validation
 */
export async function createCommand(command, data = {}, options = {}) {
  const validation = validateCommand(command, data);

  if (!validation.valid) {
    throw new Error(`Invalid command data: ${validation.errors.join(', ')}`);
  }

  return await sendCommand(command, data, options);
}