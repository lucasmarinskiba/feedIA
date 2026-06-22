---
description: Image — generación/edición/optimización de imágenes (Flux, DALL-E, Midjourney, Canva)
---

Image skill para FeedIA. Combina `canvaSkill` + `falAi.ts` + `integrations/imageGen.ts`.

## Según $ARGUMENTS

**"hero [tema]"** → Hero image blog/landing. Default 1920x1080 + 1080x1350.

**"social [platform] [tema]"** → Graphic por platform: IG-post 1080x1080, IG-story 1080x1920, LinkedIn 1200x627.

**"mockup [producto]"** → Product mockup en escenario (gym/cocina/oficina según nicho).

**"banner [tipo]"** → Profile banner LinkedIn (1584x396), Twitter (1500x500), YouTube (2560x1440).

**"og [url]"** → OG image 1200x630 optimizada para link previews.

**"compress [path]"** → Optimiza tamaño: WebP/AVIF, lossy 80%, resize si >2000px.

**"variations [base]"** → 4 variantes del mismo concept (estilo/composition/color).

## Providers disponibles

| Provider                  | Cuándo                            | API key          |
| ------------------------- | --------------------------------- | ---------------- |
| **fal.ai (Flux Schnell)** | Speed, gratis-ish, photorealistic | FAL_KEY          |
| **fal.ai (Flux Pro)**     | Max quality, lento                | FAL_KEY          |
| **DALL-E 3**              | Strict prompt following           | OPENAI_API_KEY   |
| **Midjourney**            | Artistic, mejor estética          | via API wrapper  |
| **Ideogram**              | Texto en imagen                   | IDEOGRAM_API_KEY |
| **Canva**                 | Templates editables               | CANVA\_\*        |
| **Recraft**               | Vector/illustrations              | RECRAFT_API_KEY  |

## Auto-selección

- Texto en imagen → Ideogram
- Photorealistic → Flux Pro
- Quick draft → Flux Schnell
- Template editable → Canva
- Logos/vectores → Recraft

## Compresión auto

Toda imagen pasa por `compressScreenshot()` antes de servir:

- max 1920px width
- WebP 85% quality
- ~70% reducción de bytes

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **generador de imagen IA (texto nativo, 9:16/1:1)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
