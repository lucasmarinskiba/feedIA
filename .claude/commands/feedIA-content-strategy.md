---
description: Content Strategy — pillars, topic clusters, editorial roadmap
---

Content Strategy de FeedIA. Combina `editorialCalendar` + `buyerPersona` + `strategy/`.

## Según $ARGUMENTS

**"pillars [nicho]"** → 5-7 pilares de contenido balanceados: educación/entretenimiento/venta/inspiración/UGC.

**"clusters"** → Topic clusters: hub + spokes. 1 pillar piece + 10-15 supporting pieces.

**"roadmap [meses]"** → Plan trimestral: temas mensuales, campañas, lanzamientos, evergreen.

**"calendar"** → Calendario mensual auto. API: `POST /api/calendar/build`.

**"ideas [pillar] [N]"** → N ideas concretas para pilar específico. Con hook + ángulo + formato.

**"audit"** → Analiza historial → qué pilares saturados, cuáles huérfanos.

## Frameworks

### Content Mix óptimo (regla 4-2-1)

- **40%** Educación (autoridad)
- **20%** Entretenimiento (alcance)
- **20%** Venta (conversión)
- **15%** Interacción (community)
- **5%** UGC/Detrás de escenas (humanización)

### Pillar matrix

```
            High value    Low value
High effort | Hero pieces  | EVITAR
Low effort  | Quick wins   | Fillers (limitado)
```

### Topic cluster structure

```
PILLAR PAGE (largo, definitivo)
    ├── SPOKE 1 (sub-tema específico)
    ├── SPOKE 2
    └── SPOKE N
```

## Integración

Output va a `calendarBuilder.ts` → genera grilla mensual auto con prompts listos para `/api/me/carousel/full`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **estratega de contenido (pilares + objetivos)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
