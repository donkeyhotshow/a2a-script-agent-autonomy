/**
 * @typedef {'single' | 'range'} PortRuleKind
 */

/**
 * @typedef {'allowed' | 'blocked' | 'reserved' | 'in_use' | 'available'} PortStatus
 */

/**
 * @typedef {object} PortRule
 * @property {string} id
 * @property {PortRuleKind} kind
 * @property {number} [port] - For single ports
 * @property {{from: number, to: number}} [range] - For port ranges
 * @property {PortStatus} status
 * @property {number} priority
 * @property {string} source - 'model' | 'domains' | 'hosting' | 'gateway'
 * @property {object} [metadata]
 */

/**
 * Normalizes raw port data from config into a consistent PortRule format.
 * Applies default priority if missing.
 * @param {object} raw - Raw port object from config.
 * @returns {PortRule}
 */
export function normalizePortRule(raw) {
  if (!raw) return null;

  const kind = raw.port !== undefined ? 'single' : 'range';
  const id = raw.id || (kind === 'single' ? `single-${raw.port}` : `range-${raw.from}-${raw.to}`);

  return {
    id,
    kind,
    port: raw.port,
    range: raw.from !== undefined && raw.to !== undefined ? { from: raw.from, to: raw.to } : undefined,
    status: raw.status || raw.type || 'available', // Fallback to type for status
    priority: raw.priority !== undefined ? raw.priority : 50,
    source: 'model',
    metadata: raw.metadata || {},
  };
}

/**
 * Converts a normalized PortRule into a format suitable for saving to config.
 * @param {PortRule} rule - Normalized PortRule.
 * @returns {object}
 */
export function denormalizePortRule(rule) {
  const base = {
    id: rule.id,
    status: rule.status,
    priority: rule.priority,
    metadata: rule.metadata,
  };

  if (rule.kind === 'single') {
    return { ...base, port: rule.port };
  } else if (rule.kind === 'range') {
    return { ...base, from: rule.range.from, to: rule.range.to };
  }
  return base;
}

/**
 * Validates if a port number is within the valid range (1-65535).
 * @param {number} port
 * @returns {boolean}
 */
export function isValidPort(port) {
  return typeof port === 'number' && Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Validates a port range object.
 * @param {{from: number, to: number}} range
 * @returns {boolean}
 */
export function isValidRange(range) {
  return (
    range &&
    isValidPort(range.from) &&
    isValidPort(range.to) &&
    range.from <= range.to
  );
}

/**
 * Checks if two ranges overlap.
 * @param {{from: number, to: number}} rangeA
 * @param {{from: number, to: number}} rangeB
 * @returns {boolean}
 */
export function hasRangeOverlap(rangeA, rangeB) {
  if (!isValidRange(rangeA) || !isValidRange(rangeB)) return false;
  return !(rangeA.to < rangeB.from || rangeA.from > rangeB.to);
}

/**
 * Checks if a port is within any of the given ranges.
 * @param {number} port
 * @param {Array<{from: number, to: number}>} ranges
 * @returns {boolean}
 */
export function isPortInAnyRange(port, ranges) {
  return ranges.some(range => port >= range.from && port <= range.to);
}

/**
 * Generates a list of all ports covered by a rule (single or range).
 * @param {PortRule} rule
 * @returns {number[]}
 */
export function getPortsCoveredByRule(rule) {
  if (rule.kind === 'single') {
    return [rule.port];
  } else if (rule.kind === 'range') {
    return Array.from({ length: rule.range.to - rule.range.from + 1 }, (_, i) => rule.range.from + i);
  }
  return [];
}

/**
 * Checks for conflicts between a new rule and existing rules.
 * @param {PortRule} newRule - The new rule to check.
 * @param {PortRule[]} existingRules - All other existing rules.
 * @returns {string | null} Returns an error message if a conflict is found, otherwise null.
 */
export function findRuleConflict(newRule, existingRules) {
  const newRulePorts = getPortsCoveredByRule(newRule);

  for (const existingRule of existingRules) {
    if (newRule.id && newRule.id === existingRule.id) {
      continue; // Don't check a rule against itself
    }

    const existingRulePorts = getPortsCoveredByRule(existingRule);
    const intersection = newRulePorts.filter(port => existingRulePorts.includes(port));

    if (intersection.length > 0) {
      return `Overlap with rule '${existingRule.id}' on port(s): ${intersection.join(', ')}.`;
    }
  }
  return null;
}

// State management functions for UI composables

/**
 * Gets the port number for a service from the port mapping.
 * @param {object} state - Port state object with map property
 * @param {string} serviceId - Service identifier
 * @returns {number|null} Port number or null if not found
 */
export function getPortForServiceFromMap(state, serviceId) {
  return state?.map?.[serviceId] || null;
}

/**
 * Gets the service ID for a port from the port mapping.
 * @param {object} state - Port state object with map property
 * @param {number} port - Port number
 * @returns {string|null} Service ID or null if not found
 */
export function getServiceByPortFromMap(state, port) {
  if (!state?.map) return null;
  for (const [serviceId, portNumber] of Object.entries(state.map)) {
    if (portNumber === port) return serviceId;
  }
  return null;
}

/**
 * Checks if a port is reserved in the state.
 * @param {object} state - Port state object with reserved array
 * @param {number} port - Port number to check
 * @returns {boolean} True if port is reserved
 */
export function isPortReservedInState(state, port) {
  return state?.reserved?.includes(port) || false;
}

/**
 * Checks if a port is within any range in the state.
 * @param {object} state - Port state object with ranges array
 * @param {number} port - Port number to check
 * @returns {boolean} True if port is in any range
 */
export function isPortInRangeInState(state, port) {
  if (!state?.ranges) return false;
  return state.ranges.some(range => port >= range.from && port <= range.to);
}

/**
 * Gets available ports within a specific range, filtering out reserved and mapped ports.
 * @param {object} state - Port state object
 * @param {number} from - Start of range
 * @param {number} to - End of range
 * @returns {number[]} Array of available ports
 */
export function getAvailablePortsInRangeFromState(state, from, to) {
  const available = [];
  const reserved = state?.reserved || [];
  const mapped = Object.values(state?.map || {});
  
  for (let port = from; port <= to; port++) {
    if (!reserved.includes(port) && !mapped.includes(port)) {
      available.push(port);
    }
  }
  return available;
}

/**
 * Gets all available ports from the state (not reserved or mapped).
 * @param {object} state - Port state object
 * @returns {number[]} Array of available ports
 */
export function getAvailablePortsFromState(state) {
  const reserved = state?.reserved || [];
  const mapped = Object.values(state?.map || {});
  const used = [...reserved, ...mapped];
  
  const available = [];
  for (let port = 1; port <= 65535; port++) {
    if (!used.includes(port)) {
      available.push(port);
    }
  }
  return available;
}

/**
 * Finds a free port in the state.
 * @param {object} state - Port state object
 * @param {number} [preferredPort] - Preferred port to check first
 * @returns {number|null} Free port number or null if none found
 */
export function findFreePortInState(state, preferredPort = null) {
  const reserved = state?.reserved || [];
  const mapped = Object.values(state?.map || {});
  const used = [...reserved, ...mapped];
  
  // Check preferred port first
  if (preferredPort && !used.includes(preferredPort)) {
    return preferredPort;
  }
  
  // Find first available port
  for (let port = 1; port <= 65535; port++) {
    if (!used.includes(port)) {
      return port;
    }
  }
  return null;
}

/**
 * Adds a reserved port to the state.
 * @param {object} state - Port state object
 * @param {number} port - Port number to reserve
 * @returns {object} Updated state
 */
export function addReservedPortToState(state, port) {
  const reserved = state?.reserved || [];
  if (!reserved.includes(port)) {
    reserved.push(port);
  }
  return { ...state, reserved };
}

/**
 * Removes a reserved port from the state.
 * @param {object} state - Port state object
 * @param {number} port - Port number to unreserve
 * @returns {object} Updated state
 */
export function removeReservedPortFromState(state, port) {
  const reserved = (state?.reserved || []).filter(p => p !== port);
  return { ...state, reserved };
}

/**
 * Adds a port range to the state.
 * @param {object} state - Port state object
 * @param {object} range - Range object with from and to properties
 * @returns {object} Updated state
 */
export function addPortRangeToState(state, range) {
  const ranges = state?.ranges || [];
  ranges.push(range);
  return { ...state, ranges };
}

/**
 * Removes a port range from the state.
 * @param {object} state - Port state object
 * @param {object} range - Range object with from and to properties
 * @returns {object} Updated state
 */
export function removePortRangeFromState(state, range) {
  const ranges = (state?.ranges || []).filter(r => 
    !(r.from === range.from && r.to === range.to)
  );
  return { ...state, ranges };
}

/**
 * Adds a port mapping to the state.
 * @param {object} state - Port state object
 * @param {string} serviceId - Service identifier
 * @param {number} port - Port number
 * @returns {object} Updated state
 */
export function addPortMappingToState(state, serviceId, port) {
  const map = { ...(state?.map || {}) };
  map[serviceId] = port;
  return { ...state, map };
}

/**
 * Removes a port mapping from the state.
 * @param {object} state - Port state object
 * @param {string} serviceId - Service identifier
 * @returns {object} Updated state
 */
export function removePortMappingFromState(state, serviceId) {
  const map = { ...(state?.map || {}) };
  delete map[serviceId];
  return { ...state, map };
}

/**
 * Gets port statistics from the state.
 * @param {object} state - Port state object
 * @returns {object} Statistics object
 */
export function getPortsStatsFromState(state) {
  const reserved = state?.reserved || [];
  const ranges = state?.ranges || [];
  const mapped = Object.values(state?.map || {});
  
  return {
    totalReserved: reserved.length,
    totalRanges: ranges.length,
    totalMapped: mapped.length,
    totalUsed: reserved.length + mapped.length,
    ranges: ranges.map(r => ({ from: r.from, to: r.to, count: r.to - r.from + 1 }))
  };
}

/**
 * Converts config data to UI state format.
 * @param {object} config - Configuration object
 * @returns {object} UI state object
 */
export function configToUiState(config) {
  return {
    reserved: config?.reserved || [],
    ranges: config?.ranges || [],
    map: config?.map || {}
  };
}

/**
 * Validates a port range.
 * @param {object} range - Range object with from and to properties
 * @returns {boolean} True if range is valid
 */
export function validateRange(range) {
  return isValidRange(range);
}


