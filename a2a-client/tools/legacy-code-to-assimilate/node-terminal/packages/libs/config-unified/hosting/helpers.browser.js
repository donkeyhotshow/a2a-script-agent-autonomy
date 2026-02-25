/**
 * @typedef {object} Server
 * @property {string} id - Unique ID for the server
 * @property {string} name - Server name
 * @property {string} ipAddress - Server IP address
 * @property {'online' | 'offline' | 'maintenance'} status - Current status of the server
 * @property {number} priority - Priority for server selection or load balancing (0-100)
 * @property {string} [description]
 * @property {string} [created] - ISO date string
 * @property {string} [updated] - ISO date string
 */

/**
 * Normalizes raw server data from config into a consistent Server format.
 * Applies default priority if missing.
 * @param {object} raw - Raw server object from config.
 * @returns {Server}
 */
export function normalizeServer(raw) {
  if (!raw) return null;

  return {
    id: raw.id,
    name: raw.name,
    ipAddress: raw.ipAddress,
    status: raw.status || 'online',
    priority: raw.priority !== undefined ? raw.priority : 50,
    description: raw.description || '',
    created: raw.created || new Date().toISOString(),
    updated: raw.updated || raw.created || new Date().toISOString(),
  };
}

/**
 * Converts a normalized Server object into a format suitable for saving to config.
 * @param {Server} server - Normalized Server object.
 * @returns {object}
 */
export function denormalizeServer(server) {
  return {
    id: server.id,
    name: server.name,
    ipAddress: server.ipAddress,
    status: server.status,
    priority: server.priority,
    description: server.description,
    created: server.created,
    updated: server.updated,
  };
}

/**
 * Validates if an IP address is in a valid IPv4 format.
 * @param {string} ip
 * @returns {boolean}
 */
export function isValidIpAddress(ip) {
  const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return typeof ip === 'string' && regex.test(ip);
}

