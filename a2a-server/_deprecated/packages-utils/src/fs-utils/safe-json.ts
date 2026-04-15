/**
 * Safe JSON reading utilities
 * Created to eliminate code duplication in JSON file handling
 */

import fs from 'fs';

/**
 * Safely read and parse a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {{ok: boolean, value?: any, error?: string}} Result object with parsed data or error info
 */
export function safeReadJsonWithError(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

/**
 * Safely read and parse a JSON file (simple version returning null on error)
 * @param {string} filePath - Path to the JSON file
 * @returns {any|null} Parsed JSON data or null if error occurred
 */
export function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}