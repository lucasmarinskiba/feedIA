/**
 * Intent Parser de FeedIA — traduce lenguaje natural (voz, texto, pizarra, calendario)
 * en estructura de metas, eventos, tareas y restricciones.
 *
 * El usuario dice o escribe: "Este mes quiero crecer 2k seguidores, vender 30 cursos
 * antes de fin de trimestre y lanzar mi libro el 15 de julio." y este módulo lo
 * convierte en goals, events y tasks listos para ejecutar.
 */

import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import type { GoalHorizon, GoalCategory } from './goalManager.js';

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type IntentInputType = 'voice' | 'chat' | 'canvas' | 'calendar';

export interface CanvasNode {
  type: 'goal' | 'event' | 'task' | 'constraint' | 'note';
  id: string;
  text: string;
  date?: string; // si aplica
  horizon?: GoalHorizon;
  meta?: Record<string, unknown>;
}

export interface CanvasConnection {
  from: string;
  to: string;
  label?: string;
}

export interface CanvasInput {
  nodes: CanvasNode[];
  connections?: CanvasConnection[];
}

export interface CalendarEntry {
  date: string; // YYYY-MM-DD
  title: string;
  type: 'event' | 'task' | 'milestone' | 'campaign' | 'holiday' | 'launch' | 'collab';
  description?: string;
  duration?: { startDate: string; endDate: string };
}

export interface ParseInput {
  source: IntentInputType;
  text?: string; // para voice / chat
  canvas?: CanvasInput; // para pizarra
  calendar?: CalendarEntry[]; // para calendario
  brand: BrandProfile;
  referenceDate?: string; // para interpretar "este mes", "este trimestre", etc.
}

export interface ParsedGoal {
  horizon: GoalHorizon;
  category: GoalCategory;
  title: string;
  description: string;
  target: { metric: string; value: number; unit: string };
  startsAt?: string;
  endsAt?: string;
  confidence: number; // 0-1
  source: IntentInputType;
}

export interface ParsedEvent {
  title: string;
  type: CalendarEntry['type'];
  startsAt: string;
  endsAt?: string;
  description: string;
  goalRefs: string[]; // títulos de goals relacionados
  confidence: number;
}

export interface ParsedTask {
  title: string;
  description: string;
  dueDate?: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  suggestedAgent: string;
  estimatedHours: number;
  goalRefs: string[];
  confidence: number;
}

export interface ParsedConstraint {
  description: string;
  type: 'time' | 'content' | 'budget' | 'frequency' | 'other';
  appliesUntil?: string;
}

export interface ParseResult {
  goals: ParsedGoal[];
  events: ParsedEvent[];
  tasks: ParsedTask[];
  constraints: ParsedConstraint[];
  ambiguities: Array<{ original: string; needsClarification: string }>;
  summary: string;
  confidence: number;
  raw: string;
}

// ── Normalización de inputs heterogéneos ─────────────────────────────────────

const canvasToText = (canvas: CanvasInput): string => {
  const lines: string[] = ['Contenido del canvas/pizarra:'];
  for (const node of canvas.nodes) {
    const dateNote = node.date ? ` [fecha: ${node.date}]` : '';
    const horizonNote = node.horizon ? ` [horizonte: ${node.horizon}]` : '';
    lines.push(`- (${node.type}) "${node.text}"${dateNote}${horizonNote}`);
  }
  if (canvas.connections && canvas.connections.length > 0) {
    lines.push('\nConexiones entre nodos:');
    for (const conn of canvas.connections) {
      const fromNode = canvas.nodes.find((n) => n.id === conn.from);
      const toNode = canvas.nodes.find((n) => n.id === conn.to);
      lines.push(`- "${fromNode?.text ?? conn.from}" ${conn.label ?? '→'} "${toNode?.text ?? conn.to}"`);
    }
  }
  return lines.join('\n');
};

const calendarToText = (entries: CalendarEntry[]): string => {
  const lines: string[] = ['Entradas del calendario:'];
  for (const e of entries) {
    const range = e.duration ? `${e.duration.startDate} → ${e.duration.endDate}` : e.date;
    lines.push(`- [${range}] (${e.type}) "${e.title}"${e.description ? `: ${e.description}` : ''}`);
  }
  return lines.join('\n');
};

const buildRawFromInput = (input: ParseInput): string => {
  switch (input.source) {
    case 'voice':
    case 'chat':
      return input.text ?? '';
    case 'canvas':
      return input.canvas ? canvasToText(input.canvas) : '';
    case 'calendar':
      return input.calendar ? calendarToText(input.calendar) : '';
  }
};

// ── Diccionario de fechas relativas ──────────────────────────────────────────

const resolveRelativeDates = (referenceDate: Date): string => {
  const ref = referenceDate;
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const day = ref.getDate();

  const monthEnd = new Date(year, month + 1, 0);
  const quarterIdx = Math.floor(month / 3);
  const quarterStart = new Date(year, quarterIdx * 3, 1);
  const quarterEnd = new Date(year, quarterIdx * 3 + 3, 0);
  const yearEnd = new Date(year, 11, 31);

  const fmt = (d: Date): string => d.toISOString().split('T')[0]!;

  return `Fecha de referencia: ${fmt(ref)}.
Diccionario para fechas relativas:
- "hoy" = ${fmt(ref)}
- "mañana" = ${fmt(new Date(year, month, day + 1))}
- "esta semana" termina = ${fmt(new Date(year, month, day + (7 - ref.getDay() || 7)))}
- "este mes" termina = ${fmt(monthEnd)}
- "este trimestre" = ${fmt(quarterStart)} → ${fmt(quarterEnd)} (Q${quarterIdx + 1})
- "este año" termina = ${fmt(yearEnd)}
- "próximo mes" = ${fmt(new Date(year, month + 1, 1))} → ${fmt(new Date(year, month + 2, 0))}`;
};

// ── Parser principal ──────────────────────────────────────────────────────────

export const parseUserIntent = async (input: ParseInput): Promise<ParseResult> => {
  const raw = buildRawFromInput(input);
  if (!raw.trim()) {
    return {
      goals: [],
      events: [],
      tasks: [],
      constraints: [],
      ambiguities: [{ original: '(input vacío)', needsClarification: '¿Qué objetivo querés que el sistema persiga?' }],
      summary: 'No se proporcionó input',
      confidence: 0,
      raw: '',
    };
  }

  const refDate = input.referenceDate ? new Date(input.referenceDate) : new Date();
  const dateContext = resolveRelativeDates(refDate);

  const prompt = `Sos un parser experto: convertís lo que dice el usuario sobre su Instagram en estructura accionable.

INPUT (${input.source}):
"""
${raw}
"""

${dateContext}

CONTEXTO MARCA:
- Nombre: ${input.brand.name}
- Nicho: ${input.brand.niche}
- Tipo: ${input.brand.type}
- Audiencia: ${input.brand.audience.description}
- Objetivo principal: ${input.brand.goals.primary}

Extraé:
1. METAS (con horizonte: weekly | monthly | quarterly | annual y categoría: growth | engagement | content | sales | authority | community | custom)
2. EVENTOS (lanzamientos, fechas importantes, campañas, colabs)
3. TAREAS sueltas (acciones puntuales no recurrentes)
4. RESTRICCIONES (ej: "no publicar en vacaciones", "solo reels martes y jueves")
5. AMBIGÜEDADES (lo que no entendiste con claridad — sugerí pregunta)

Cada meta debe tener un target NUMÉRICO. Si el usuario no lo especifica, INFERILO de forma realista
(ej: "crecer este mes" → 500 seguidores; "más ventas" → 5 ventas/semana).

Cada tarea debe sugerir un agente del equipo:
- nova (contenido), scout (research/competencia/trends), lia (comunidad/DMs),
- luca (ventas/leads), pixel (diseño/visual), analytics (métricas/reportes),
- gard (compliance/legal), max (growth/conversión), vero (UGC/colabs), talia (coordinación general).

JSON exacto:
{
  "summary": "1 párrafo describiendo qué pidió el usuario",
  "confidence": 0.0-1.0,
  "goals": [
    {
      "horizon": "weekly|monthly|quarterly|annual",
      "category": "growth|engagement|content|sales|authority|community|custom",
      "title": "título corto",
      "description": "1-2 líneas",
      "target": { "metric": "ej: followers|sales_count|engagement_rate|posts_count", "value": número, "unit": "seguidores|ventas|%|posts" },
      "startsAt": "ISO date opcional",
      "endsAt": "ISO date opcional",
      "confidence": 0.0-1.0
    }
  ],
  "events": [
    {
      "title": "...",
      "type": "event|task|milestone|campaign|holiday|launch|collab",
      "startsAt": "ISO date",
      "endsAt": "ISO date opcional",
      "description": "...",
      "goalRefs": ["título de la meta relacionada"],
      "confidence": 0.0-1.0
    }
  ],
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "dueDate": "ISO opcional",
      "priority": "critical|high|normal|low",
      "suggestedAgent": "nova|scout|lia|luca|pixel|analytics|gard|max|vero|talia",
      "estimatedHours": número,
      "goalRefs": [],
      "confidence": 0.0-1.0
    }
  ],
  "constraints": [
    {
      "description": "...",
      "type": "time|content|budget|frequency|other",
      "appliesUntil": "ISO date opcional"
    }
  ],
  "ambiguities": [
    { "original": "fragmento ambiguo", "needsClarification": "pregunta puntual para el usuario" }
  ]
}`;

  log.info(`[IntentParser] Parseando intent desde ${input.source} (${raw.length} chars)...`);

  try {
    const result = await routerAskJson<Omit<ParseResult, 'raw'>>(prompt, {
      taskType: 'analysis',
      maxTokens: 4000,
      systemPrompt:
        'Sos un parser preciso. NO inventes metas que el usuario no mencionó. Si algo es ambiguo, va a ambiguities, no a goals.',
    });

    // Inyectar source en goals
    const goals = (result.goals ?? []).map((g) => ({ ...g, source: input.source }));

    log.info(
      `[IntentParser] ✓ Parseado: ${goals.length} metas, ${result.events?.length ?? 0} eventos, ${result.tasks?.length ?? 0} tareas, ${result.constraints?.length ?? 0} restricciones`,
    );

    return {
      summary: result.summary ?? '',
      confidence: result.confidence ?? 0.7,
      goals,
      events: result.events ?? [],
      tasks: result.tasks ?? [],
      constraints: result.constraints ?? [],
      ambiguities: result.ambiguities ?? [],
      raw,
    };
  } catch (err) {
    log.error(`[IntentParser] Error parseando: ${(err as Error).message}`);
    return {
      goals: [],
      events: [],
      tasks: [],
      constraints: [],
      ambiguities: [
        { original: raw.slice(0, 100), needsClarification: 'No pude interpretar tu input. ¿Podés reformularlo?' },
      ],
      summary: 'Error en el parser',
      confidence: 0,
      raw,
    };
  }
};

// ── Validador de coherencia (cross-checks) ───────────────────────────────────

export interface ValidationIssue {
  goalIndex?: number;
  taskIndex?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export const validateParseResult = (result: ParseResult): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  // Goals con target irrealmente bajo o alto
  result.goals.forEach((g, idx) => {
    if (g.target.value <= 0) {
      issues.push({
        goalIndex: idx,
        severity: 'error',
        message: `Meta "${g.title}" tiene target ${g.target.value}, debe ser > 0`,
      });
    }
    if (g.horizon === 'weekly' && g.target.metric === 'followers' && g.target.value > 5000) {
      issues.push({
        goalIndex: idx,
        severity: 'warning',
        message: `Meta semanal de ${g.target.value} seguidores es muy ambiciosa`,
        suggestion: 'Considerá bajarla a 200-1000/semana para empezar',
      });
    }
    if (g.horizon === 'annual' && g.target.metric === 'followers' && g.target.value < 100) {
      issues.push({
        goalIndex: idx,
        severity: 'warning',
        message: `Meta anual de solo ${g.target.value} seguidores parece muy baja`,
      });
    }
  });

  // Eventos sin fecha válida
  result.events.forEach((e, idx) => {
    if (!e.startsAt || Number.isNaN(new Date(e.startsAt).getTime())) {
      issues.push({ severity: 'error', message: `Evento "${e.title}" (idx ${idx}) sin fecha válida` });
    }
  });

  // Tasks con prioridad critical sin dueDate
  result.tasks.forEach((t, idx) => {
    if (t.priority === 'critical' && !t.dueDate) {
      issues.push({ taskIndex: idx, severity: 'warning', message: `Tarea crítica "${t.title}" sin deadline definido` });
    }
  });

  // Demasiadas metas activas
  if (result.goals.length > 8) {
    issues.push({
      severity: 'warning',
      message: `Se detectaron ${result.goals.length} metas. Demasiadas a la vez diluye el foco.`,
      suggestion: 'Sugerí al usuario elegir las 3-5 más importantes',
    });
  }

  return issues;
};

// ── Helper de conveniencia: parsear y validar en un paso ────────────────────

export const parseAndValidate = async (
  input: ParseInput,
): Promise<{ parsed: ParseResult; issues: ValidationIssue[] }> => {
  const parsed = await parseUserIntent(input);
  const issues = validateParseResult(parsed);
  return { parsed, issues };
};
