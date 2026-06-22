---
description: Skill Reel Studio — Guionista, director y editor de Reels automático
---

Skill de creación completa de Reels. Módulo: `src/capabilities/reelStudio/reelScriptwriter.ts`

## Comportamiento según $ARGUMENTS

**"guion [tema] [duración: 15/30/60/90]"** → `generateReelScript(brand, params)` — guion completo escena por escena con timing, ángulos, cortes, audio.

**"storyboard"** → `generateStoryboard(script)` — descripciones visuales por escena (listas para mockup).

**"hooks [tema]"** → `generateHookVariants(brand, tema, style)` — 5 hooks alternativos para A/B test.

**"saga [tema] [N episodios]"** → `generateReelSeries()` — N reels conectados narrativamente.

**"ver [N]"** → Últimos N reels generados.

## Estilos de Reel disponibles

- `storytelling` — narrativa personal con arco
- `tutorial` — paso a paso accionable
- `pov` — primera persona inmersiva
- `transformation` — antes vs después
- `comedy` — humor/sketch
- `reaction` — reacción a tendencia/noticia
- `listicle` — top N de algo
- `mythbusting` — desmentir mito común

## Principios de retención

| Segundo | Métrica           | Acción                              |
| ------- | ----------------- | ----------------------------------- |
| 0-0.5s  | Stop scroll       | Hook visual + audio gancho          |
| 0.5-3s  | Hook engagement   | Promesa específica de valor         |
| 3-15s   | Building interest | Desarrollo con cliffhangers cada 3s |
| 15s+    | Retention         | Cortes cada 2-3s, no pausas         |
| Final   | Loop/CTA          | Cerrar con loop o CTA accionable    |

## Transiciones recomendadas

- `cut` — corte directo (universal)
- `jump-cut` — energía, urgencia
- `whip-pan` — cambio de escena dinámico
- `match-cut` — visual similar entre escenas
- `beat-drop` — sincronizado con audio
- `fade` — pasaje de tiempo

## Output del skill

Cada guion incluye:

1. Hook + escenas con timing
2. Estrategia de audio (canción trending / voiceover / silent)
3. Cover frame (qué texto va en la portada)
4. Caption + CTA + hashtags
5. Predicción de retención (sec3, sec15, completion)
6. Checklist de producción
7. Tiempo estimado de grabación + edición

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **estudio integral de producción de Reels**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
