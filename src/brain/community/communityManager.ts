// @ts-nocheck
/**
 * Community Manager Brain — CM humano superior con memoria y personalidad
 * Conoce a cada miembro de la comunidad, recuerda interacciones, crea lazos reales
 * Mejor que un CM de grandes empresas porque tiene memoria infinita y aprende 24/7
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import * as graph from '../memory/knowledgeGraph.js';
import * as personality from '../reasoning/personalityEngine.js';
import * as lang from '../memory/languageMemory.js';

const CM_PATH = resolve('data/runtime/brain/community-manager.json');

export interface CommunityMember {
  handle: string;
  firstContact: string;
  lastContact: string;
  totalInteractions: number;
  sentiment: 'fan' | 'warm' | 'neutral' | 'cold' | 'troll' | 'lead' | 'partner';
  tags: string[];
  notes: string[];
  favoriteTopics: string[];
  lastMessage: string;
  responseRate: number; // % de veces que responde
  engagementScore: number; // 0-1
  vip: boolean;
  birthday?: string;
  location?: string;
  language: string;
}

interface CMStore {
  members: CommunityMember[];
  communityHealth: number; // 0-1
  lastAudit: string;
  topFans: string[];
  churnRisk: string[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): CMStore => {
  try {
    ensureDir();
    if (!existsSync(CM_PATH))
      return { members: [], communityHealth: 0.5, lastAudit: new Date().toISOString(), topFans: [], churnRisk: [] };
    return JSON.parse(readFileSync(CM_PATH, 'utf-8')) as CMStore;
  } catch {
    return { members: [], communityHealth: 0.5, lastAudit: new Date().toISOString(), topFans: [], churnRisk: [] };
  }
};

const saveStore = (store: CMStore): void => {
  ensureDir();
  writeFileSync(CM_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Core: Track every interaction ──────────────────────────────────────────

export const trackInteraction = async (
  handle: string,
  message: string,
  direction: 'inbound' | 'outbound',
  platform: string,
): Promise<CommunityMember> => {
  const store = loadStore();
  let member = store.members.find((m) => m.handle.toLowerCase() === handle.toLowerCase());

  const now = new Date().toISOString();

  if (!member) {
    member = {
      handle,
      firstContact: now,
      lastContact: now,
      totalInteractions: 1,
      sentiment: 'neutral',
      tags: [],
      notes: [],
      favoriteTopics: [],
      lastMessage: message,
      responseRate: direction === 'outbound' ? 0 : 1,
      engagementScore: 0.3,
      vip: false,
      language: 'es',
    };
    store.members.push(member);
  } else {
    member.totalInteractions += 1;
    member.lastContact = now;
    member.lastMessage = message;
    if (direction === 'inbound') {
      member.responseRate = Math.min(1, member.responseRate + 0.05);
      member.engagementScore = Math.min(1, member.engagementScore + 0.03);
    }
  }

  // Analyze sentiment from message
  const lower = message.toLowerCase();
  if (lower.match(/\b(amo|me encanta|genial|perfecto|gracias|💖|🔥|💪)\b/)) {
    member.sentiment = member.engagementScore > 0.7 ? 'fan' : 'warm';
  } else if (lower.match(/\b(odio|malo|peor|horrible|estafa|timo|💩|😤)\b/)) {
    member.sentiment = 'cold';
  } else if (lower.match(/\b(precio|compr|interesad|info|dm|link)\b/)) {
    member.sentiment = 'lead';
  }

  // Extract topics
  const topics = extractTopics(message);
  for (const t of topics) {
    if (!member.favoriteTopics.includes(t)) member.favoriteTopics.push(t);
  }
  member.favoriteTopics = member.favoriteTopics.slice(-10);

  // Auto-tag
  if (member.totalInteractions > 10 && member.engagementScore > 0.6) member.vip = true;
  if (member.totalInteractions > 5 && !member.tags.includes('regular')) member.tags.push('regular');
  if (member.sentiment === 'lead' && !member.tags.includes('lead')) member.tags.push('lead');
  if (member.sentiment === 'fan' && !member.tags.includes('superfan')) member.tags.push('superfan');

  // Store in brain memory
  await semantic.storeMemory(
    `${direction === 'inbound' ? 'Recibido' : 'Enviado'} a @${handle}: ${message.slice(0, 200)}`,
    'conversation',
    { handle, direction, platform, sentiment: member.sentiment },
    member.engagementScore,
  );

  episodic.recordEpisode('community-interaction', message, {
    who: handle,
    tags: ['community', member.sentiment, platform],
    emotion:
      member.sentiment === 'fan' || member.sentiment === 'warm'
        ? 'positive'
        : member.sentiment === 'cold'
          ? 'negative'
          : 'neutral',
  });

  // Learn personality
  personality.learnPersonality(handle, [{ role: direction === 'inbound' ? 'user' : 'bot', text: message }]);

  // Update graph
  graph.addTriple(handle, 'interactuó con', platform, member.engagementScore, 'community-manager');
  for (const t of topics) {
    graph.addTriple(handle, 'le interesa', t, 0.6, 'community-manager');
  }

  saveStore(store);
  log.info(
    `[CommunityManager] @${handle}: ${member.sentiment} | interactions=${member.totalInteractions} | engagement=${member.engagementScore.toFixed(2)}`,
  );
  return member;
};

// ── Intelligent greeting for returning users ───────────────────────────────

export const getGreeting = (handle: string): string => {
  const store = loadStore();
  const member = store.members.find((m) => m.handle.toLowerCase() === handle.toLowerCase());
  if (!member) return '¡Hola! Bienvenido/a por primera vez 👋';

  const daysSince = (Date.now() - new Date(member.lastContact).getTime()) / (24 * 3600_000);
  const personaCtx = personality.getPersonalityContext(handle);

  const greetings: string[] = [];

  if (daysSince < 1) {
    greetings.push(`¡De vuelta! Me alegra verte otra vez hoy, @${handle} 😊`);
  } else if (daysSince < 7) {
    greetings.push(`¡@${handle}! Hace poco no charlábamos, ¿cómo vas?`);
  } else if (daysSince < 30) {
    greetings.push(`¡@${handle}! Te extrañé por aquí. ¿Qué tal todo?`);
  } else {
    greetings.push(`¡@${handle}! Qué bueno que volviste después de tanto tiempo. ¿Qué necesitás?`);
  }

  if (member.sentiment === 'fan') {
    greetings.push(`¡Mi fan favorito/a @${handle} está de vuelta! 🌟`);
  } else if (member.sentiment === 'lead') {
    greetings.push(`¡@${handle}! ¿Te decidiste por algo de lo que hablamos?`);
  }

  if (member.favoriteTopics.length > 0) {
    greetings.push(
      `@${handle}, sé que te interesa ${member.favoriteTopics[member.favoriteTopics.length - 1]}. ¿Novedades?`,
    );
  }

  // Pick based on personality
  const idx = Math.abs(handle.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % greetings.length;
  return greetings[idx];
};

// ── Community health audit ─────────────────────────────────────────────────

export const auditCommunity = (): CMStore => {
  const store = loadStore();
  const total = store.members.length;
  if (total === 0) return store;

  const fans = store.members.filter((m) => m.sentiment === 'fan').length;
  const warm = store.members.filter((m) => m.sentiment === 'warm').length;
  const leads = store.members.filter((m) => m.sentiment === 'lead').length;
  const cold = store.members.filter((m) => m.sentiment === 'cold').length;
  const trolls = store.members.filter((m) => m.sentiment === 'troll').length;

  store.communityHealth = (fans * 1 + warm * 0.7 + leads * 0.5 + cold * 0.2 + trolls * -0.5) / total;
  store.communityHealth = Math.max(0, Math.min(1, store.communityHealth));

  store.topFans = store.members
    .filter((m) => m.engagementScore > 0.7)
    .sort((a, b) => b.engagementScore - a.engagementScore)
    .slice(0, 10)
    .map((m) => m.handle);

  store.churnRisk = store.members
    .filter((m) => {
      const days = (Date.now() - new Date(m.lastContact).getTime()) / (24 * 3600_000);
      return days > 30 && m.engagementScore > 0.3;
    })
    .map((m) => m.handle);

  store.lastAudit = new Date().toISOString();
  saveStore(store);

  log.info(
    `[CommunityManager] Audit: ${total} members, health=${store.communityHealth.toFixed(2)}, topFans=${store.topFans.length}, churnRisk=${store.churnRisk.length}`,
  );
  return store;
};

// ── Get community context for a user ───────────────────────────────────────

export const getMemberContext = (handle: string): string => {
  const store = loadStore();
  const member = store.members.find((m) => m.handle.toLowerCase() === handle.toLowerCase());
  if (!member) return '';

  const lines = [
    `PERFIL DE COMUNIDAD: @${handle}`,
    `  - Sentimiento: ${member.sentiment}`,
    `  - Interacciones: ${member.totalInteractions}`,
    `  - Engagement: ${(member.engagementScore * 100).toFixed(0)}%`,
    `  - Temas favoritos: ${member.favoriteTopics.join(', ') || 'ninguno'}`,
    `  - VIP: ${member.vip ? 'SÍ' : 'no'}`,
    `  - Tags: ${member.tags.join(', ')}`,
  ];

  if (member.notes.length > 0) lines.push(`  - Notas: ${member.notes.join('; ')}`);

  return lines.join('\n');
};

// ── Suggest who to engage today ────────────────────────────────────────────

export const getEngagementPriority = (limit = 10): CommunityMember[] => {
  const store = loadStore();
  const now = Date.now();

  return store.members
    .map((m) => ({
      ...m,
      priority:
        m.engagementScore * 0.3 +
        (m.sentiment === 'lead' ? 0.3 : m.sentiment === 'fan' ? 0.25 : 0.1) +
        (m.vip ? 0.2 : 0) +
        (1 - Math.min(1, (now - new Date(m.lastContact).getTime()) / (30 * 24 * 3600_000))) * 0.2,
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
};

// ── Helpers ────────────────────────────────────────────────────────────────

const extractTopics = (text: string): string[] => {
  const nicheKeywords: Record<string, string[]> = {
    fitness: ['gym', 'rutina', 'dieta', 'proteína', 'cardio', 'pesas', 'calorías'],
    beauty: ['skincare', 'maquillaje', 'cabello', 'uñas', 'rutina', 'producto'],
    tech: ['app', 'software', 'IA', 'automatización', 'marketing digital', 'herramienta'],
    business: ['ventas', 'cliente', 'precio', 'servicio', 'consulta', 'agenda'],
    food: ['receta', 'restaurante', 'comida', 'postre', 'chef', 'cocina'],
  };

  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const [niche, keywords] of Object.entries(nicheKeywords)) {
    for (const kw of keywords) {
      if (lower.includes(kw) && !found.includes(niche)) found.push(niche);
    }
  }
  return found;
};

export const getStats = (): {
  totalMembers: number;
  fans: number;
  leads: number;
  health: number;
  topFans: string[];
} => {
  const store = loadStore();
  return {
    totalMembers: store.members.length,
    fans: store.members.filter((m) => m.sentiment === 'fan').length,
    leads: store.members.filter((m) => m.sentiment === 'lead').length,
    health: store.communityHealth,
    topFans: store.topFans,
  };
};
