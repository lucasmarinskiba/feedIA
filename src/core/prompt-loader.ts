import { resolve } from 'path';
import { loadPromptsFromDir } from './skill-loader';
import type { Skill } from '../types/skill';

export interface PromptIndex {
  masterPrompts: Skill[];
  decisionFrameworks: Skill[];
  contentGenerators: Skill[];
  allPrompts: Skill[];
}

export const loadPromptIndex = (baseDir: string): PromptIndex => {
  const masterPromptsDir = resolve(baseDir, '.prompts', 'master');
  const frameworksDir = resolve(baseDir, '.prompts', 'decision-frameworks');
  const generatorsDir = resolve(baseDir, '.prompts', 'content-generators');

  const masterPrompts = loadPromptsFromDir(masterPromptsDir);
  const decisionFrameworks = loadPromptsFromDir(frameworksDir);
  const contentGenerators = loadPromptsFromDir(generatorsDir);

  return {
    masterPrompts,
    decisionFrameworks,
    contentGenerators,
    allPrompts: [...masterPrompts, ...decisionFrameworks, ...contentGenerators],
  };
};

export const getPromptByName = (index: PromptIndex, name: string): Skill | null => index.allPrompts.find((p) => p.name === name) || null;

export const searchPrompts = (index: PromptIndex, query: string): Skill[] => {
  const lower = query.toLowerCase();
  return index.allPrompts.filter(
    (p) => p.name.toLowerCase().includes(lower) || p.description.toLowerCase().includes(lower),
  );
};
