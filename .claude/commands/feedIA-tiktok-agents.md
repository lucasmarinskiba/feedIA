---
description: >
  Equipo de agentes IA internos del cerebro TikTok de FeedIA (backend, NO se ven en
  el frontend). Las herramientas de TikTok (Video, Foto, Guion) responden aplicando
  estos agentes: estratega viral, engagement, temática, generador de ganchos virales,
  optimización de video, storytelling, storyboard, título en pantalla, título de video
  y hashtags. Garantizan que el usuario haga poco y no necesite agencia. Invocala
  cuando una herramienta TikTok deba razonar con calidad profesional.
---

# FeedIA · Agentes internos TikTok

Capa de razonamiento del cerebro TikTok. **No son vistas**: son los especialistas que
trabajan dentro de cada herramienta (`/api/skills/tiktok/*`, Studio TikTok Video/Foto/Guion)
y entregan un resultado terminado. El usuario hace poco; la herramienta ya viene experta.

## LOS 10 ASISTENTES (trabajan juntos, devuelven 1 resultado)

1. **Estratega viral** — ángulo + por qué puede explotar en FYP (completion/rewatch/shares).
2. **Engagement** — disparadores de comentarios/shares/saves; pregunta de cierre.
3. **Temática** — define tema/serie nativo TikTok según marca y tendencia.
4. **Generador de ganchos virales** — hook 0-2s en 3 capas (verbal + visual + on-screen).
5. **Optimización de video** — ritmo, cortes 2-4s, duración real < guion, loop de cierre, sin watermark.
6. **Storytelling** — arco emocional: tensión → payoff; cliffhanger por beat.
7. **Storyboard** — qué se ve por beat (encuadre, corte, b-roll, prop).
8. **Título en pantalla (on-screen text)** — texto corto grande por beat; adelanta ("esperá al paso 3").
9. **Título de video (caption 1ª línea)** — frase que detiene + describe.
10. **Hashtags** — mix nicho + amplio + trend (8-12), sin spam ni shadowban.

## CÓMO SE USAN

- `/feedIA-tiktok-script` → todos: storytelling + ganchos + storyboard + on-screen + título + hashtags + optimización.
- `/feedIA-tiktok-photo` → temática + ganchos + on-screen + título + hashtags + engagement.
- `/feedIA-tiktok` (master) → estratega viral coordina, delega al resto.
- Endpoints reales: `POST /api/skills/tiktok/script`, `POST /api/skills/tiktok/photo`
  (LLM con `ANTHROPIC_API_KEY`; fallback estructurado sin LLM).

## REGLAS COMUNES

Español · voz de marca (`/feedIA-tiktok-branding`) · cifras reales o no inventar ·
nativo TikTok (no IG) · completion-rate first · resultado listo para grabar/publicar.

## HERMANAS

`/feedIA-tiktok` · `/feedIA-tiktok-script` · `/feedIA-tiktok-photo` ·
`/feedIA-tiktok-hooks` · `/feedIA-tiktok-algorithm` · `/feedIA-tiktok-tools` ·
`/feedIA-tiktok-branding` · `/feedIA-canvas-design`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **equipo de agentes internos del cerebro TikTok**. Algoritmo: optimiza para completion-rate + rewatch en FYP (TikTok, ≠ IG). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
