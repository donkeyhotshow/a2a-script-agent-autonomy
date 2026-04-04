import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

export interface StateActionPair {
  state_hash: string;
  context_summary: string;
  action_type: string;
  action_payload: string;
  quality_score: number; // 0..1
  timestamp: string;
}

const DEFAULT_EXPERIENCE_PATH = join(process.cwd(), 'storage', 'experience_bank.json');

export class ExperienceBank {
  private store: Map<string, StateActionPair[]> = new Map();
  private readonly filePath: string;

  constructor(filePath: string = process.env['EXPERIENCE_BANK_PATH'] ?? DEFAULT_EXPERIENCE_PATH) {
    this.filePath = filePath;
    this.load().catch(() => {});
  }

  private async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        this.store.set('global_experiences', parsed);
      }
    } catch {
      // File doesn't exist or invalid JSON
    }
  }

  private async save(): Promise<void> {
    try {
      const all = this.store.get('global_experiences') || [];
      await fs.mkdir(join(this.filePath, '..'), { recursive: true });
      await fs.writeFile(this.filePath, JSON.stringify(all, null, 2), 'utf-8');
    } catch (err) {
      console.error('[ExperienceBank] Save failure', err);
    }
  }

  async recordTurn(
    sessionId: string,
    turnId: string,
    context: string,
    action: { type: string; payload: string },
    score: number
  ): Promise<void> {
    const pair: StateActionPair = {
      state_hash: randomUUID(),
      context_summary: context.slice(0, 500),
      action_type: action.type,
      action_payload: action.payload.slice(0, 500),
      quality_score: score,
      timestamp: new Date().toISOString()
    };
    
    const existing = this.store.get('global_experiences') || [];
    existing.push(pair);
    this.store.set('global_experiences', existing);
    await this.save();
  }

  async getRelevantExperiences(context: string): Promise<StateActionPair[]> {
    const all = this.store.get('global_experiences') || [];
    return all.sort((a, b) => b.quality_score - a.quality_score).slice(0, 3);
  }
}

export const globalExperienceBank = new ExperienceBank();
