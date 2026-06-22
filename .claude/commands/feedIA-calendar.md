---
description: Skill de Calendario Editorial Automatizado — Grilla mensual de contenido
---

Skill de planificación editorial para FeedIA. Módulo: `src/capabilities/editorialCalendar/calendarBuilder.ts`

## Comportamiento según $ARGUMENTS

**"generar [mes] [año]"** → Ejecuta `buildMonthlyCalendar(brand, año, mes)` con config por defecto.

**"config"** → Personaliza antes de generar:

- Posts por semana (default: 5)
- Distribución de pilares (default: 30% educación, 20% entretenimiento, 20% venta, 15% interacción...)
- Horarios pico de la audiencia
- Temas de campaña del mes
- Días a evitar

**"hoy"** → `getTodayEntries(brandId)` — qué publicar hoy

**"csv"** → `exportToCSV(calendar)` — exporta el calendario para compartir con el equipo

**"estado [fecha]"** → `updateEntryStatus()` — marca entrada como in-production / ready / published

**"revisar"** → Muestra el calendario del mes actual con colores por estado (✅ published / 🔄 in-production / ⬜ planned)

## Distribución de pilares por defecto

| Pilar            | %   | Objetivo                  |
| ---------------- | --- | ------------------------- |
| Educación        | 30% | Posicionamiento experto   |
| Entretenimiento  | 20% | Engagement y retención    |
| Venta            | 20% | Conversión directa        |
| Interacción      | 15% | Comunidad y UGC           |
| Inspiración      | 5%  | Afiliación emocional      |
| Detrás de escena | 5%  | Confianza y autenticidad  |
| UGC              | 3%  | Prueba social             |
| Newsjacking      | 2%  | Relevancia en tiempo real |

## Flujo recomendado

1. `/feedIA-buyer-persona` — definir audiencia
2. `/feedIA-calendar generar [mes]` — generar grilla
3. `/feedIA-copywriting caption` — escribir captions de cada entrada
4. `/feedIA-canva batch` — generar briefs de diseño para la semana
5. `/feedIA-calendar estado [fecha]` — trackear progreso

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **planificador editorial (cadencia + mix de formatos)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
