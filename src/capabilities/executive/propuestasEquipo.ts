/**
 * Propuestas del equipo: oportunidades para crecer, derivadas de datos reales.
 *
 * A diferencia de Decisiones (aprobaciones que bloquean algo), acá van ideas que el equipo
 * detecta y que el dueño elige hacer o descartar. Cada propuesta cita el dato que la originó.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { getLatestReport as getIGLatestReport } from './instagramAutopilot.js';
import { getLatestReport as getTTLatestReport } from './tiktokAutopilot.js';
import { listConversations, type Conversation } from '../community/dmInbox.js';
import { listCarouselJobs } from '../content/index.js';
import { getOKRSummary } from './executiveOKR.js';

const ESTADOS_DIR = path.resolve('data/executive/propuestas');
const HORA_MS = 3_600_000;
const LEAD_MINIMO = 60;
const LEAD_ALTO = 80;
const INTENCION_COMPRA = /(cu[aá]nto|precio|costo|cotiz|comprar|contratar|presupuesto|plan|vale|tarifa)/i;

/** Puntaje de lead a partir de señales de la conversación: intención, mensajes, tono y seguimiento. */
export const puntajeLead = (c: Conversation): number => {
  let puntos = 0;
  if (c.intent === 'comercial') puntos += 40;
  const suyos = c.messages.filter((m) => m.sender === 'them');
  const ultimo = suyos[suyos.length - 1]?.text ?? '';
  if (INTENCION_COMPRA.test(ultimo)) puntos += 25;
  if (suyos.length >= 2) puntos += 10;
  puntos += Math.round(Math.max(-1, Math.min(1, c.sentiment)) * 10);
  if (c.contact.isFollower) puntos += 10;
  return Math.max(0, Math.min(100, puntos));
};

export type PropuestaPrioridad = 'alta' | 'media' | 'baja';

export interface AccionPropuesta {
  label: string;
  tipo: 'tab' | 'ruta' | 'conectar';
  valor: string;
}

export interface Propuesta {
  id: string;
  agente: string;
  emoji: string;
  prioridad: PropuestaPrioridad;
  titulo: string;
  detalle: string;
  dato: string;
  accion: AccionPropuesta;
}

interface EstadoPropuestas {
  resueltas: Record<string, { estado: 'aceptada' | 'descartada'; fecha: string }>;
}

const RANGO: Record<PropuestaPrioridad, number> = { alta: 0, media: 1, baja: 2 };

const estadoPath = (brandId: string): string => path.join(ESTADOS_DIR, `${brandId}-estado.json`);

const leerEstado = async (brandId: string): Promise<EstadoPropuestas> => {
  try {
    return JSON.parse(await fs.readFile(estadoPath(brandId), 'utf-8')) as EstadoPropuestas;
  } catch {
    return { resueltas: {} };
  }
};

const guardarEstado = async (brandId: string, estado: EstadoPropuestas): Promise<void> => {
  await fs.mkdir(ESTADOS_DIR, { recursive: true });
  await fs.writeFile(estadoPath(brandId), JSON.stringify(estado, null, 2), 'utf-8');
};

const hacerCuanto = (iso: string): string => {
  const minutos = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return `hace ${Math.floor(horas / 24)} d`;
};

const leadsPrioritarios = (): Array<{ c: Conversation; score: number }> => {
  const vistos = new Set<string>();
  return [...listConversations({ status: 'new' }), ...listConversations({ status: 'in-progress' })]
    .map((c) => ({ c, score: puntajeLead(c) }))
    .filter((x) => x.score >= LEAD_MINIMO)
    .sort((a, b) => b.score - a.score)
    .filter((x) => {
      if (vistos.has(x.c.contact.username)) return false;
      vistos.add(x.c.contact.username);
      return true;
    })
    .slice(0, 3);
};

export const construirPropuestas = async (brandId: string, brandName: string): Promise<Propuesta[]> => {
  const propuestas: Propuesta[] = [];
  const dia = new Date().toISOString().slice(0, 10);
  const [ig, tt, okr] = await Promise.all([
    getIGLatestReport(brandId),
    getTTLatestReport(brandId),
    getOKRSummary(brandId),
  ]);

  const formatoIG = ig?.signals.find((s) => s.signal === 'algorithm-favor');
  if (formatoIG) {
    const esReel = /reels? rinden/i.test(formatoIG.evidence);
    propuestas.push({
      id: `formato-ig-${dia}`,
      agente: 'Nova',
      emoji: '🎨',
      prioridad: 'media',
      titulo: esReel ? 'Sumá más reels: es el formato que rinde' : 'Sumá más carruseles: es el formato que rinde',
      detalle: formatoIG.reasoning,
      dato: formatoIG.evidence,
      accion: { label: 'Crear pieza', tipo: 'ruta', valor: esReel ? 'studio-reel' : 'studio-carousel' },
    });
  }

  const formatoTT = tt?.signals.find((s) => s.signal === 'series-momentum');
  if (formatoTT) {
    propuestas.push({
      id: `serie-tt-${dia}`,
      agente: 'Luca',
      emoji: '🚀',
      prioridad: 'media',
      titulo: 'Convertí tu formato ganador en una serie',
      detalle: formatoTT.reasoning,
      dato: formatoTT.evidence,
      accion: { label: 'Crear video', tipo: 'ruta', valor: 'studio-tiktok' },
    });
  }

  const seguidoresIG = ig?.signals.find((s) => s.signal === 'follower-decline');
  const seguidoresTT = tt?.signals.find((s) => s.signal === 'follower-decline');
  const caida = seguidoresIG ?? seguidoresTT;
  if (caida) {
    propuestas.push({
      id: `reactivar-${dia}`,
      agente: 'Luca',
      emoji: '🚀',
      prioridad: 'alta',
      titulo: 'Reactivá a los seguidores que se están yendo',
      detalle: caida.reasoning,
      dato: caida.evidence,
      accion: { label: 'Responder a la comunidad', tipo: 'ruta', valor: 'inbox' },
    });
  }

  const horaIG = ig?.observation;
  if (
    horaIG?.postingHourLast7d !== null &&
    horaIG?.postingHourLast7d !== undefined &&
    horaIG.bestPostingHourLast30d !== null &&
    horaIG.bestPostingHourLast30d !== undefined &&
    Math.abs(horaIG.bestPostingHourLast30d - horaIG.postingHourLast7d) > 2
  ) {
    propuestas.push({
      id: `horario-ig-${dia}`,
      agente: 'Mira',
      emoji: '📈',
      prioridad: 'baja',
      titulo: `Publicá a las ${horaIG.bestPostingHourLast30d}h`,
      detalle: 'Tu audiencia activa cambió de horario. Publicar en tu mejor franja mejora la primera hora.',
      dato: `Publicás a las ${horaIG.postingHourLast7d}h; tu mejor hora de los últimos 30 días es ${horaIG.bestPostingHourLast30d}h`,
      accion: { label: 'Ver autopilot', tipo: 'tab', valor: 'igAutopilot' },
    });
  }

  for (const { c: lead, score } of leadsPrioritarios()) {
    propuestas.push({
      id: `lead-${lead.id}`,
      agente: 'Lía',
      emoji: '✍️',
      prioridad: score >= LEAD_ALTO ? 'alta' : 'media',
      titulo: `Responder a @${lead.contact.username}`,
      detalle: `Lead calificado (${score}/100) esperando respuesta.`,
      dato: `Último mensaje ${hacerCuanto(lead.lastMessageAt)}`,
      accion: { label: 'Abrir conversación', tipo: 'ruta', valor: 'inbox' },
    });
  }

  if (okr.topConcern) {
    propuestas.push({
      id: `okr-foco-${dia}`,
      agente: 'Mira',
      emoji: '📈',
      prioridad: 'alta',
      titulo: `Enfocá las próximas piezas en: ${okr.topConcern.krDescription}`,
      detalle: `Va atrasado en «${okr.topConcern.objectiveTitle}». Priorizar ese resultado acerca la meta.`,
      dato: `Brecha de ${okr.topConcern.gap.toFixed(0)}% frente a la meta`,
      accion: { label: 'Ver OKR', tipo: 'tab', valor: 'okrs' },
    });
  }

  const publicados = listCarouselJobs(brandName)
    .filter((c) => c.status === 'published')
    .sort((a, b) => Date.parse(b.finishedAt ?? b.startedAt) - Date.parse(a.finishedAt ?? a.startedAt));
  const reciclable = publicados[0];
  if (reciclable && Date.now() - Date.parse(reciclable.finishedAt ?? reciclable.startedAt) < 7 * 24 * HORA_MS) {
    propuestas.push({
      id: `reciclar-${reciclable.id}`,
      agente: 'Luca',
      emoji: '🚀',
      prioridad: 'baja',
      titulo: `Adaptá «${reciclable.topic}» a reel`,
      detalle: 'Ya funcionó como carrusel. Reciclarlo como reel suma alcance sin producir desde cero.',
      dato: `Carrusel publicado esta semana («${reciclable.topic}»)`,
      accion: { label: 'Crear reel', tipo: 'ruta', valor: 'studio-reel' },
    });
  }

  const estado = await leerEstado(brandId);
  return propuestas
    .filter((p) => !estado.resueltas[p.id])
    .sort((a, b) => RANGO[a.prioridad] - RANGO[b.prioridad])
    .slice(0, 8);
};

/** Marca una propuesta como aceptada o descartada; no vuelve a aparecer. */
export const resolverPropuesta = async (
  brandId: string,
  id: string,
  estado: 'aceptada' | 'descartada',
): Promise<void> => {
  const actual = await leerEstado(brandId);
  actual.resueltas[id] = { estado, fecha: new Date().toISOString() };
  await guardarEstado(brandId, actual);
};
