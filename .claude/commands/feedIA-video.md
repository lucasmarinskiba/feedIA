---
description: Video — producción de video con IA (Runway, HeyGen, Veo, Sora, Kling, fal.ai)
---

Video skill para FeedIA. Combina `quickReel` + `reelStudio` + integrations.

## Según $ARGUMENTS

**"reel [prompt]"** → Reel completo. API: `POST /api/me/reel/full`.

**"avatar [script]"** → Talking-head con HeyGen avatar.

**"text-to-video [prompt]"** → Runway/Kling/Minimax → video puro IA desde texto.

**"image-to-video [image-url] [motion]"** → Anima imagen estática.

**"explainer [topic] [duration]"** → Video explainer: hook + 3 puntos + CTA.

**"product-demo [producto]"** → Demo product con screen capture + voiceover.

**"script [topic] [duration]"** → Solo guion (sin render). Para grabación humana.

**"variants [base]"** → 3 variantes del mismo concept con diferentes hooks.

## Providers por use case

| Use case               | Provider                | API key              |
| ---------------------- | ----------------------- | -------------------- |
| Talking head           | HeyGen                  | HEYGEN_API_KEY       |
| Text-to-video creativo | Runway Gen-3            | RUNWAY_API_KEY       |
| Photorealistic         | Kling                   | FAL_KEY (via fal.ai) |
| Anime/stylized         | Hailuo Minimax          | FAL_KEY              |
| Cinematic              | Veo 3 (Gemini)          | GOOGLE_API_KEY       |
| Cheapest fast          | Sora (futuro) / Hunyuan | varios               |
| Programmatic templated | Remotion                | npm package          |
| Stock + assembly       | Hyperframes             | HYPERFRAMES_KEY      |

## Templates de video listos

### 1. Reel viral (15-30s)

```
0-3s:   Hook visual + texto (scroll-stop)
3-12s:  3 puntos / 1 idea desarrollada
12-25s: CTA + transición
25-30s: Outro + handle
```

### 2. Explainer (60-90s)

```
0-5s:   Pain point (relatable)
5-15s:  Problema amplificado
15-50s: Solución paso a paso
50-80s: Beneficios + social proof
80-90s: CTA específico
```

### 3. Product demo (30-60s)

```
0-5s:   "Si X, mirá esto"
5-25s:  Demo screen capture
25-50s: Resultado + caso uso
50-60s: CTA + link bio
```

### 4. Talking head (15-60s)

```
0-3s:   Hook directo a cámara
3-30s:  Argumento principal
30-50s: Ejemplo concreto
50-60s: CTA verbal
```

## Settings por platform

| Platform      | Aspect     | Duration | Audio                 |
| ------------- | ---------- | -------- | --------------------- |
| IG Reel       | 9:16       | 15-90s   | música trending OK    |
| IG Feed       | 1:1 o 4:5  | 3-60s    | música original       |
| YouTube Short | 9:16       | 15-60s   | música YT library     |
| TikTok        | 9:16       | 15-180s  | música TikTok library |
| Twitter/X     | 16:9       | 30-140s  | sonido propio         |
| LinkedIn      | 16:9 o 1:1 | 30-180s  | sin música o sutil    |

## Costos estimados

| Provider      | $/segundo                         |
| ------------- | --------------------------------- |
| HeyGen avatar | $0.10-0.50/s                      |
| Runway Gen-3  | $0.05/s (Turbo) - $0.40/s (Alpha) |
| Kling (fal)   | $0.10-0.30/s                      |
| Minimax (fal) | $0.05-0.20/s                      |
| Veo 3         | $0.50-1.00/s                      |

Para reel 30s típico: **$1.50 - $15** según provider.

## Endpoint

```
POST /api/me/reel/full        → end-to-end
GET  /api/me/reel/capabilities → qué providers están configurados
POST /api/me/batch/reel        → batch hasta 5 reels paralelo
```

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **generador de video IA (Sora/Seedance/Pika/Kling)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
