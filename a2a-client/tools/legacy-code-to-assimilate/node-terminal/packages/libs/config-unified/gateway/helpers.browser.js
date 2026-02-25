/**
 * @typedef {'active' | 'inactive' | 'deprecated'} RuleStatus
 */

/**
 * @typedef {object} GatewayRule
 * @property {string} id - Unique ID for the gateway rule
 * @property {string} name - Rule name
 * @property {string} path - URL path regex for the rule
 * @property {string} targetUrl - Target URL to redirect or proxy to
 * @property {number} priority - Priority for rule matching (0-100)
 * @property {RuleStatus} status - Current status of the rule
 * @property {string} [description] - Optional description
 * @property {string} [created] - ISO date string
 * @property {string} [updated] - ISO date string
 */

/**
 * Normalizes a raw gateway rule object from the config manager to a consistent UI model.
 * @param {object} rawRule - The raw rule object from the config.
 * @returns {GatewayRule}
 */
export function normalizeGatewayRule(rawRule) {
  return {
    id: rawRule.id,
    name: rawRule.name,
    path: rawRule.path,
    targetUrl: rawRule.targetUrl,
    status: rawRule.status,
    priority: rawRule.priority,
    description: rawRule.description || '',
    created: rawRule.created || new Date().toISOString(),
    updated: rawRule.updated || new Date().toISOString(),
  };
}

/**
 * Denormalizes a gateway rule UI model back to a format suitable for the config manager.
 * Ensures only updatable fields are included and timestamps are managed.
 * @param {GatewayRule} rule - The rule object from the UI model.
 * @returns {object}
 */
export function denormalizeGatewayRule(rule) {
  const { id, name, path, targetUrl, status, priority, description } = rule;
  return {
    id,
    name,
    path,
    targetUrl,
    status,
    priority,
    description: description || null, // Store null if empty
  };
}

/**
 * Validates if a string is a potentially valid URL (basic check).
 * @param {string} urlString
 * @returns {boolean}
 */
export function isValidUrl(urlString) {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validates if a string is a potentially valid regular expression.
 * @param {string} regexString
 * @returns {boolean}
 */
export function isValidRegex(regexString) {
  try {
    new RegExp(regexString);
    return true;
  } catch (e) {
    return false;
  }
}
