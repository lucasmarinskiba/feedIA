import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, resolve } from 'path';
import type { Skill, SkillFrontmatter, SkillType } from '../types/skill';

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

const parseFrontmatter = (content: string): { frontmatter: SkillFrontmatter; body: string } => {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match || !match[1] || !match[2]) {
    throw new Error('Invalid frontmatter format');
  }

  const frontmatterStr = match[1];
  const body = match[2];

  const frontmatter: SkillFrontmatter = {
    name: '',
    description: '',
    type: 'base-skill',
  };

  const lines = frontmatterStr.split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.substring(0, colonIdx).trim();
    const value = line.substring(colonIdx + 1).trim();

    if (key === 'name') frontmatter.name = value;
    else if (key === 'description') frontmatter.description = value;
    else if (key === 'type') frontmatter.type = value as SkillType;
    else {
      frontmatter[key] = value;
    }
  }

  if (!frontmatter.name || !frontmatter.description) {
    throw new Error('Missing required frontmatter fields: name, description');
  }

  return { frontmatter, body };
};

export const loadSkill = (filePath: string): Skill => {
  const content = readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    type: frontmatter.type,
    content: body,
    frontmatter,
    filePath,
    loadedAt: new Date(),
  };
};

export const loadAllSkills = (baseDir: string): Skill[] => {
  const skills: Skill[] = [];
  const skillsDir = resolve(baseDir, '.agents', 'skills');

  if (!existsSync(skillsDir)) {
    console.warn(`Skills directory not found: ${skillsDir}`);
    return skills;
  }

  const skillDirs = readdirSync(skillsDir);

  for (const skillDirName of skillDirs) {
    const skillPath = join(skillsDir, skillDirName);
    const stat = statSync(skillPath);

    if (!stat.isDirectory()) continue;

    const skillFilePath = join(skillPath, 'SKILL.md');
    if (!existsSync(skillFilePath)) {
      console.warn(`SKILL.md not found in ${skillPath}`);
      continue;
    }

    try {
      const skill = loadSkill(skillFilePath);
      skills.push(skill);
    } catch (err) {
      console.error(`Failed to load skill from ${skillFilePath}:`, err);
    }
  }

  return skills;
};

export const loadPromptsFromDir = (promptsDir: string): Skill[] => {
  const prompts: Skill[] = [];

  if (!existsSync(promptsDir)) {
    console.warn(`Prompts directory not found: ${promptsDir}`);
    return prompts;
  }

  const walk = (dir: string, relativePath = ''): void => {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      const relPath = relativePath ? `${relativePath}/${entry}` : entry;

      if (stat.isDirectory()) {
        walk(fullPath, relPath);
      } else if (entry.endsWith('.md')) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const { frontmatter, body } = parseFrontmatter(content);

          prompts.push({
            name: frontmatter.name,
            description: frontmatter.description,
            type: frontmatter.type,
            content: body,
            frontmatter,
            filePath: fullPath,
            loadedAt: new Date(),
          });
        } catch (err) {
          console.error(`Failed to load prompt from ${fullPath}:`, err);
        }
      }
    }
  };

  walk(promptsDir);
  return prompts;
};
