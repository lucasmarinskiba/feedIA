---
description: >
  Autopilot Routines — automatizaciones del cerebro de FeedIA que corren solas y reemplazan
  el trabajo diario de un equipo. Rutinas programadas: idear, producir, publicar, responder
  comunidad, analizar y ajustar — en bucle, con cost-cap y human-review opcional. Usá cuando
  se pida "ponelo en automático", "que trabaje solo", "rutina diaria/semanal", "autopilot",
  o para definir qué hace el sistema sin que se lo pidan.
---

# FeedIA · Autopilot Routines (el equipo que trabaja solo)

Convierte el cerebro en un equipo que opera en bucle: produce, publica, responde y aprende
sin intervención. Cada rutina se dispara por tiempo, métrica o evento (ver `/feedIA-brain-skills`).

## Rutinas estándar

| Cuándo          | Rutina                           | Skills que invoca                                           |
| --------------- | -------------------------------- | ----------------------------------------------------------- |
| Diario AM       | Ideación + plan del día          | `/feedIA-content-creator`, `/feedIA-calendar`               |
| Diario          | Producir pieza programada        | `/feedIA-canva`, `/feedIA-reel-generator`, `/feedIA-tiktok` |
| Por publicación | Publicar en mejor horario        | `/feedIA-publish-all`, `/feedIA-hashtag-science`            |
| Cada 30-60min   | Responder comunidad              | `/feedIA-community-manager`, `/feedIA-faq`                  |
| Tiempo real     | Vigilar tendencias / newsjacking | `/feedIA-curador`, `/feedIA-tiktok-research`                |
| Tiempo real     | Detectar y frenar crisis         | `/feedIA-crisis`                                            |
| Semanal         | Analizar + experimento + ajuste  | `/feedIA-growth-analyst`, `/feedIA-report`                  |
| Mensual         | Auditar perfil + estrategia      | `/feedIA-profile-optimizer`, `/feedIA-strategy`             |

## Disparadores

- **Tiempo**: daily / weekly / monthly.
- **Métrica baja**: una señal bajo threshold (ej. completion < X) dispara la skill que la mueve.
- **Evento**: trend-opportunity, pre-publish, crisis-trigger.

## Salvaguardas

- **Cost-cap** por ciclo (no runaway).
- **Human-review** opcional: acciones sensibles (publicar/responder) esperan aprobación si
  el modo es Asistente; en Auto ejecutan solas.
- **Freno de emergencia**: corta todo y pasa a Desactivado (top bar).
- **Memoria**: cada resultado alimenta aprendizaje (`/feedIA-learning`, `/feedIA-memory`).

## HERMANAS

`/feedIA-brain-skills` · `/feedIA-autonomy-v2` · `/feedIA-neural` · `/feedIA-agency-os` ·
`/feedIA-cu-brain` · `/feedIA-remote-control`.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **automatizaciones en bucle (idear→producir→publicar→responder→analizar→ajustar)**.
Algoritmo: cada rutina aplica la señal correcta por red (IG sends/saves, TikTok completion/FYP).
Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo
del usuario.
