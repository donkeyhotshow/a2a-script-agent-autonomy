/**
 * JSONPath Utilities for Transform Operations
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
  const dollar = String.fromCharCode(36); // $
  if (!path || path === dollar || path === dollar + '.') {
    return obj as T;
  }
  
  // Normalize path - jsonpath-plus prefers paths starting with $
  let jsonPath = path;
  if (!path.startsWith(dollar)) {
    jsonPath = dollar + '.' + path;
  }
  
  const results = JSONPath({
    path: jsonPath,
    json: obj,
    resultType: 'all'
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
  const dollar = String.fromCharCode(36); // $
  
  // Handle root path
  if (path === dollar || path === dollar + 'out') {
    if (typeof value === 'object' && value !== null) {
      Object.assign(obj, value);
    }
    return obj;
  }
  
  // Normalize path - remove $ prefix and $out prefix if present
  let normalizedPath = path;
  if (path.startsWith(dollar + 'out')) {
    normalizedPath = path.slice(4);
  } else if (path.startsWith(dollar)) {
    normalizedPath = path.slice(1);
  }
  if (normalizedPath.startsWith('.')) {
    normalizedPath = normalizedPath.slice(1);
  }
  
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
    const str = value as string;
    // Pipeline JSON often uses a whole-string JSONPath (e.g. "$.result.message") for append/set values.
    if (str.startsWith('$.') && !str.includes('${')) {
      const resolved = query(context, str);
      if (resolved === undefined || resolved === null) {
        return '';
      }
      if (typeof resolved === 'string') {
        return resolved;
      }
      if (typeof resolved === 'number' || typeof resolved === 'boolean') {
        return String(resolved);
      }
      return JSON.stringify(resolved);
    }
    const parts: string[] = [];
    let lastIndex = 0;
    
    // Find all ${...} patterns
    const regex = /\$\{([^}]+)\}/g;
    let match;
    
    while ((match = regex.exec(str)) !== null) {
      // Add text before the match
      parts.push(str.slice(lastIndex, match.index));
      // Add resolved value
      const path = match[1];
      const resolved = query(context, path);
      parts.push(resolved !== undefined ? String(resolved) : '');
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    parts.push(str.slice(lastIndex));
    
    return parts.join('');
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

/**
 * Extract JSON from markdown content
 * Looks for JSON blocks (```json ... ```) or raw JSON
 */
export function extractJsonFromMarkdown(md: string): unknown {
  // Try to find JSON code block
  const jsonBlockMatch = md.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]);
    } catch {
      // Fall through to try raw JSON
    }
  }
  
  // Try to find any code block
  const codeBlockMatch = md.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // Fall through to try raw
    }
  }
  
  // Try parsing the entire content as JSON
  try {
    return JSON.parse(md);
  } catch {
    // Return the raw content if no valid JSON found
    return md;
  }
}

/**
 * Simple template rendering - replaces {{path}} placeholders with values
 */
export function renderTemplateSimple(template: string, data: Record<string, unknown>): string {
  const pattern = '\\${([^}]+)}';
  const regex = new RegExp(pattern, 'g');

  return template.replace(regex, (_, key) => {
    const trimmedKey = key.trim();
    const value = query(data, trimmedKey);
    return stringifyForTemplate(value);
  });
}

function stringifyForTemplate(value: unknown): string {
  if (value === undefined) {
    return 'null';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (typeof value === 'object' && value !== null) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

function truncateToMaxChars(text: string, maxChars: number, suffix: string): string {
  if (text.length <= maxChars) return text;
  const suf = suffix;
  if (suf.length >= maxChars) return text.slice(0, maxChars);
  return text.slice(0, maxChars - suf.length) + suf;
}