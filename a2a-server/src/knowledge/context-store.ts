/**
 * Context Store — registry of injectable context blocks by id
 * Production-ready: validation, limits, builtin protection
 */

const CONTEXT_ID_REGEX = /^[a-z0-9][a-z0-9_-]{0,255}$/i;
const MAX_CONTENT_BYTES = 512 * 1024; // 512KB per block
const BUILTIN_IDS = new Set(['neuron-context-laravel-11']);

const builtin: Map<string, string> = new Map([
  [
    'neuron-context-laravel-11',
    `## Laravel 11 Project Structure
- Models: app/Models/
- Controllers: app/Http/Controllers/
- Views: resources/views/
- Routes: routes/
- Stack: laravel, inertia, vue, tailwind
`,
  ],
]);

const blocks: Map<string, string> = new Map();

function validateId(id: unknown): id is string {
  if (typeof id !== 'string' || id.length === 0) return false;
  if (id.length > 256) return false;
  return CONTEXT_ID_REGEX.test(id);
}

function validateContent(content: unknown): content is string {
  if (typeof content !== 'string') return false;
  const bytes = Buffer.byteLength(content, 'utf8');
  return bytes <= MAX_CONTENT_BYTES;
}

/**
 * Register a context block. User blocks override builtin when allowOverwriteBuiltin.
 * @throws Error if id or content invalid
 */
export function registerContextBlock(
  id: string,
  content: string,
  options?: { allowOverwriteBuiltin?: boolean }
): void {
  if (!validateId(id)) {
    throw new Error(
      `Context block id invalid: must be 1-256 chars, alphanumeric, hyphen, underscore`
    );
  }
  if (!validateContent(content)) {
    throw new Error(
      `Context block content invalid: max ${MAX_CONTENT_BYTES / 1024}KB`
    );
  }
  if (BUILTIN_IDS.has(id) && !options?.allowOverwriteBuiltin) {
    throw new Error(`Cannot override builtin context block: ${id}`);
  }
  blocks.set(id, content);
}

export function getContextBlock(id: string): string | undefined {
  if (!validateId(id)) return undefined;
  return blocks.get(id) ?? builtin.get(id);
}

export function hasContextBlock(id: string): boolean {
  if (!validateId(id)) return false;
  return blocks.has(id) || builtin.has(id);
}

export function clearContextBlocks(): void {
  blocks.clear();
}

export function listRegisteredIds(): string[] {
  const userIds = Array.from(blocks.keys());
  const builtinIds = Array.from(builtin.keys()).filter((id) => !blocks.has(id));
  return [...new Set([...userIds, ...builtinIds])];
}
