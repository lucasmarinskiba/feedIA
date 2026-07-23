export type SkillType = 'base-skill' | 'agent' | 'decision-framework' | 'content-generator' | 'master-prompt';

export interface SkillFrontmatter {
  name: string;
  description: string;
  type: SkillType;
  [key: string]: unknown;
}

export interface Skill {
  name: string;
  description: string;
  type: SkillType;
  content: string;
  frontmatter: SkillFrontmatter;
  filePath: string;
  loadedAt: Date;
}

export interface SkillSearchResult {
  skills: Skill[];
  total: number;
  query: string;
}
