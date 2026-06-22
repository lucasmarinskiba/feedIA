---
description: Skill de Copywriting Persuasivo — AIDA, PAS, carruseles, captions y hooks
---

Skill de redacción persuasiva para FeedIA. Módulo: `src/capabilities/aidaCopywriter/aidaCopywriter.ts`

## Fórmulas disponibles

### AIDA (Atención → Interés → Deseo → Acción)

Usa `generateAIDACopy()`. Ideal para: posts de venta, anuncios, lanzamientos.

### PAS (Problema → Agitación → Solución)

Usa `generatePASCopy()`. Ideal para: contenido de pain points, servicios, coaching.

### Variantes A/B

Usa `generateCopyVariants()` para obtener AIDA + PAS + 5 hooks alternativos simultáneamente.

## Comportamiento según $ARGUMENTS

**"caption"** → Caption de Instagram. Formato: caption-instagram. Máx 2200 chars.
**"carrusel"** → Guión de carrusel con `generateCarouselScript()`. Solicita: tema, N° slides.
**"slide"** → Texto para slide individual. Máx 25 palabras. Una sola idea.
**"anuncio"** → Ad copy Meta Ads. Formato: ad-copy. Máx 125 chars.
**"bio"** → Reescritura de bio de Instagram. Máx 150 chars. Incluir: quién eres, a quién ayudas, CTA.
**"hook"** → Genera 10 ganchos de apertura para un tema específico.
**"cta"** → Genera 5 CTAs específicos y urgentes para la situación dada.

## Reglas de oro (se aplican SIEMPRE)

- **Prohibido:** "en el vasto mundo", "fascinante", "revolucionario", "del mismo modo", "cabe destacar"
- **Prohibido:** Abrir con "Hoy te traigo", "¿Sabías que?", "Es hora de"
- Cada frase gana su lugar — sin relleno
- Primera oración = gancho de detener el scroll
- CTA siempre específico: "Comenta TU PALABRA para recibir X" / "Guarda este post" / "Comparte si conoces a alguien que..."
- Máx. 3 emojis por caption (a menos que la guía de estilo indique otro límite)

## Humanización automática

Después de generar copy, pasa el resultado por `textHumanizer.ts` si el score de IA es > 60.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **copywriter persuasivo (AIDA/PAS, hooks, CTA)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
