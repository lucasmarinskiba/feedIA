import { loadAllSkills } from '../core/skill-loader';
import { loadPromptIndex, getPromptByName, searchPrompts } from '../core/prompt-loader';
import type { Skill, SkillType, SkillSearchResult } from '../types/skill';
import type { PromptIndex } from '../core/prompt-loader';

export class SkillRegistry {
  private static instance: SkillRegistry;

  private skills: Map<string, Skill> = new Map();
  private skillsByType: Map<SkillType, Skill[]> = new Map();
  private prompts: PromptIndex | null = null;
  private initialized = false;
  private baseDir: string;

  private constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  public static getInstance(baseDir: string = process.cwd()): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry(baseDir);
    }
    return SkillRegistry.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[SkillRegistry] Initializing...');

    const allSkills = loadAllSkills(this.baseDir);
    for (const skill of allSkills) {
      this.skills.set(skill.name, skill);

      if (!this.skillsByType.has(skill.type)) {
        this.skillsByType.set(skill.type, []);
      }
      this.skillsByType.get(skill.type)!.push(skill);
    }

    this.prompts = loadPromptIndex(this.baseDir);

    this.initialized = true;
    console.log(`[SkillRegistry] Loaded ${allSkills.length} skills and ${this.prompts.allPrompts.length} prompts`);
  }

  public getSkill(name: string): Skill | null {
    const skill = this.skills.get(name);
    if (skill) return skill;

    if (!this.prompts) return null;
    return getPromptByName(this.prompts, name);
  }

  public listSkills(type?: SkillType): Skill[] {
    if (!type) {
      return Array.from(this.skills.values());
    }

    return this.skillsByType.get(type) || [];
  }

  public listPrompts(category?: 'master' | 'frameworks' | 'generators'): Skill[] {
    if (!this.prompts) return [];

    switch (category) {
      case 'master':
        return this.prompts.masterPrompts;
      case 'frameworks':
        return this.prompts.decisionFrameworks;
      case 'generators':
        return this.prompts.contentGenerators;
      default:
        return this.prompts.allPrompts;
    }
  }

  public search(query: string): SkillSearchResult {
    const lower = query.toLowerCase();

    const skillResults = Array.from(this.skills.values()).filter(
      (s) => s.name.toLowerCase().includes(lower) || s.description.toLowerCase().includes(lower),
    );

    let promptResults: Skill[] = [];
    if (this.prompts) {
      promptResults = searchPrompts(this.prompts, query);
    }

    const combined = [...skillResults, ...promptResults];
    const unique = Array.from(new Map(combined.map((s) => [s.name, s])).values());

    return {
      skills: unique,
      total: unique.length,
      query,
    };
  }

  public getAllSkills(): Skill[] {
    const all = Array.from(this.skills.values());
    if (this.prompts) {
      all.push(...this.prompts.allPrompts);
    }
    return all;
  }

  public getStats(): {
    totalSkills: number;
    totalPrompts: number;
    skillsByType: Record<string, number>;
  } {
    const skillsByType: Record<string, number> = {};
    for (const [type, skills] of this.skillsByType) {
      skillsByType[type] = skills.length;
    }

    return {
      totalSkills: this.skills.size,
      totalPrompts: this.prompts?.allPrompts.length || 0,
      skillsByType,
    };
  }

  public isInitialized(): boolean {
    return this.initialized;
  }
}

export const getSkillRegistry = (baseDir?: string): SkillRegistry => SkillRegistry.getInstance(baseDir);
