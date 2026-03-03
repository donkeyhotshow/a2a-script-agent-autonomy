/**
 * JSONPath Utilities for Transform Runtime
 * 
 * Provides JSONPath query and set operations using jsonpath-plus
 */

import { JSONPath } from 'jsonpath-plus';

/**
 * Query values from an object using JSONPath
 * 
 * @param obj - The object to query
 * @param path - JSONPath expression
 * @returns The queried value(s), or undefined if not found
 */
export function query<T = unknown>(obj: unknown, path: string): T | undefined {
  // Handle root path
  if (!path || path === '$' || path === '$.') {
    return obj as T;
  }
  
  // Normalize path - remove $ and $. prefix
  const normalizedPath = path.replace(/^\$?\/?/, '');
  
  // If the path is just $ or empty after normalization, return root
  if (!normalizedPath) {
    return obj as T;
  }
  
  const results = JSONPath({
    path: normalizedPath,
    json: obj,
    resultType: 'value'
  });
  
  if (results.length === 0) {
    return undefined;
  }
  
  // Return the first result for simple queries
  return results[0]?.value as T;
}

/**
 * Set a value at a JSONPath in an object
 * Creates nested structures as needed
 * 
 * @param obj - The object to modify
 * @param path - JSONPath expression
 * @param value - The value to set
 * @returns The modified object
 */
export function set(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  // Handle root path
  if (path === '$' || path === '$out') {
    if (typeof value === 'object' && value !== null) {
      Object.assign(obj, value);
    }
    return obj;
  }
  
  // Normalize path - remove $ prefix and $out prefix if present
  let normalizedPath = path.replace(/^\$out\.?/, '');
  normalizedPath = normalizedPath.replace(/^\$\.?/, '');
  
  if (!normalizedPath) {
    if (typeof value === 'object' && value !== null) {
      Object.assign(obj, value as object);
    }
    return obj;
  }
  
  const parts = normalizedPath.split('.');
  let current: unknown = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const nextPart = parts[i + 1];
    
    if (current === undefined || current === null) {
      break;
    }
    
    if (typeof current !== 'object') {
      break;
    }
    
    const currentObj = current as Record<string, unknown>;
    
    // Create intermediate objects/arrays as needed
    if (!(part in currentObj)) {
      // Check if next part looks like an array index
      if (/^\d+$/.test(nextPart)) {
        currentObj[part] = [];
      } else {
        currentObj[part] = {};
      }
    }
    
    current = currentObj[part];
  }
  
  // Set the final value
  const lastPart = parts[parts.length - 1];
  if (current !== undefined && current !== null && typeof current === 'object') {
    (current as Record<string, unknown>)[lastPart] = value;
  } else if (parts.length === 1) {
    obj[lastPart] = value;
  }
  
  return obj;
}

/**
 * Copy a value from one path to another in an object
 * 
 * @param obj - The object to modify
 * @param fromPath - Source JSONPath
 * @param toPath - Destination JSONPath
 * @returns The modified object
 */
export function copy(
  obj: Record<string, unknown>, 
  fromPath: string, 
  toPath: string
): Record<string, unknown> {
  // Get value from source
  const value = query(obj, fromPath);
  
  // Set value at destination
  if (value !== undefined) {
    set(obj, toPath, JSON.parse(JSON.stringify(value))); // Deep clone
  }
  
  return obj;
}

/**
 * Append a value to an array at a JSONPath
 * 
 * @param obj - The object to modify
 * @param arrayPath - JSONPath to the array
 * @param value - The value to append
 * @returns The modified object
 */
export function appendToArray(
  obj: Record<string, unknown>, 
  arrayPath: string, 
  value: unknown
): Record<string, unknown> {
  const arr = query<unknown[]>(obj, arrayPath);
  
  if (!Array.isArray(arr)) {
    // Create the array if it doesn't exist
    set(obj, arrayPath, [value]);
    return obj;
  }
  
  arr.push(value);
  return obj;
}

/**
 * Resolve template placeholders in a value
 * Template syntax: ${path.to.value}
 * 
 * @param value - The value potentially containing templates
 * @param context - The context object to resolve templates from
 * @returns The value with templates resolved
 */
export function resolveTemplates(
  value: unknown, 
  context: Record<string, unknown>
): unknown {
  if (typeof value === 'string') {
    // Handle template strings like "$.llm.message"
    return value.replace(/\$\{([^}]+)\}/g, (_, path) => {
      const resolved = query(context, path);
      return resolved !== undefined ? String(resolved) : '';
    });
  }
  
  if (Array.isArray(value)) {
    return value.map(item => resolveTemplates(item, context));
  }
  
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveTemplates(val, context);
    }
    return result;
  }
  
  return value;
}

/**
 * Check if a path exists in an object
 * 
 * @param obj - The object to check
 * @param path - JSONPath expression
 * @returns true if the path exists and has a value
 */
export function exists(obj: unknown, path: string): boolean {
  const value = query(obj, path);
  return value !== undefined;
}
