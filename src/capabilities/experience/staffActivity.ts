/**
 * Actividad real del equipo: staff con su último reporte, feed de interacciones
 * entre FeedIA / agentes / automatizaciones / redes, y los conteos que alimentan
 * los logros y el Command Center. Todo sale de stores persistidos — nada se
 * inventa: si un rol no tiene actividad registrada, figura como "sin actividad aún".
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROFESSIONS_REPLACED, type ProfessionRole } from '../knowledge/professionalKnowledge.js';
import { listCarouselJobs } from '../content/index.js';
import { getVideoUsage } from '../videoEngine/usageTracker.js';
import { listTraces, type DecisionType } from '../reasoningTrace/index.js';
import { getHistory } from '../../agent/bus.js';
import { listMissions } from '../../agent/swarm/index.js';

export interface StaffMember {
  rol: string;
  estado: 'operando' | 'sin actividad aún';
  acciones: number;
  ultimoReporte: { texto: string; cuando: string } | null;
}

export interface InteraccionReal {
  cuando: string;
  de: string;
  a: string;
  tipo: 'agente' | 'automatizacion' | 'red-social' | 'pieza' | 'mision';
  texto: string;
}

export interface ConteosActividad {
  acciones24h: number;
  acciones7d: number;
  agentesActivos7d: number;
  misionesFallidas7d: number;
  carruselesEnRevision: number;
}

export interface ActividadReal {
  staff: StaffMember[];
  interacciones: InteraccionReal[];
  conteos: ConteosActividad;
  rolesActivos: number;
  piezas: number;
  comentariosRevisados: number;
  respuestasPreparadas: number;
}

interface ComentarioDecision {
  handle: string;
  kind: string;
  outcome: string;
  decidedAt: string;
}

interface OutboxLine {
  t: 'enqueue' | 'expire' | 'cancel';
  at: number;
  entry?: { handle: string; origin: 'auto' | 'human'; text: string };
}

const TRACE_TYPES_POR_ROL: Partial<Record<ProfessionRole, DecisionType[]>> = {
  brand_strategist: ['strategy-adjustment', 'goal-decomposition'],
  social_scientist: ['audience-segment'],
  art_director: ['visual-pattern', 'template-pick'],
  copywriter: ['hook-pattern', 'outreach-template'],
  creative_director: ['pulse-type', 'experiment-design'],
};

const ESTADO_MISION: Record<'completed' | 'partial' | 'failed', string> = {
  completed: 'completada',
  partial: 'parcial',
  failed: 'fallida',
};

const HORA_MS = 3_600_000;

const readJsonl = <T>(file: string): T[] => {
  const path = resolve(file);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf-8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as T];
      } catch {
        return [];
      }
    });
};

const recortar = (s: string, n = 160): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const iso = (ms: number): string => new Date(ms).toISOString();

export const buildActividadReal = (brandName: string): ActividadReal => {
  const carruseles = listCarouselJobs(brandName)
    .filter((c) => c.status !== 'failed')
    .sort((a, b) => Date.parse(b.finishedAt ?? b.startedAt) - Date.parse(a.finishedAt ?? a.startedAt));
  const videos = getVideoUsage({ brandName })
    .filter((v) => v.success)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const misiones = listMissions(brandName);
  const misionesFallidas = new Set(misiones.filter((m) => m.status === 'failed').map((m) => m.correlationId));
  const traces = listTraces({ brandId: brandName, limit: 400 }).filter(
    (t) => !(t.correlationId && misionesFallidas.has(t.correlationId)),
  );
  const comentarios = readJsonl<ComentarioDecision>('data/runtime/comment-review-decisions.jsonl').sort(
    (a, b) => Date.parse(b.decidedAt) - Date.parse(a.decidedAt),
  );
  const outbox = readJsonl<OutboxLine>('data/runtime/reply-outbox.jsonl');
  const encolados = outbox.filter((o) => o.t === 'enqueue' && o.entry);
  const eventos = getHistory(200);

  const staff: StaffMember[] = PROFESSIONS_REPLACED.map((p) => {
    const role = p.role;
    if (role === 'designer') {
      const u = carruseles[0];
      return {
        rol: p.replaces,
        estado: carruseles.length > 0 ? 'operando' : 'sin actividad aún',
        acciones: carruseles.length,
        ultimoReporte: u ? { texto: `Carrusel «${u.topic}» — ${u.status}`, cuando: u.finishedAt ?? u.startedAt } : null,
      };
    }
    if (role === 'video_producer') {
      const u = videos[0];
      return {
        rol: p.replaces,
        estado: videos.length > 0 ? 'operando' : 'sin actividad aún',
        acciones: videos.length,
        ultimoReporte: u ? { texto: `Video «${u.topic}» (${u.format}, ${u.provider})`, cuando: u.createdAt } : null,
      };
    }
    if (role === 'cm') {
      const u = comentarios[0];
      return {
        rol: p.replaces,
        estado: comentarios.length > 0 ? 'operando' : 'sin actividad aún',
        acciones: comentarios.length,
        ultimoReporte: u
          ? { texto: `Comentario de @${u.handle} (${u.kind}) → ${u.outcome}`, cuando: u.decidedAt }
          : null,
      };
    }
    const tipos = TRACE_TYPES_POR_ROL[role] ?? [];
    const propias = traces.filter((t) => tipos.includes(t.decisionType));
    const u = propias[0];
    return {
      rol: p.replaces,
      estado: propias.length > 0 ? 'operando' : 'sin actividad aún',
      acciones: propias.length,
      ultimoReporte: u ? { texto: recortar(u.reasoning, 220), cuando: u.createdAt } : null,
    };
  });

  const items: InteraccionReal[] = [];

  for (const t of traces) {
    items.push({
      cuando: t.createdAt,
      de: t.agentId,
      a: 'equipo FeedIA',
      tipo: 'agente',
      texto: `${t.decisionType}: ${recortar(t.reasoning, 140)}`,
    });
  }

  for (const c of comentarios) {
    items.push({
      cuando: c.decidedAt,
      de: 'comment-brain',
      a: `@${c.handle}`,
      tipo: 'red-social',
      texto: `Clasificó comentario (${c.kind}) → ${c.outcome}`,
    });
  }

  for (const o of encolados) {
    const e = o.entry!;
    items.push({
      cuando: iso(o.at),
      de: 'automatización',
      a: `@${e.handle}`,
      tipo: 'red-social',
      texto: `Preparó respuesta ${e.origin === 'human' ? 'aprobada por humano' : 'automática'}: ${recortar(e.text, 100)}`,
    });
  }

  for (const c of carruseles) {
    const publicado = c.status === 'published';
    items.push({
      cuando: c.finishedAt ?? c.startedAt,
      de: 'carousel-factory',
      a: publicado ? 'Instagram' : 'equipo FeedIA',
      tipo: publicado ? 'red-social' : 'pieza',
      texto: publicado ? `Publicó carrusel «${c.topic}»` : `Generó carrusel «${c.topic}» (${c.status})`,
    });
  }

  for (const v of videos) {
    items.push({
      cuando: v.createdAt,
      de: 'video-producer',
      a: 'equipo FeedIA',
      tipo: 'pieza',
      texto: `Produjo video «${recortar(v.topic, 80)}» (${v.provider})`,
    });
  }

  for (const m of misiones) {
    items.push({
      cuando: m.finishedAt || m.startedAt,
      de: 'swarm-conductor',
      a: 'equipo FeedIA',
      tipo: 'mision',
      texto: `Misión ${ESTADO_MISION[m.status]}: ${recortar(m.objective, 120)}`,
    });
  }

  for (const ev of eventos) {
    if (ev.type === 'CommentReviewRequired') {
      items.push({
        cuando: ev.timestamp,
        de: ev.sourceAgent ?? 'comment-brain',
        a: 'revisión humana',
        tipo: 'automatizacion',
        texto: `Pidió revisión de comentario de @${String(ev.payload.handle ?? '')} (${String(ev.payload.kind ?? '')})`,
      });
    } else if (ev.type === 'SwarmMissionStarted' || ev.type === 'SwarmMissionFinished') {
      items.push({
        cuando: ev.timestamp,
        de: ev.sourceAgent ?? 'swarm-conductor',
        a: ev.targetAgent ?? 'equipo FeedIA',
        tipo: 'mision',
        texto:
          ev.type === 'SwarmMissionStarted'
            ? `Arrancó misión: ${recortar(String(ev.payload.objective ?? ''), 120)}`
            : 'Terminó una misión',
      });
    }
  }

  const validos = items.filter((i) => Number.isFinite(Date.parse(i.cuando)));
  const interacciones = validos
    .slice()
    .sort((a, b) => Date.parse(b.cuando) - Date.parse(a.cuando))
    .slice(0, 25);

  const desde = (horas: number): InteraccionReal[] => {
    const corte = Date.now() - horas * HORA_MS;
    return validos.filter((i) => Date.parse(i.cuando) >= corte);
  };
  const semana = desde(24 * 7);
  const corteSemana = Date.now() - 7 * 24 * HORA_MS;

  const conteos: ConteosActividad = {
    acciones24h: desde(24).length,
    acciones7d: semana.length,
    agentesActivos7d: new Set(semana.map((i) => i.de)).size,
    misionesFallidas7d: misiones.filter(
      (m) => m.status === 'failed' && Date.parse(m.finishedAt || m.startedAt) >= corteSemana,
    ).length,
    carruselesEnRevision: carruseles.filter((c) => c.status === 'held').length,
  };

  return {
    staff,
    interacciones,
    conteos,
    rolesActivos: staff.filter((s) => s.estado === 'operando').length,
    piezas: carruseles.length + videos.length,
    comentariosRevisados: comentarios.length,
    respuestasPreparadas: encolados.length,
  };
};
