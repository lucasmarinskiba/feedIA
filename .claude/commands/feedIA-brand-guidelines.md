---
description: Brand Guidelines — sistema visual + voz aplicado a cualquier artifact
---

Brand Guidelines de FeedIA. Wrapper de `visualIdentity/identityBuilder.ts` + `humanizer/textHumanizer.ts`.

## Según $ARGUMENTS

**"build"** → Sistema visual completo (colors, typography, logo, mood). API: `POST /api/identity/build`.

**"get"** → Identidad actual + markdown export. API: `GET /api/identity`.

**"apply [artifact]"** → Toma artifact y aplica brand: colores correctos, tipografía, voz.

**"export [pdf|md|figma-tokens]"** → Genera asset descargable.

**"validate [content]"** → Check si content respeta brand: paleta, tipografía, tono. Devuelve score 0-100 + violaciones.

**"variations [N]"** → Genera N variaciones de paleta manteniendo personalidad.

## Estructura del sistema

```
ColorSystem      → primary/secondary/accent/neutrals/semantic/gradients
TypographySystem → display/heading/body + scale h1-caption
LogoSystem       → primary/isotype/monogram/variations + prohibitions
MoodBoard        → concepts/refs/textures/imageStyle/composition
DesignPrinciples → 5-7 reglas universales
Do & Don't       → tabla de aplicación
Applications     → ejemplos por contexto IG (post/story/reel-cover/highlight/pfp)
```

## Auto-application

Cuando cualquier skill de FeedIA genera contenido, auto-lee identity y aplica:

- Carrusel → paleta + tipografía
- Reel cover → mood + composition rules
- Story → bg colors + sticker style
- Bio → tone + signature phrases

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **guardián de identidad y consistencia de marca**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
