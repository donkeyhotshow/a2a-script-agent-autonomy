/**
 * SkillRegistry — stub placeholder.
 *
 * This is intentionally minimal. The real plugin runtime lives in:
 *   a2a-orchestrator/src/plugin-runtime/plugin-manager.ts
 *
 * See: a2a-orchestrator/tasks/cancelled/server-skills-stub-not-plugin-runtime.md
 */
export class SkillRegistry {
  // Accept an optional custom directory path (used by tools-evolve.ts) but ignore it
  // until a real file-based loader is implemented via the plugin-manager.
  constructor(_customDir?: string) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  register(_name: string, _skill: unknown): void {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get(_name: string): unknown { return null; }
  list(): string[] { return []; }

  /** Called by tools-evolve.ts after writing a new skill file. No-op until real loader. */
  async init(): Promise<void> {}
}
export const skillRegistry = new SkillRegistry();
