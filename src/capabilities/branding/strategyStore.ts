import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { BrandStrategy } from './types.js';

const STRATEGY_DIR = 'data/runtime';

function strategyPath(brandId: string): string {
  return join(STRATEGY_DIR, `brand-strategy-${brandId}.json`);
}

export const loadBrandStrategy = (brandId: string): BrandStrategy | null => {
  const path = strategyPath(brandId);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as BrandStrategy;
  } catch {
    return null;
  }
};

export const saveBrandStrategy = (brandId: string, strategy: BrandStrategy): void => {
  if (!existsSync(STRATEGY_DIR)) mkdirSync(STRATEGY_DIR, { recursive: true });
  writeFileSync(strategyPath(brandId), JSON.stringify(strategy, null, 2), 'utf-8');
};

export const ensureBrandStrategy = (brandId: string): BrandStrategy => {
  const existing = loadBrandStrategy(brandId);
  if (existing) return existing;
  const strategy: BrandStrategy = {
    vision: '',
    mission: '',
    values: [],
    promise: '',
    positioning: '',
    story: '',
    personality: [],
    archetype: '',
    architecture: 'master-brand',
    differentiators: [],
    experiencePrinciples: [],
    targetPersonas: [],
    brandVoiceRules: [],
    visualUsageRules: [],
  };
  saveBrandStrategy(brandId, strategy);
  return strategy;
};

export const updateBrandStrategy = (brandId: string, updates: Partial<BrandStrategy>): BrandStrategy => {
  const current = ensureBrandStrategy(brandId);
  const updated = { ...current, ...updates };
  saveBrandStrategy(brandId, updated);
  return updated;
};

export const formatBrandStrategyContext = (strategy: BrandStrategy): string => {
  const personas = strategy.targetPersonas
    .map(
      (p) =>
        `- ${p.name}: ${p.description}\n  Dolores: ${p.pains.join(', ')}\n  Deseos: ${p.desires.join(', ')}\n  Plataformas: ${p.platforms.join(', ')}`,
    )
    .join('\n');

  const voiceRules = strategy.brandVoiceRules
    .map(
      (r) =>
        `- [${r.situation}] Tono: ${r.tone}\n  Ejemplos: ${r.examples.join(' | ')}\n  Prohibido: ${r.forbidden.join(', ') || 'nada'}`,
    )
    .join('\n');

  const visualRules = strategy.visualUsageRules
    .map(
      (r) =>
        `- ${r.element}\n  Permitido en: ${r.allowedContexts.join(', ')}\n  Prohibido en: ${r.forbiddenContexts.join(', ') || 'ninguno'}\n  Notas: ${r.usageNotes}`,
    )
    .join('\n');

  return `
🎯 ESTRATEGIA DE MARCA

Visión: ${strategy.vision || 'No definida'}
Misión: ${strategy.mission || 'No definida'}
Valores: ${strategy.values.join(', ') || 'No definidos'}
Promesa: ${strategy.promise || 'No definida'}
Posicionamiento: ${strategy.positioning || 'No definido'}
Historia: ${strategy.story || 'No definida'}
Personalidad: ${strategy.personality.join(', ') || 'No definida'}
Arquetipo: ${strategy.archetype || 'No definido'}
Arquitectura: ${strategy.architecture}
Diferenciadores: ${strategy.differentiators.join(', ') || 'No definidos'}
Principios de experiencia: ${strategy.experiencePrinciples.join(', ') || 'No definidos'}

👤 PERSONAS OBJETIVO:
${personas || 'No definidas'}

🗣️ REGLAS DE VOZ POR SITUACIÓN:
${voiceRules || 'No definidas'}

🎨 REGLAS DE USO VISUAL:
${visualRules || 'No definidas'}
`;
};
