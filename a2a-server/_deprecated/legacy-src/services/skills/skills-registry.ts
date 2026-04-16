/**
 * Skills Registry — on-demand loading of .md skill files into agent context.
 * Inspired by OpenHarness skills/loader.py pattern.
 *
 * Skills are markdown files with optional YAML frontmatter:
 *   ---
 *   name: debug
 *   description: Systematic debugging approach
 *   ---
 *   # Debug Skill
 *   ...
 */

import * as fs from 'fs';
import * as path from 'path';
import {logger} from '../../utils/logger.js';

export interface SkillDefinition {
    name: string;
    description: string;
    content: string;
    source: 'bundled' | 'user';
    filePath: string;
}

export class SkillsRegistry {
    private skills = new Map<string, SkillDefinition>();
    private loaded = false;

    private readonly skillDirs: string[];

    constructor(extraDirs: string[] = []) {
        const serverRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..', '..', 'skills');
        this.skillDirs = [serverRoot, ...extraDirs];
    }

    /** Load all .md files from configured skill directories. */
    load(): void {
        if (this.loaded) return;
        this.loaded = true;

        for (const dir of this.skillDirs) {
            if (!fs.existsSync(dir)) continue;
            try {
                const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const {name, description} = this.parseFrontmatter(path.basename(file, '.md'), content);
                    const skill: SkillDefinition = {name, description, content, source: 'bundled', filePath};
                    this.skills.set(name, skill);
                    logger.debug('[SkillsRegistry] Loaded skill', {name, filePath});
                }
            } catch (err) {
                logger.warn('[SkillsRegistry] Failed to load from dir', {dir, error: String(err)});
            }
        }
        logger.info('[SkillsRegistry] Skills loaded', {count: this.skills.size});
    }

    /** Get a skill by name. */
    getSkill(name: string): SkillDefinition | undefined {
        if (!this.loaded) this.load();
        return this.skills.get(name);
    }

    /** List all available skills (name + description). */
    listSkills(): Array<{name: string; description: string}> {
        if (!this.loaded) this.load();
        return Array.from(this.skills.values()).map(s => ({name: s.name, description: s.description}));
    }

    /**
     * Detect which skills are relevant to the given task text.
     * Returns the first skill whose keywords match the task.
     */
    detectRelevantSkill(taskText: string): SkillDefinition | undefined {
        if (!this.loaded) this.load();
        const lower = taskText.toLowerCase();

        const keywordMap: Record<string, string[]> = {
            commit:  ['commit', 'git commit', 'changelog', 'version bump'],
            review:  ['review', 'code review', 'pr review', 'pull request'],
            debug:   ['debug', 'fix bug', 'error', 'exception', 'crash', 'breaking'],
            plan:    ['plan', 'design', 'architecture', 'implement', 'create feature'],
        };

        for (const [skillName, keywords] of Object.entries(keywordMap)) {
            if (keywords.some(kw => lower.includes(kw))) {
                const skill = this.skills.get(skillName);
                if (skill) return skill;
            }
        }
        return undefined;
    }

    /** Parse YAML-style frontmatter from a markdown file. */
    private parseFrontmatter(defaultName: string, content: string): {name: string; description: string} {
        let name = defaultName;
        let description = '';

        const lines = content.split('\n');
        if (lines[0]?.trim() === '---') {
            const closeIdx = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
            if (closeIdx > 0) {
                for (const line of lines.slice(1, closeIdx)) {
                    const stripped = line.trim();
                    if (stripped.startsWith('name:')) {
                        const val = stripped.slice(5).trim().replace(/^['"]|['"]$/g, '');
                        if (val) name = val;
                    } else if (stripped.startsWith('description:')) {
                        const val = stripped.slice(12).trim().replace(/^['"]|['"]$/g, '');
                        if (val) description = val;
                    }
                }
            }
        }

        // Fallback: extract from first heading or paragraph
        if (!description) {
            for (const line of lines) {
                const s = line.trim();
                if (s.startsWith('# ') && (!name || name === defaultName)) {
                    name = s.slice(2).trim() || defaultName;
                    continue;
                }
                if (s && !s.startsWith('#') && !s.startsWith('---')) {
                    description = s.slice(0, 200);
                    break;
                }
            }
        }

        return {name, description: description || `Skill: ${name}`};
    }
}

/** Singleton skills registry instance. */
export const globalSkillsRegistry = new SkillsRegistry();
