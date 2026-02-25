/**
 * @typedef {object} Project
 * @property {string} id - Unique ID for the project
 * @property {string} name - Project name
 * @property {'active' | 'archived' | 'on-hold' | 'completed'} status - Current status of the project
 * @property {number} priority - Priority for project visibility or resource allocation (0-100)
 * @property {string} [description]
 * @property {string} [startDate] - ISO date string (YYYY-MM-DD)
 * @property {string} [endDate] - ISO date string (YYYY-MM-DD)
 * @property {string} [created] - ISO date-time string
 * @property {string} [updated] - ISO date-time string
 */

/**
 * Normalizes raw project data from config into a consistent Project format.
 * Applies default priority if missing.
 * @param {object} raw - Raw project object from config.
 * @returns {Project}
 */
export function normalizeProject(raw) {
  if (!raw) return null;

  return {
    id: raw.id,
    name: raw.name,
    status: raw.status || 'active',
    priority: raw.priority !== undefined ? raw.priority : 50,
    description: raw.description || '',
    startDate: raw.startDate || '',
    endDate: raw.endDate || '',
    created: raw.created || new Date().toISOString(),
    updated: raw.updated || raw.created || new Date().toISOString(),
  };
}

/**
 * Converts a normalized Project object into a format suitable for saving to config.
 * @param {Project} project - Normalized Project object.
 * @returns {object}
 */
export function denormalizeProject(project) {
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    priority: project.priority,
    description: project.description,
    startDate: project.startDate,
    endDate: project.endDate,
    created: project.created,
    updated: project.updated,
  };
}

/**
 * Validates if a date string is in YYYY-MM-DD format.
 * @param {string} dateString
 * @returns {boolean}
 */
export function isValidDateFormat(dateString) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

