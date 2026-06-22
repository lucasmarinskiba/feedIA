---
description: Skill de Reportes Mensuales — KPIs, insights y recomendaciones ejecutivas
---

Skill de analytics y reportes para FeedIA. Módulo: `src/capabilities/monthlyReport/monthlyReport.ts`

## Comportamiento según $ARGUMENTS

**"generar [período YYYY-MM]"** → `generateMonthlyReport(brand, período, métricas)`.
Solicita datos de Meta Business Suite o Instagram Insights.

**"ver [período]"** → `getReport(brandId, período)` — carga reporte existente.

**"markdown [período]"** → `exportToMarkdown(report)` — exporta como documento formateado.

**"comparar [mes1] [mes2]"** → Compara dos períodos y calcula variaciones.

**"kpis"** → Solo el dashboard de KPIs del último reporte, sin narrativa.

## Métricas que solicita el reporte

El skill pedirá estos datos al usuario (o los extrae de `data/` si existen):

### Crecimiento

- Seguidores inicio/fin del período
- Nuevos seguidores y unfollows

### Contenido

- Posts / Stories / Reels publicados
- Impresiones y alcance total
- Visitas al perfil y clics al link

### Engagement

- Likes, comentarios, guardados, shares
- Engagement rate promedio

### Top performers

- Mejor post, reel y story (formato + tema + engagement)

### Ads (opcional)

- Gasto, ingresos atribuidos, leads, conversiones, ROAS

## Benchmarks de industria (referencia)

| Métrica                 | Micro (<10K) | Medio (10K-100K) | Macro (>100K) |
| ----------------------- | ------------ | ---------------- | ------------- |
| Engagement Rate         | 3-6%         | 2-4%             | 1-3%          |
| Crecimiento semanal     | 2-5%         | 1-3%             | 0.5-2%        |
| Story views / followers | 10-20%       | 5-15%            | 3-10%         |
| Saves / likes           | >10%         | 5-10%            | 3-7%          |

## Estructura del reporte generado

1. **Resumen ejecutivo** — narrativa de 3-4 párrafos
2. **Dashboard KPIs** — tabla con estado (above/at/below benchmark)
3. **Highlights** — top 3 logros del mes
4. **Áreas de mejora** — qué no funcionó
5. **Insights de contenido** — mejores formatos, temas, días, horas
6. **Recomendaciones** — priorizadas (critical/high/medium/low)
7. **Foco mes siguiente** — 3 prioridades

Siempre conectar recomendaciones con el módulo de FeedIA que las ejecuta.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **analista de métricas y reporting accionable**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
