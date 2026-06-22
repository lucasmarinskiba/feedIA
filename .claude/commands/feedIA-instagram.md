---
description: Instagram Skill — DMs, inbox, mensajes, automatización IG via API
---

Instagram skill para FeedIA. Wrapper de `inbox/*` + `bot/*` + `browserOperators/instagram/`.

## Según $ARGUMENTS

**"send [@user] [msg]"** → Envía DM. API: `POST /api/inbox/send`.

**"reply [thread_id] [msg]"** → Responde thread existente.

**"unsend [msg_id]"** → Borra mensaje enviado.

**"inbox"** → Lista threads unread + last message. API: `GET /api/inbox/threads`.

**"thread [id]"** → Conversación completa de un thread.

**"broadcast [audiencia]"** → Mensaje masivo a segmento (followers/fans/leads).

**"auto-reply [trigger] [response]"** → Configura auto-reply para keyword.

**"comment [post_id] [text]"** → Comenta en post propio o ajeno.

**"like [post_url]"** → Like a post.

**"follow [@user]"** → Seguir cuenta (respeta rate limits del safetyController).

**"unfollow [@user]"** → Dejar de seguir.

**"story [url]"** → Reacciona a story.

## Rate limits respetados

```ts
RATE_LIMITS = {
  postsPerDay: 4,
  storiesPerDay: 10,
  dmPerHour: 20,
  commentsPerHour: 30,
  followsPerDay: 50,
  unfollowsPerDay: 50,
};
```

`safetyController.checkActionSafety()` chequea antes de cada acción.

## Modes de operación

1. **API oficial** (recomendado) — UPLOAD_POST_KEY + META_ACCESS_TOKEN
2. **Browser automation** (fallback) — `browserOperators/instagram/` + Playwright. Más frágil, no oficial.

Auto-detect según env disponibles.

## Inbox triage

`inbox/triage.ts` clasifica DMs entrantes:

- `lead-caliente` → DM rápido + leads CRM
- `pregunta-FAQ` → respuesta auto via `faqAgent`
- `spam` → ignore
- `comunidad` → response amistosa
- `crisis` → escalada humano

## Eventos webhook

`POST /api/webhooks/meta` recibe events de Meta:

- `messages` → nuevo DM
- `comments` → nuevo comentario
- `mentions` → mención en story/post
- `live_comments` → comentario en live

Cada uno dispara handler en `inbox/` que decide auto-reply vs escalada.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **experto integral del algoritmo y producto Instagram**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
