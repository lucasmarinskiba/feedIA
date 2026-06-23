---
description: Skill Carousel Designer Pro — Carruseles HD con estética Pinterest, animaciones CSS+MP4, y descarga automática
---

Skill para crear carruseles innovadores, estéticamente Pinterest-aligned, con animaciones y exportación completa.

Módulo: `src/capabilities/carouselDesigner/carouselDesignerPro.ts`

## Comportamiento según $ARGUMENTS

**"[prompt libre]"** → `designCarouselPinterest(brand, { prompt })` — pipeline completo con Pinterest aesthetics.

Ej:
- `/feedIA-carousel-designer-pro viral reel tips para 2025`
- `/feedIA-carousel-designer-pro cómo crecer en TikTok (2025)`
- `/feedIA-carousel-designer-pro 10 errores de diseño que debes evitar`

**"preview [id]"** → HTML5 preview con animaciones CSS (testeable en browser).

**"download [id]"** → ZIP descargable con slides PNG + CSS + MP4 + JSON metadata.

**"variants [prompt]"** → 3 carruseles distintos (diferentes paletas: warm, bold, premium).

## Lo que el sistema necesita (mínimo)

**OBLIGATORIO:**
- `prompt: string` — descripción libre, incluso 3 palabras

**OPCIONAL (todo auto-deducible):**
- `brandId` — para aplicar colores + tipografía de marca
- `style` — `'warm-organic'` | `'bold-playful'` | `'dark-premium'` | `'clean-editorial'` (default: auto-detect de brand)
- `slideCount` — default 10
- `animationStyle` — `'fade'` | `'slideLeft'` | `'slideUp'` | `'zoom'` | `'rotate'` (default: fade)
- `includeVideo` — true/false, generar MP4 (default: true, requires Runway API)
- `includeMusic` — true/false, agregar música de fondo en MP4 (default: true)

## Pipeline interno (7 pasos, ~2-3 min end-to-end)

```
1. REFINAR            → prompt → tema + ángulo + audiencia + hook + objetivo
2. SCRIPT PINTEREST   → guion 10 slides con visualText + Pinterest patterns
3. DESIGN BRIEFS      → brief Canva por slide (paleta, tipografía, imagen, animación)
4. CAPTION + HASHTAGS → caption AIDA humanizado + 25-30 hashtags
5. COMPUTER USE       → abrir Canva → buscar templates por aesthetic → customizar slides
6. IMAGEN DOWNLOAD    → descargar siluetas/elementos de internet → subir a Canva
7. ANIMATION + EXPORT → generar CSS keyframes + exportar slides PNG → MP4 via Runway
```

Paralelizado donde posible (pasos 2-3-4 corren en paralelo; 5-6 en paralelo; 7 async).

## Output: `CarouselDesignerProPackage`

```ts
{
  id: string;
  originalPrompt: string;
  style: 'warm-organic' | 'bold-playful' | 'dark-premium' | 'clean-editorial';
  refinedBrief: { 
    refinedTopic, 
    angle, 
    audience, 
    hook, 
    promise, 
    keyTakeaway, 
    goal 
  };
  
  slides: [
    {
      slide: number;
      visualText: string;           // texto exacto para la slide
      designNotes: string;          // instrucciones de diseño
      wordCount: number;
      pinterestPattern: string;     // layout pattern (left-right, overlay, grid, asymmetrical)
      colorPalette: { primary, secondary, accent };
      typography: { headline, body, decorative };
      animation: {
        type: 'fade' | 'slideLeft' | 'slideUp' | 'zoom' | 'rotate';
        duration: number;            // ms
        delay: number;               // ms
        easing: 'ease-in' | 'ease-out' | 'ease-in-out';
      };
      imageUrl?: string;             // silueta/elemento descargado
      downloadedAssetId?: string;    // ID en Canva después de upload
      cssKeyframes: string;          // @keyframes para esta slide
    }
  ];
  
  animations: {
    css: string;                     // CSS completo con todos los keyframes
    timeline: Array<{ slideId, delay, duration, animation }>;
    totalDuration: number;           // segundos del video completo
  };
  
  caption: {
    full: string;                   // caption completo humanizado
    short: string;
    cta: string;
    formula: 'AIDA' | 'PAS';
    humanScore: number;
  };
  
  hashtags: {
    flat: string[];                 // 25-30 hashtags listos
    research: HashtagResearch;
  };
  
  exports: {
    htmlPreview: string;            // HTML5 completo con animaciones CSS
    slides: string[];               // [slide1.png, slide2.png, ...]
    mp4Url: string;                 // URL de descarga del video (Runway)
    cssFile: string;                // animations.css
    metadata: string;               // carousel.json
    zipUrl: string;                 // ZIP descargable con todo
  };
  
  aestheticScore: number;           // 0-100, qué tan Pinterest-like (evaluado por Visual QA)
  readyToPublish: boolean;          // true si aesthetic + animations validan correctamente
  totalProductionMinutes: number;
}
```

## Ejemplo de uso (API)

```bash
curl -X POST http://localhost:3000/api/skills/carousel-designer-pro/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "cómo crear carruseles virales en 2025",
    "brandId": "my-brand-123",
    "style": "bold-playful",
    "animationStyle": "slideLeft",
    "includeVideo": true
  }'
```

Respuesta: jobId. Luego polear status hasta completar.

```bash
GET http://localhost:3000/api/skills/carousel-designer-pro/status/[jobId]
```

Respuesta: `CarouselDesignerProPackage` completo con exports (HTML, PNGs, MP4, ZIP).

## Herramientas utilizadas

- **Claude API:** Scripting, art direction, caption generation (Opus para creatividad, Sonnet para análisis)
- **Computer Use:** Abrir Canva → buscar templates → customizar → exportar
- **Canva API:** Autofill templates, upload assets, export PNG/MP4
- **Image Downloader:** Descargar siluetas/elementos de URLs públicas (Pinterest, Unsplash, etc)
- **Animation Engine:** Generar CSS keyframes + timeline para MP4
- **Runway API:** Generar MP4 animado desde PNG slides
- **ffmpeg (fallback):** Si Runway no disponible, usar ffmpeg localmente

## Pinterest Aesthetic Integration

Todas las decisiones de diseño siguen patrones documentados en `CLAUDE.md`:

✓ **Typography:** Headlines 28-36px bold, body 14-18px, decorative 12-16px (never for main message)
✓ **Color Palettes:** Warm Organic, Bold Playful, Dark Premium, Clean Editorial (max 4 colors/slide)
✓ **Layouts:** Left-right split, full-bleed overlay, grid, asymmetrical (never centered-only)
✓ **Visual Elements:** Rounded 8-12px corners, subtle shadows, icons, illustrated siluetas
✓ **Motion:** Fade/slide/zoom transitions 400-500ms, typewriter/pop text, staggered animations
✓ **Anti-patterns:** No busy backgrounds, corporate fonts, poor contrast, excessive animation

## Recomendaciones automáticas

**Horario de publicación:** Deducido del goal y audience target.

**Formato de exportación:** 
- Para Instagram Feed: PNG slides (1080×1350) — usuario las sube manualmente
- Para Instagram Reels: MP4 (1080×1920, 15-60s) — listo para copiar-pegar
- HTML5: Preview interactivo para revisar animaciones antes de exportar video

**Descarga:** ZIP contiene:
```
carousel-2025-01-23/
├── slides/
│   ├── slide-01.png
│   ├── slide-02.png
│   └── ... (10 slides)
├── animations.css
├── animations.json
├── carousel.html (preview con CSS)
└── carousel.mp4
```

## Limitaciones & Fallbacks

- **Sin Runway API:** Fallback a ffmpeg (si disponible en servidor) o exportar PNG slides sin video
- **Sin Canva API:** Fallback a Computer Use (automation vía browser)
- **Imagen no descargable:** Usar placeholder + avisar usuario
- **Aesthetic validation falla:** Usar "Automatic Pinterest-fix" (retoque automático de colores, tipografía, layout)

## Ejemplos de output

Ver `/api/skills/carousel-designer-pro/examples` para galerías de carruseles generados por estilo + animación.

## Integración con FeedIA Brain

Carpenter Designer Pro respeta el "FeedIA Brain" — el system prompt del equipo AI:
- Community Manager: Copía & audiencia tone ✓
- Art Director: Pinterest aesthetics ✓
- Copywriter: Humanización de caption ✓
- Growth Strategist: Hashtag research + timing ✓
- Influencer: Trending hooks + angle ✓

Output es 100% listo para publicar, sin ajustes manuales necesarios.
