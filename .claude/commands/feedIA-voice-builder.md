---
description: Voice Builder — perfil de voz personalizado desde entrevista + samples
---

Voice Builder para FeedIA. Extiende `humanizer.buildStyleGuide()`.

## Según $ARGUMENTS

**"build [samples-paths]"** → Construye voice profile desde 3-5 samples de writing.

**"interview"** → Inicia entrevista 8 preguntas para extraer voz.

**"test [content]"** → Re-escribe content en la voz del usuario.

**"compare [old] [new]"** → Side-by-side voice consistency.

**"export"** → Genera `about-me.md` + `voice.md` para uso por otras skills.

**"refresh"** → Actualiza voice profile con samples nuevos.

## Workflow

### 1. Entrevista (8 preguntas)

```
1. ¿Quién sos? (1 oración elevator pitch)
2. ¿De qué hablás? (3 temas principales)
3. ¿Quién es tu audiencia? (persona)
4. ¿Qué NO querés sonar? (tono opuesto)
5. ¿Palabra/frase que NUNCA usás?
6. ¿Frase/expresión que SIEMPRE usás?
7. ¿Humor? (sí/no, qué tipo)
8. ¿Cuánta vulnerabilidad? (escala 1-10)
```

### 2. Samples analysis

Pasa 3-5 piezas de writing reales del usuario:

- Captions IG
- LinkedIn posts
- Newsletter
- Tweets
- Blog posts

### 3. Extracción

Claude analiza patrones:

- Length promedio de frases
- Vocabulario único (palabras frecuentes vs vocabulario general)
- Sintaxis (fragmentos, paréntesis, etc)
- Punctuación (cómo usa puntos suspensivos, exclamaciones)
- Estructura (intro-body-cierre vs stream of consciousness)
- Humor signature
- Frases-firma

### 4. Output: 2 archivos

**`about-me.md`** — quién es la persona/marca, qué la hace única.

**`voice.md`** — guía operacional:

```markdown
# Voice Guide

## Tone

[primary tone + secondary]

## Vocabulary

### Use

- palabra1, palabra2

### Avoid

- AI-words, palabras corporativas

### Signature phrases

- "frase X"
- "fórmula Y"

## Sentence style

- Average length: 12 words
- Uses contractions: yes
- Uses humor: subtle/none
- Punctuation: standard / liberal with ! / loves ...

## Structure

- Opening: question OR statement
- Body: 1 idea per paragraph
- Closing: actionable CTA / reflection

## Examples

[3 examples antes/después del rewrite]
```

## Integración

Todas las skills generadoras de texto leen `voice.md`:

- `aidaCopywriter` → aplica vocabulary preferred/avoided
- `humanizer` → usa signature phrases
- `reelStudio` → narración en la voz del user
- `quickCarousel` → captions en su voz

Sin voice.md → cae a `brand.voice` del BrandProfile (default).

## Endpoint

```
POST /api/voice/build         { samples: [{ text }, ...], interview: {...} }
GET  /api/voice               → voice.md actual
POST /api/voice/test          { content } → rewrite en su voz
```

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **constructor de voz/tono de marca**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
