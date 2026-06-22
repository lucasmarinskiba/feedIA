// @ts-nocheck
/**
 * Profile Optimizer — Optimización total del perfil de Instagram
 * Bio, grid, historias destacadas, foto de perfil — todo cohesionado
 * Crea perfiles que detienen el scroll y generan follow instantáneo
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as graph from '../memory/knowledgeGraph.js';

const PROFILE_PATH = resolve('data/runtime/brain/profile-optimizer.json');

export interface ProfileAudit {
  handle: string;
  auditedAt: string;
  bio: {
    text: string;
    score: number;
    issues: string[];
    suggestions: string[];
    ctaPresent: boolean;
    emojiCount: number;
    keywords: string[];
  };
  grid: {
    cohesionScore: number;
    colorPalette: string[];
    contentMix: Record<string, number>;
    postingConsistency: number;
    suggestions: string[];
  };
  highlights: {
    count: number;
    names: string[];
    coverage: string[]; // what topics they cover
    missing: string[];
  };
  profilePic: {
    description: string;
    score: number;
    suggestions: string[];
  };
  overall: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    topPriority: string;
  };
}

interface ProfileStore {
  audits: ProfileAudit[];
  bestPractices: string[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): ProfileStore => {
  try {
    ensureDir();
    if (!existsSync(PROFILE_PATH)) return { audits: [], bestPractices: [] };
    return JSON.parse(readFileSync(PROFILE_PATH, 'utf-8')) as ProfileStore;
  } catch {
    return { audits: [], bestPractices: [] };
  }
};

const saveStore = (store: ProfileStore): void => {
  ensureDir();
  writeFileSync(PROFILE_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Bio analyzer & optimizer ───────────────────────────────────────────────

export const analyzeBio = (bio: string, niche: string): ProfileAudit['bio'] => {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Length check
  if (bio.length > 150) issues.push('Bio muy larga, se corta en móviles');
  if (bio.length < 30) issues.push('Bio muy corta, pierde oportunidad');

  // CTA check
  const hasCTA = /(link|bio|dm|contacto|escribeme|agenda|shop|compra|mas info)/gi.test(bio);
  if (!hasCTA) suggestions.push('Agregar CTA claro: "Link en bio", "DM para info", etc.');

  // Emoji check
  const emojis =
    bio.match(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
    ) ?? [];
  if (emojis.length > 4) issues.push('Demasiados emojis, parece spam');
  if (emojis.length === 0) suggestions.push('Agregar 1-2 emojis estratégicos para destacar');

  // Keywords
  const nicheKeywords: Record<string, string[]> = {
    fitness: ['fitness', 'gym', 'salud', 'entrenamiento', 'coach'],
    beauty: ['beauty', 'skincare', 'makeup', 'glow', 'bella'],
    business: ['emprendedor', 'negocio', 'marketing', 'ventas', 'coach'],
    food: ['foodie', 'recetas', 'chef', 'gastronomía', 'cocina'],
    tech: ['tech', 'digital', 'IA', 'automatización', 'developer'],
  };
  const keywords = nicheKeywords[niche] ?? ['expert', 'creator', 'community'];
  const foundKeywords = keywords.filter((k) => bio.toLowerCase().includes(k.toLowerCase()));
  if (foundKeywords.length === 0)
    suggestions.push(`Incluir palabras clave del nicho: ${keywords.slice(0, 3).join(', ')}`);

  // Social proof indicators
  if (!bio.match(/\b(ayudado|transformado|+\d|clientes|resultados)\b/gi)) {
    suggestions.push('Agregar indicador de resultado: "+500 clientes", "Ayudo a..."');
  }

  // Score
  let score = 0.5;
  if (hasCTA) score += 0.2;
  if (emojis.length >= 1 && emojis.length <= 3) score += 0.1;
  if (foundKeywords.length > 0) score += 0.1;
  if (bio.length >= 50 && bio.length <= 130) score += 0.1;
  score = Math.min(1, score);

  return {
    text: bio,
    score,
    issues,
    suggestions,
    ctaPresent: hasCTA,
    emojiCount: emojis.length,
    keywords: foundKeywords,
  };
};

// ── Grid analyzer ──────────────────────────────────────────────────────────

export const analyzeGrid = (
  recentPosts: { type: string; dominantColor: string; engagement: number }[],
  niche: string,
): ProfileAudit['grid'] => {
  const suggestions: string[] = [];

  // Content mix
  const mix: Record<string, number> = {};
  for (const p of recentPosts) mix[p.type] = (mix[p.type] ?? 0) + 1;
  const total = recentPosts.length || 1;
  for (const k of Object.keys(mix)) mix[k] = mix[k] / total;

  if ((mix['reel'] ?? 0) < 0.3) suggestions.push('Aumentar reels al 40-50% del mix');
  if ((mix['carousel'] ?? 0) < 0.2) suggestions.push('Incluir más carruseles educativos');

  // Color palette
  const colors = recentPosts.map((p) => p.dominantColor);
  const uniqueColors = [...new Set(colors)];
  const cohesionScore = uniqueColors.length <= 3 ? 0.9 : uniqueColors.length <= 5 ? 0.7 : 0.4;

  if (uniqueColors.length > 5) suggestions.push('Unificar paleta de colores a 3-4 tonos máximo');

  // Posting consistency
  const consistency = recentPosts.length >= 9 ? 0.8 : recentPosts.length >= 5 ? 0.5 : 0.2;
  if (consistency < 0.5) suggestions.push('Publicar mínimo 3 veces por semana para consistencia');

  return {
    cohesionScore,
    colorPalette: uniqueColors.slice(0, 5),
    contentMix: mix,
    postingConsistency: consistency,
    suggestions,
  };
};

// ── Highlights analyzer ────────────────────────────────────────────────────

export const analyzeHighlights = (highlightNames: string[], niche: string): ProfileAudit['highlights'] => {
  const expectedByNiche: Record<string, string[]> = {
    fitness: ['rutinas', 'nutrición', 'resultados', 'tips', 'sobre mí'],
    beauty: ['tutoriales', 'productos', 'antes/después', 'rutina', 'favoritos'],
    business: ['servicios', 'testimonios', 'proceso', 'precios', 'FAQ'],
    food: ['recetas', 'behind', 'restaurantes', 'tips', 'sobre mí'],
    tech: ['tutoriales', 'herramientas', 'proyectos', 'setup', 'tips'],
  };

  const expected = expectedByNiche[niche] ?? ['sobre mí', 'servicios', 'testimonios', 'FAQ', 'contacto'];
  const normalizedNames = highlightNames.map((n) => n.toLowerCase());

  const coverage = expected.filter((e) => normalizedNames.some((n) => n.includes(e)));
  const missing = expected.filter((e) => !normalizedNames.some((n) => n.includes(e)));

  return {
    count: highlightNames.length,
    names: highlightNames,
    coverage,
    missing,
  };
};

// ── Full profile audit ─────────────────────────────────────────────────────

export const auditProfile = async (
  handle: string,
  bio: string,
  highlightNames: string[],
  recentPosts: { type: string; dominantColor: string; engagement: number }[],
  niche: string,
): Promise<ProfileAudit> => {
  const bioAnalysis = analyzeBio(bio, niche);
  const gridAnalysis = analyzeGrid(recentPosts, niche);
  const highlightsAnalysis = analyzeHighlights(highlightNames, niche);

  const overallScore = (bioAnalysis.score + gridAnalysis.cohesionScore + highlightsAnalysis.coverage.length / 5) / 3;

  const grade =
    overallScore >= 0.85
      ? 'A'
      : overallScore >= 0.7
        ? 'B'
        : overallScore >= 0.5
          ? 'C'
          : overallScore >= 0.3
            ? 'D'
            : 'F';

  const priorities = [
    ...bioAnalysis.issues,
    ...gridAnalysis.suggestions,
    ...highlightsAnalysis.missing.map((m) => `Falta highlight: ${m}`),
  ];

  const audit: ProfileAudit = {
    handle,
    auditedAt: new Date().toISOString(),
    bio: bioAnalysis,
    grid: gridAnalysis,
    highlights: highlightsAnalysis,
    profilePic: {
      description: 'Requiere análisis visual manual',
      score: 0.5,
      suggestions: ['Foto clara, bien iluminada, con contraste', 'Rostro o logo visible a 100px', 'Fondo no saturado'],
    },
    overall: {
      score: overallScore,
      grade,
      topPriority: priorities[0] ?? 'Todo correcto',
    },
  };

  const store = loadStore();
  store.audits.push(audit);
  if (store.audits.length > 50) store.audits = store.audits.slice(-50);
  saveStore(store);

  await semantic.storeMemory(
    `Audit de perfil @${handle}: nota ${grade} (${(overallScore * 100).toFixed(0)}%)`,
    'learning',
    { handle, grade, niche },
    overallScore,
  );

  graph.addTriple(handle, 'tiene perfil con nota', grade, overallScore, 'profile-optimizer');

  log.info(`[ProfileOptimizer] @${handle}: ${grade} (${(overallScore * 100).toFixed(0)}%)`);
  return audit;
};

// ── Generate optimized bio ─────────────────────────────────────────────────

export const generateOptimizedBio = (niche: string, keywords: string[], cta: string, socialProof?: string): string => {
  const templates: Record<string, string[]> = {
    fitness: [
      `🏋️ ${socialProof ?? 'Coach certificado'} | ${keywords.slice(0, 2).join(' + ')}\n🔥 Transformando cuerpos desde ${new Date().getFullYear()}\n👇 ${cta}`,
      `💪 ${keywords[0] ?? 'Fitness'} para gente real\n📍 ${socialProof ?? 'Resultados garantizados'}\n✨ ${cta}`,
    ],
    beauty: [
      `✨ ${socialProof ?? 'Beauty expert'} | ${keywords.slice(0, 2).join(' + ')}\n💄 Tu glow up empieza aquí\n👇 ${cta}`,
      `🌸 ${keywords[0] ?? 'Skincare'} tips que funcionan\n📍 ${socialProof ?? '+1000 transformaciones'}\n✨ ${cta}`,
    ],
    business: [
      `🚀 ${socialProof ?? 'Emprendedor'} | ${keywords.slice(0, 2).join(' + ')}\n💰 Escalá tu negocio hoy\n👇 ${cta}`,
      `📈 ${keywords[0] ?? 'Marketing'} sin vueltas\n🔥 ${socialProof ?? 'Ayudé a +500 marcas'}\n✨ ${cta}`,
    ],
    tech: [
      `⚡ ${socialProof ?? 'Tech creator'} | ${keywords.slice(0, 2).join(' + ')}\n🛠️ Herramientas que cambian vidas\n👇 ${cta}`,
      `💻 ${keywords[0] ?? 'Automatización'} para creators\n📍 ${socialProof ?? 'Top voice en tech'}\n✨ ${cta}`,
    ],
  };

  const list = templates[niche] ?? [
    `🎯 ${socialProof ?? 'Creator'} | ${keywords.slice(0, 2).join(' + ')}\n✨ Contenido que transforma\n👇 ${cta}`,
  ];

  return list?.[0] ?? '';
};

export const getLastAudit = (handle: string): ProfileAudit | undefined => {
  return loadStore()
    .audits.filter((a) => a.handle.toLowerCase() === handle.toLowerCase())
    .pop();
};
