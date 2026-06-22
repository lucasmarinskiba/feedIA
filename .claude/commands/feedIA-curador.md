---
description: Skill de Curación y Monitoreo Web — Tendencias, newsjacking y contenido reactivo
---

Skill de curación de contenido para FeedIA.
Módulos: `src/capabilities/curator/` + `src/capabilities/trends/` + `src/capabilities/computerUse/trendingEngine.ts`

## Comportamiento según $ARGUMENTS

**"tendencias [nicho]"** → Detecta tendencias actuales del nicho con `detectTrends(brand)`.

**"newsjacking [noticia]"** → Adapta una noticia/tendencia al contenido de la marca. Genera: ángulo, caption, formato recomendado.

**"monitorar"** → Configurar alertas de palabras clave para el nicho de la marca.

**"viral [tema]"** → Analiza por qué un tema está viralizando y cómo la marca puede aprovecharlo de forma auténtica.

**"curar [fuentes]"** → Escanea URLs/fuentes provistas y extrae ideas de contenido relevantes.

**"calendario de tendencias"** → Fechas clave del mes (días especiales, efemérides) relevantes para el nicho.

## Fuentes de tendencias que monitorea

- Instagram Explore y Reels trending
- TikTok Creative Center (tendencias que migran a IG)
- Google Trends
- Hashtags trending del nicho
- Publicaciones virales de competidores
- Noticias de la industria

## Reglas de Newsjacking

**SÍ hacer:**

- Conectar la noticia al valor/expertise de la marca
- Publicar en las primeras 24-48 horas de la noticia
- Aportar perspectiva única (no solo repostear)
- Usar el storytelling de la marca

**NO hacer:**

- Newsjacking de tragedias o crisis humanitarias
- Temas políticamente divisivos (a menos que sea el nicho)
- Noticias sin verificar / fake news
- Forzar la conexión cuando no existe naturalmente

## Cómo adaptar una tendencia a tu marca

1. **¿Es relevante?** La tendencia tiene relación natural con el nicho
2. **¿Agrega valor?** El post aporta perspectiva única, no solo repite
3. **¿Es oportuno?** Publicar en ventana de viralización (0-48h)
4. **¿Es auténtico?** Está en la voz y valores de la marca
5. **Formato óptimo:** Reel de opinión / Carrusel de contexto / Story de reacción

Si pasa las 5 preguntas → generar contenido con `/feedIA-copywriting caption`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **curador de contenido y fuentes de valor**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
