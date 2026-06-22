---
description: Remote Control — control remoto del agente CU via API/CLI/Webhook
---

Remote Control de FeedIA. Cualquier cliente externo controla el agente.

## Según $ARGUMENTS

**"trigger [task]"** → Ejecuta task remoto. API: `POST /api/remote/trigger`.

**"status"** → Estado actual: sesiones activas, queue, last actions.

**"cancel [sessionId]"** → Frena sesión específica.

**"webhook [url]"** → Registra webhook URL que recibe events del agente.

**"schedule [cron] [task]"** → Programa task recurrente.

**"sse [sessionId]"** → SSE stream de events en tiempo real.

## Endpoints

```
POST /api/remote/trigger          → ejecuta task
  body: { task: 'publish-carousel'|'send-dm'|'reply-comments'|'analyze-account', params }

GET  /api/remote/status            → status global
GET  /api/remote/sessions          → lista sesiones activas
POST /api/cu/cancel/:sessionId     → cancel sesión
GET  /api/cu/watchdog/active       → watchdogs activos
POST /api/remote/webhook           → register callback URL
DELETE /api/remote/webhook/:id     → unregister
GET  /ws/cu/:sessionId             → SSE stream
```

## Tasks remotos soportados

| Task                  | Params                            |
| --------------------- | --------------------------------- |
| `publish-carousel`    | { prompt, slideCount?, publish? } |
| `publish-reel`        | { prompt, duration?, publish? }   |
| `publish-story`       | { prompt, frameCount?, publish? } |
| `send-dm`             | { handle, message }               |
| `reply-comments`      | { postId, count? }                |
| `analyze-account`     | { handle }                        |
| `analyze-competitors` | { handles[] }                     |
| `detect-trends`       | {}                                |
| `generate-report`     | { period: 'YYYY-MM' }             |
| `run-cu-instruction`  | { instruction, baseUrl? }         |

## Webhook payload

Cuando un task completa, FeedIA POSTea al webhook registrado:

```json
{
  "event": "task.completed" | "task.failed" | "task.progress",
  "taskId": "task-1234",
  "type": "publish-carousel",
  "result": { ...task-specific },
  "timestamp": "2026-...",
  "duration_ms": 4521,
  "tokenUsage": { input, output, cacheRead, costUsd }
}
```

## Auth

Todos los endpoints requieren header:

```
X-Remote-Token: <REMOTE_API_TOKEN env>
```

O cookie de session válida (cookie auth ya existente).

## Use cases

- **Zapier/Make** integration → trigger desde otro app
- **Cron externo** → ejecutar diario sin scheduler interno
- **Slack bot** → `/feedia publish [prompt]` desde Slack
- **Mobile app** → control desde celular sin abrir webapp
- **CI/CD** → publicar release notes auto a IG

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **control remoto del cerebro y sus acciones**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
