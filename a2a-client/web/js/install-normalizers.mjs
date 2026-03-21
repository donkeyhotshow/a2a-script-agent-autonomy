/**
 * Installs window.Normalizers from the canonical ESM implementation (utils/normalizers.js).
 * Load as <script type="module" src="js/install-normalizers.mjs"></script> (runs after classic stack, before DOMContentLoaded).
 */
import { normalizeMessage, MAX_MESSAGES } from './utils/normalizers.js';

globalThis.Normalizers = { normalizeMessage, MAX_MESSAGES };
