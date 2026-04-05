import fs from 'node:fs';
import path from 'path';

export type SkillMeta = {
  name: string;
  version: string;
  path: string;
  schema: any; 
  qualityScore?: number;
  lastUsed?: number;
};

export class SkillRegistry {
  private skills = new Map<string, SkillMeta>();
  private dir: string;

  constructor(dir: string = path.join(__dirname, 'custom')) {
    this.dir = dir;
  }

  async init() {
    if (!fs.existsSync(this.dir)) {
      await fs.promises.mkdir(this.dir, { recursive: true });
    }
    await this.scanDir();
    // OpenSpace style periodic re-scan
    setInterval(() => this.scanDir(), 60_000);
  }

  private async scanDir() {
    try {
      const files = await fs.promises.readdir(this.dir);
      for (const f of files) {
        if (f.endsWith('.skill.ts')) {
          const p = path.join(this.dir, f);
          const skillMeta: SkillMeta = {
              name: f.replace('.skill.ts', ''),
              version: '1.0.0',
              path: p,
              schema: {}
          };
          
          if (!this.skills.has(skillMeta.name)) {
            this.skills.set(skillMeta.name, skillMeta);
          }
        }
      }
    } catch(e) {
      console.error('Failed to scan skill directory', e);
    }
  }

  listTools() {
    return Array.from(this.skills.values()).map((s) => ({
      name: s.name,
      inputSchema: s.schema,
    }));
  }
}
