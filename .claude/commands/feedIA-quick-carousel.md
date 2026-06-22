---
description: Skill Quick Carousel — Carrusel completo desde 1 prompt mínimo (slides + diseño + caption + hashtags)
---

Skill 1-prompt para crear carruseles completos.
Módulo: `src/capabilities/quickCarousel/quickCarousel.ts`

## Comportamiento según $ARGUMENTS

**"[prompt libre]"** → `createQuickCarousel(brand, { prompt })` — pipeline completo.

Ej:

- `/feedIA-quick-carousel errores comunes al hacer ejercicio`
- `/feedIA-quick-carousel 5 razones para invertir en cripto`
- `/feedIA-quick-carousel cómo dormir mejor`

**"variants [prompt]"** → `createCarouselVariants()` — 3 carruseles distintos del mismo prompt para A/B.

**"list"** → `listQuickCarousels()` — últimos 20 carruseles generados.

**"export [id]"** → markdown del carrusel para revisión humana.

## Lo que el sistema necesita (mínimo)

**OBLIGATORIO:**

- `prompt: string` — descripción libre, incluso 3 palabras

**OPCIONAL (todo auto-deducible):**

- `slideCount` — default 7
- `formula` — AIDA | PAS, default AIDA
- `tone` — override del tono de marca
- `targetAudience` — override
- `goal` — educar | vender | inspirar | entretener | viralizar
- `includeData` — datos a visualizar en gráficos

## Pipeline interno (8 pasos, ~30-60s end-to-end)

```
1. REFINAR        → prompt → tema + ángulo + audiencia + hook + objetivo
2. SCRIPT         → guion N slides con visualText + designNotes
3. DESIGN BRIEFS  → brief Canva por slide (paleta, tipografía, imagen)
4. CAPTION AIDA   → caption con fórmula AIDA/PAS + CTA
5. HUMANIZAR      → eliminar IA-speak del caption
6. HASHTAGS       → pirámide 25-30 hashtags estratégicos
7. COVER FRAME    → primera slide optimizada para detener scroll
8. CANVA STEPS    → instrucciones paso-a-paso para diseñar cada slide
```

Paralelizado donde posible (pasos 2-3-4-6 corren en paralelo).

## Output: `QuickCarouselPackage`

```ts
{
  id: string;
  originalPrompt: string;
  refinedBrief: { refinedTopic, angle, audience, hook, promise, keyTakeaway, goal };
  slides: [
    {
      slide: number;
      visualText: string;          // texto exacto para la slide
      designNotes: string;
      wordCount: number;
      designBrief: { ...paleta, tipografía, imagen, elementos };
      canvaInstructions: string[]; // 12 pasos en Canva
    }
  ];
  cover: { slideIndex, text, designBrief };
  caption: {
    full: string;               // caption completo humanizado
    short: string;              // primera línea
    cta: string;
    formula: 'AIDA' | 'PAS';
    humanScore: number;          // qué tan humano suena (0-100)
  };
  hashtags: {
    flat: string[];              // 25-30 hashtags listos para copiar
    research: HashtagResearch;   // pirámide estratégica completa
  };
  postingRecommendation: { bestTime, bestDay, reasoning };
  estimatedDesignMinutes: number;
  totalProductionMinutes: number;
  readyToPublish: boolean;
}
```

## Ejemplo de uso (API)

```bash
curl -X POST http://localhost:3000/api/carousel/quick \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "cómo aumentar el engagement en Instagram" }'
```

Respuesta: carrusel completo listo para diseñar en Canva y publicar.

## Recomendaciones de horario (auto por goal)

| Goal       | Día       | Hora  | Razón                           |
| ---------- | --------- | ----- | ------------------------------- |
| educar     | Martes    | 12:00 | Pico consumo educativo mid-day  |
| vender     | Jueves    | 20:00 | Pre-weekend decision window     |
| inspirar   | Lunes     | 08:00 | Set intenciones semanales       |
| entretener | Viernes   | 21:00 | Relax mode                      |
| viralizar  | Miércoles | 18:00 | Sweet spot algorítmico mid-week |

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **generador rápido de carrusel IG de alta conversión**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
