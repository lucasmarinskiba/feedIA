import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { jobs } from '../../../src/scheduler/jobs.js';
import {
  BOTS,
  BOT_IDS,
  CLASSIFIED_JOB_NAMES,
  INFRA_JOBS,
  TIER_RANK,
  botsForEvent,
  botsForJob,
  classifyJob,
  getBotDefinition,
  isBotId,
  tierUnlocksBot,
} from '../../../src/capabilities/botControl/registry.js';

describe('registro de bots', () => {
  it('tiene ids únicos y cada bot es válido', () => {
    expect(new Set(BOT_IDS).size).toBe(BOTS.length);
    for (const b of BOTS) {
      expect(b.label.length).toBeGreaterThan(0);
      expect(b.description.length).toBeGreaterThan(0);
      expect(isBotId(b.id)).toBe(true);
    }
    expect(isBotId('no-existe')).toBe(false);
    expect(() => getBotDefinition('no-existe' as never)).toThrow();
  });

  it('todo bot declara un plan mínimo válido, y ningún bot queda desbloqueado en free', () => {
    for (const b of BOTS) {
      expect(TIER_RANK[b.minTier], `${b.id}.minTier`).toBeDefined();
      expect(tierUnlocksBot('free', b), `${b.id} no debería desbloquearse en free`).toBe(false);
    }
  });

  it('agency siempre desbloquea todo (es el techo de la escala)', () => {
    for (const b of BOTS) expect(tierUnlocksBot('agency', b)).toBe(true);
  });
});

describe('vistas de la SPA', () => {
  /** Rutas reales de la SPA: se leen de app.js para que el registro no pueda derivar (ya pasó una vez: se perdieron los guiones). */
  const spaRoutes = (): Set<string> => {
    const src = readFileSync(fileURLToPath(new URL('../../../src/server/static/app.js', import.meta.url)), 'utf-8');
    const block = /const ROUTES = \{([\s\S]*?)\n\};/.exec(src)?.[1] ?? '';
    return new Set([...block.matchAll(/^\s*'?([A-Za-zñáéíóú0-9_-]+)'?\s*:\s*V\(/gm)].map((m) => m[1] as string));
  };

  it('el test lee las rutas de verdad (no es vacuo)', () => {
    expect(spaRoutes().size).toBeGreaterThan(40);
    expect(spaRoutes().has('studio-carousel')).toBe(true);
  });

  it('toda vista que menciona un bot existe como ruta de la SPA (si no, el chip nunca se mostraría)', () => {
    const routes = spaRoutes();
    for (const b of BOTS) {
      const unknown = b.views.filter((v) => !routes.has(v));
      expect(unknown, `${b.id}: vistas inexistentes → ${unknown.join(', ')}`).toEqual([]);
    }
  });

  it('cada bot aparece en al menos una vista', () => {
    for (const b of BOTS) expect(b.views.length, b.id).toBeGreaterThan(0);
  });
});

describe('clasificación de los jobs reales del scheduler', () => {
  const names = jobs.map((j) => j.name as string);

  it('el scheduler tiene jobs (el test no es vacuo)', () => {
    expect(names.length).toBeGreaterThan(100);
  });

  it('TODOS los jobs existentes están clasificados de forma explícita (ninguno cae en el fallback)', () => {
    // Si esto falla, se agregó un job nuevo: decidí a qué bot pertenece (registry.ts) o si es infraestructura.
    const unclassified = names.filter((n) => {
      const c = classifyJob(n);
      return c.kind === 'bots' && c.via === 'fallback';
    });
    expect(unclassified, `sin clasificar: ${unclassified.join(', ')}`).toEqual([]);
  });

  it('todo job que no es infraestructura pertenece al menos a un bot válido', () => {
    for (const n of names) {
      const c = classifyJob(n);
      if (c.kind === 'bots') {
        expect(c.bots.length).toBeGreaterThan(0);
        for (const id of c.bots) expect(isBotId(id), `${n} → ${id}`).toBe(true);
      }
    }
  });

  it('ningún nombre clasificado a mano es un typo o quedó huérfano (un job renombrado dejaría de estar controlado)', () => {
    const missing = CLASSIFIED_JOB_NAMES.filter((n) => !names.includes(n));
    expect(missing, `no existen en el scheduler: ${missing.join(', ')}`).toEqual([]);
    expect([...INFRA_JOBS].filter((n) => !names.includes(n))).toEqual([]);
  });

  it('cada bot gobierna al menos un job (ningún interruptor queda decorativo)', () => {
    for (const b of BOTS) {
      if (b.id === 'comment-bot') continue; // gobierna el webhook y el poll, además de jobs compartidos
      const governs = names.filter((n) => botsForJob(n).includes(b.id));
      expect(governs.length, `${b.id} no gobierna ningún job`).toBeGreaterThan(0);
    }
  });

  it('reparto por bot (informativo: si cambia mucho, revisá la clasificación)', () => {
    const counts: Record<string, number> = { infra: 0 };
    for (const n of names) {
      const c = classifyJob(n);
      if (c.kind === 'infra') counts['infra'] = (counts['infra'] ?? 0) + 1;
      else for (const id of c.bots) counts[id] = (counts[id] ?? 0) + 1;
    }
    // Lo esencial: la infraestructura es una minoría; el grueso del gasto autónomo SÍ es apagable.
    expect(counts['infra']).toBeLessThan(names.length / 3);
  });
});

describe('reglas puntuales', () => {
  it.each([
    'calendar-dispatcher',
    'instagram-publish-queue',
    'cross-platform-publish-queue',
    'cost-guardian-daily-check',
  ])('%s es infraestructura: no se puede apagar (publica lo ya programado / gobierna el gasto)', (name) => {
    expect(classifyJob(name)).toEqual({ kind: 'infra' });
    expect(botsForJob(name)).toEqual([]);
  });

  it('los jobs compartidos pertenecen a varios bots', () => {
    expect(botsForJob('bot-poll')).toEqual(['comment-bot', 'dm-bot']);
    expect(botsForJob('ig-community-daily')).toEqual(['comment-bot', 'dm-bot', 'community-bot']);
  });

  it('un job desconocido/nuevo cae en brain-bot: nunca queda "siempre encendido" sin que alguien lo decida', () => {
    expect(classifyJob('job-que-no-existe-todavia')).toEqual({
      kind: 'bots',
      bots: ['brain-bot'],
      via: 'fallback',
    });
  });

  it('los prefijos asignan el bot correcto y el explícito gana sobre el prefijo', () => {
    expect(botsForJob('tiktok-trend-scout')).toEqual(['tiktok-bot']);
    expect(botsForJob('cu-morning-routine')).toEqual(['computer-use-bot']);
    expect(botsForJob('campaign-audit-weekly')).toEqual(['ads-bot']);
    expect(botsForJob('canva-template-sync')).toEqual(['design-bot']);
    expect(botsForJob('video-render-batch')).toEqual(['video-bot']);
    // tiktok-analytics-sync tiene prefijo tiktok- pero es lectura de métricas: la infraestructura gana.
    expect(botsForJob('tiktok-analytics-sync')).toEqual([]);
  });

  it('los eventos del bus: los entrantes los atienden los bots de mensajes; el resto, cerebro', () => {
    expect(botsForEvent('inbound_message_received')).toEqual(['comment-bot', 'dm-bot']);
    expect(botsForEvent('anomaly_detected')).toEqual(['brain-bot']);
  });
});
