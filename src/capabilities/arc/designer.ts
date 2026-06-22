import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile, ContentFormat } from '../../config/types.js';
import type { ScheduledSlot } from '../ops/scheduler.js';

export type ArcRole =
  | 'gancho-arco'
  | 'tension-creciente'
  | 'callback'
  | 'punto-medio'
  | 'climax'
  | 'resolucion'
  | 'epilogo';

export interface ArcBeat {
  diaSemana: 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';
  formato: ContentFormat;
  rolEnArco: ArcRole;
  tema: string;
  conexionConSlotPrevio?: string;
  setupParaSlotProximo?: string;
  mecanismoCallback?: string;
}

export interface StoryArc {
  premisaSemanal: string;
  arcoCentral: string;
  beats: ArcBeat[];
  reglasNarrativas: string[];
  riesgosPosibles: string[];
}

export const diseñarArcoSemanal = async (
  brand: BrandProfile,
  slots: ScheduledSlot[],
  contextoTematico?: string,
): Promise<StoryArc> => {
  const prompt = `Actuá como guionista convirtiendo una semana de posts sueltos en un arco narrativo coherente.

${brandContext(brand)}

${contextoTematico ? `CONTEXTO TEMÁTICO DE LA SEMANA: ${contextoTematico}\n` : ''}

SLOTS PROGRAMADOS (en orden):
${slots.map((s, i) => `${i + 1}. ${s.diaSemana} ${s.horaLocal} (${s.formato}): ${s.tema}`).join('\n')}

Reglas:
- La semana entera debe tener UN arco central (premisa única). No 7 temas dispersos.
- Cada beat tiene un rol narrativo. El primer post planta una pregunta abierta. El del medio gira la perspectiva. El último cierra con resolución.
- Los callbacks son explícitos: el martes hace referencia al lunes ("acordate del...", "lo que dejamos abierto...").
- El setup pone una semilla que se cosecha más adelante.
- Si los slots no dan para arco coherente, devolver "premisaSemanal" sugiriendo qué ajustar.

JSON:
{
  "premisaSemanal": "la idea unificadora en 1 oración",
  "arcoCentral": "tensión central que la semana resuelve",
  "beats": [
    {
      "diaSemana": "lun|mar|mie|jue|vie|sab|dom",
      "formato": "reel|carrusel|post-imagen|historia|reel-faceless|live",
      "rolEnArco": "gancho-arco|tension-creciente|callback|punto-medio|climax|resolucion|epilogo",
      "tema": "ajustado del slot original si hace falta",
      "conexionConSlotPrevio": "frase concreta de callback",
      "setupParaSlotProximo": "qué semilla planta",
      "mecanismoCallback": "ej: misma metáfora visual, número que crece, pregunta abierta"
    }
  ],
  "reglasNarrativas": ["regla 1 que respetaste", "..."],
  "riesgosPosibles": ["si la audiencia se pierde el primer post, ¿se entiende el resto?", "..."]
}`;
  return askJson<StoryArc>(prompt, { maxTokens: 4500 });
};

export interface ArcBeatPatch {
  beatIndex: number;
  ajusteCaption: string;
  ajusteHook?: string;
  notaInterna: string;
}

export const ajustarBeatsParaCallback = async (
  brand: BrandProfile,
  arc: StoryArc,
  beatsExistentes: Array<{ tema: string; caption: string; hook?: string }>,
): Promise<ArcBeatPatch[]> => {
  const prompt = `Tomá los captions ya escritos y agregá guiños de callback para que la semana se sienta como un arco, no como posts sueltos.

${brandContext(brand)}

ARCO:
- Premisa: ${arc.premisaSemanal}
- Arco central: ${arc.arcoCentral}

BEATS Y CONTENIDO ACTUAL:
${beatsExistentes
  .map(
    (b, i) =>
      `Beat ${i + 1} (${arc.beats[i]?.rolEnArco ?? 'sin-rol'}): ${b.tema}\nCaption: "${b.caption.slice(0, 200)}"\n${b.hook ? `Hook: "${b.hook}"` : ''}`,
  )
  .join('\n---\n')}

Para cada beat (a partir del 2), agregá UN guiño explícito al beat anterior y opcionalmente una semilla para el próximo.
- NO reescribir todo el caption. Solo proponer la frase a insertar y dónde.
- Mantener voz de marca.

JSON: array
[
  {
    "beatIndex": 1,
    "ajusteCaption": "Frase concreta a agregar al inicio o cierre del caption del beat 2",
    "ajusteHook": "(opcional) variación del hook que conecta con el anterior",
    "notaInterna": "qué callback estás creando y por qué"
  }
]`;
  return askJson<ArcBeatPatch[]>(prompt, { maxTokens: 3000 });
};
