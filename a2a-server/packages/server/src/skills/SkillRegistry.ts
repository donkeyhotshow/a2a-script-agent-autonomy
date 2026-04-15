// [STUB] SkillRegistry — requires real implementation
export class SkillRegistry {
  register(_name: string, _skill: unknown): void {}
  get(_name: string): unknown { return null; }
  list(): string[] { return []; }
}
export const skillRegistry = new SkillRegistry();
