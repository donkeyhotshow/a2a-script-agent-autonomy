/**
 * @typedef {object} Domain
 * @property {string} id - Unique ID for the domain
 * @property {string} name - Domain name
 * @property {'active' | 'inactive' | 'pending'} status - Current status of the domain
 * @property {number} priority - Priority for domain resolution or processing (0-100)
 * @property {string} ipAddress - Associated IP address
 * @property {string} [description]
 * @property {string} [created] - ISO date string
 * @property {string} [updated] - ISO date string
 */

/**
 * Normalizes raw domain data from config into a consistent Domain format.
 * Applies default priority if missing.
 * @param {object} raw - Raw domain object from config.
 * @returns {Domain}
 */
export function normalizeDomain(raw) {
  if (!raw) return null;

  return {
    id: raw.id,
    name: raw.name,
    status: raw.status || 'active',
    priority: raw.priority !== undefined ? raw.priority : 50,
    ipAddress: raw.ipAddress,
    description: raw.description || '',
    created: raw.created || new Date().toISOString(),
    updated: raw.updated || raw.created || new Date().toISOString(),
  };
}

/**
 * Converts a normalized Domain object into a format suitable for saving to config.
 * @param {Domain} domain - Normalized Domain object.
 * @returns {object}
 */
export function denormalizeDomain(domain) {
  return {
    id: domain.id,
    name: domain.name,
    status: domain.status,
    priority: domain.priority,
    ipAddress: domain.ipAddress,
    description: domain.description,
    created: domain.created,
    updated: domain.updated,
  };
}

/**
 * Validates if a domain name is in a basic valid format.
 * @param {string} name
 * @returns {boolean}
 */
export function isValidDomainName(name) {
  const regex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z]{2,6}$/;
  return typeof name === 'string' && regex.test(name);
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
