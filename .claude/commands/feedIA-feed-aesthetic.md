---
description: Skill Feed Aesthetic — Planificación de grid coherente (reemplaza al curador estético)
---

Skill de planificación visual del feed. Módulo: `src/capabilities/feedAesthetic/feedPlanner.ts`

## Comportamiento según $ARGUMENTS

**"analizar"** → `analyzeFeedGrid()` — analiza últimas 9 publicaciones, score coherencia, warnings.

**"siguiente"** → `suggestNextPost()` — qué publicación va próximo para mantener coherencia.

**"ver"** → `renderGridASCII()` — preview ASCII del grid 3x3 actual.

**"patrón [tipo]"** → Cambia el patrón del feed (checkerboard, rows, columns, puzzle, rainbow, border, centerline, organic).

## Patrones de feed disponibles

| Patrón         | Cuándo usarlo                                          |
| -------------- | ------------------------------------------------------ |
| `checkerboard` | Alternancia colores oscuro/claro para look profesional |
| `rows`         | Cada fila un tema (educación / venta / lifestyle)      |
| `columns`      | Cada columna un pillar (quotes / producto / lifestyle) |
| `puzzle`       | Imágenes que se conectan formando mural                |
| `rainbow`      | Gradiente de color (estético, requiere planning)       |
| `border`       | Borde visual común en todos los posts                  |
| `centerline`   | Columna central destacada                              |
| `organic`      | Sin patrón rígido pero coherente (más flexible)        |

## Cálculo de score de coherencia

Algoritmo de penalización (puntos restados de 100):

- **3 posts seguidos del mismo color dominante**: −10 por cada combo
- **3 posts seguidos del mismo formato**: −5 por combo
- **>50% posts con peso visual "heavy"**: −8
- **<3 tipos de contenido distintos**: −10

Score interpretación:

- 90-100: Grid impecable
- 70-89: Buen grid con ajustes menores
- 50-69: Necesita reorganización
- <50: Grid caótico, planificar nuevo cronograma

## Inputs por FeedSlot

Para cada slot del grid pasar:

- `format`: foto / carrusel / reel / video
- `dominantColors`: 2-3 hex codes
- `visualWeight`: light / medium / heavy
- `contentType`: producto / lifestyle / quote / tutorial / face / flat-lay / abstract

## Output

Recibís:

- Score actualizado
- Balance de colores (% por color dominante)
- Balance de formatos
- Warnings específicos
- 5 recomendaciones accionables
- Sugerencia de próximo post (formato + tipo + colores + peso)

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **curador estético del feed/grid IG**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
