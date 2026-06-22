# Agente IA — Especialista Instagram

![CI](https://github.com/lucasdmarin/agente-ia-instagram/actions/workflows/ci.yml/badge.svg)

Agente CMO autónomo para Instagram. Estrategia, creación de contenido (Reels, carruseles, stories, captions, faceless), análisis, crecimiento, gestión de comunidad, inbox y operación. El objetivo es liberar al usuario de subir contenido manualmente, pendiente de horarios, comentarios y DMs — sin caer en spam ni en clickbait.

Construido sobre Claude (Opus 4.7) con tool use, TypeScript estricto y arquitectura modular por capacidad.

## Estructura

```
src/
├── agent/              # Cerebro: orquestador con tool use, cliente Claude, memoria, logger
├── capabilities/
│   ├── strategy/       # PROMPT 1 (nicho saturado) + PROMPT 5 (posicionamiento elegante/directa/premium)
│   ├── copywriting/    # PROMPT 2 (15 ganchos) + PROMPT 4 (retención)
│   ├── content/        # Carrusel, Reel, Stories, Caption, Faceless triple (PROMPT 3)
│   ├── trends/         # Scout multiplataforma + validación de ángulos
│   ├── retention/      # Hook engineering avanzado con triggers psicológicos
│   ├── growth/         # Cuentas faro, fan nurturing, prospección en comentarios ajenos
│   ├── inbox/          # Triage DMs, calificación de leads, sync a CRM
│   ├── reputation/     # Moderación + sentiment + alertas de crisis
│   ├── ops/            # A/B testing post-publicación, reciclaje evergreen, planificador semanal
│   ├── bot/            # Bot conversacional: memoria por usuario + rails + auto-reply contextual + runner
│   ├── analytics/      # Snapshot de insights, detección de anomalías, reporte semanal accionable
│   ├── hashtags/       # Research por tier, rotación con cooldown, audit de baneados
│   ├── competitors/    # Monitor + detección de virales + comparación de benchmark
│   ├── repurposing/    # Blog/video/podcast → carruseles + reels + stories + captions automáticos
│   ├── ugc/            # Detector + flow de permiso de repost con persistencia de estado
│   ├── pipelines/      # End-to-end: brief-to-publish y autopilot semanal completo
│   ├── crisis/         # Sub-agente autónomo Crisis Manager
│   ├── experiments/    # Sub-agente Growth Experiments (diseña, lanza, cierra con aprendizaje)
│   ├── curator/        # Sub-agente Content Curator (RSS/URLs → backlog auto-evaluado)
│   ├── safety/         # Auditor pre-publicación (políticas deterministas + LLM)
│   ├── profile/        # Optimizador de bio + pinneados + highlights
│   ├── nurture/        # Welcome y DM nurture sequences con persistencia de enrollments
│   ├── localization/   # Adaptación multi-mercado culturalmente sensible
│   ├── digest/         # Daily digest consolidado de todos los módulos
│   ├── collab/         # Sub-agente Collab Manager (creadores, outreach, negociación)
│   └── arc/            # Sub-agente Story Arc (narrativa multi-día con callbacks)
├── integrations/       # Meta API, Insights API, Make/n8n/Zapier, Notion CRM, Canva, notificaciones, iCal
├── scheduler/          # node-cron jobs (digest, curator, nurture, bot-poll, autopilot)
├── server/             # HTTP server (Node built-in) + Meta webhook + dashboard estático
│   └── static/         # Dashboard SPA en HTML+CSS+JS vanilla
├── config/             # Brand profile + carga de env
└── cli.ts              # Entrada CLI
```

## Setup

### Opción rápida: Docker Compose (recomendado)

```bash
cp .env.local.example .env.local
make supabase-up
make dev
```

Esto levanta Postgres 15, Redis y Mailpit. La app corre en `http://localhost:7321`.

### Opción manual: Node local

1. **Instalar dependencias:**

   ```bash
   npm install
   ```

2. **Configurar entorno:**

   ```bash
   cp .env.example .env
   ```

   Mínimo necesario: `ANTHROPIC_API_KEY`. El resto activa integraciones reales (publicar, sincronizar CRM, etc.). En `DRY_RUN=true` (default) nada se publica.

3. **Configurar perfil de marca:**
   ```bash
   cp data/brand.example.json data/brand.json
   ```
   Editá `data/brand.json` con tu nicho, audiencia, voz, paleta y objetivos. Esto alimenta TODOS los prompts del agente.

### Comandos comunes (Makefile)

| Comando        | Descripción                      |
| -------------- | -------------------------------- |
| `make dev`     | Levanta el daemon local.         |
| `make test`    | Corre tests unitarios.           |
| `make verify`  | Lint + typecheck + build + test. |
| `make format`  | Formatea con Prettier.           |
| `make workers` | Levanta workers localmente.      |
| `make backup`  | Backup de Supabase production.   |

Para más detalles, ver [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Uso

### Modo autónomo (recomendado)

```bash
npm run agent -- "planificá la semana completa con 5 posts y 4 stories diarias"
npm run agent -- "necesito 3 reels faceless para esta semana sobre automatización"
npm run agent -- "moderá los últimos 50 comentarios y respondé los DMs urgentes"
```

Claude decide qué herramientas usar y en qué orden. Revisá el resumen al final y los artefactos en `output/`.

### Comandos directos por capacidad

```bash
# Estrategia
npm run dev nicho --objetivo=leads
npm run dev posicionar --texto="Vendemos automatizaciones que..."

# Copywriting
npm run dev hooks --idea="Por qué tu agencia de marketing no escala"
npm run dev retencion --texto="Pegá acá tu copy para optimizar"

# Contenido
npm run dev carrusel --idea="5 errores al automatizar con IA" --longitud=medio
npm run dev reel --tema="Cómo recuperar 10 horas a la semana" --duracion=30
npm run dev stories --evento="lanzamiento del nuevo workflow" --cantidad=5
npm run dev caption --contexto="reel sobre automatización" --formato=reel
npm run dev faceless --idea="Por qué tu IA actual no rinde"

# Tendencias
npm run dev tendencias
npm run dev validar --angulos="contrarian sobre IA|caso real fracaso|comparativa stack"

# Retención avanzada
npm run dev hook-engineering --ejemplos="Hook 1...|Hook 2...|Hook 3..."

# Operación
npm run dev plan-semana --ideas="error al automatizar::reel|caso ROI::carrusel|encuesta IA::historia"
```

Todos los comandos guardan el resultado en `output/` con timestamp.

## Capacidades implementadas

| Capacidad                           | Qué hace                                                                                                                       | Herramientas                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Estrategia**                      | Detecta patrones saturados, propone 10 ideas frescas, reposiciona contenido en 3 voces                                         | `analyze_nicho`, `reposicionar_contenido`                                            |
| **Copywriting**                     | 15 ganchos balanceados + ranking top 5; reescribe para retención y guardados                                                   | `generate_hooks`, `optimizar_retencion`                                              |
| **Contenido**                       | Carruseles, Reels (beat-by-beat), Stories interactivas, captions multivariante, faceless triple                                | 5 herramientas                                                                       |
| **Tendencias**                      | Scouting multiplataforma + filtro ético/marca                                                                                  | `scout_tendencias`, `validar_angulos`                                                |
| **Retención**                       | Hook engineering con triggers psicológicos (sorpresa/ego/miedo/deseo/curiosidad/pertenencia)                                   | `engineer_hooks`                                                                     |
| **Crecimiento**                     | Comentarios en cuentas faro, nurturing de fans, respuestas a comentarios ajenos                                                | 3 herramientas                                                                       |
| **Inbox**                           | Triage de DMs, calificación de leads, sync a Notion/HubSpot/Salesforce                                                         | 3 herramientas                                                                       |
| **Reputación**                      | Moderación de comentarios + análisis de sentimiento con alerta de crisis                                                       | 2 herramientas                                                                       |
| **Ops**                             | A/B testing 2h post-publicación, reciclaje evergreen, planificador semanal                                                     | 3 herramientas                                                                       |
| **Canva render**                    | Autofill de brand templates + export PNG/MP4 con polling de jobs (carrusel, reel, stories)                                     | `render_carrusel_canva`, `render_reel_canva`, `render_stories_canva`                 |
| **Bot conversacional**              | Memoria por usuario, rails de seguridad, intent + auto-reply contextual, runner con polling                                    | `bot_simular_entrada`, `bot_correr_una_vez`                                          |
| **Analytics**                       | Snapshot ventana, benchmarks, anomalías, reporte semanal con alerta automática                                                 | `analytics_snapshot`, `reporte_semanal`                                              |
| **Hashtags**                        | Research por tier (mega/grande/medio/nicho/marca), rotación con cooldown, audit de shadowbans                                  | `investigar_hashtags`, `pickear_hashtags`, `auditar_hashtags`                        |
| **Competidores**                    | Análisis de posts, detección de virales, comparación de benchmarks con jugadas concretas                                       | `analizar_competidores`, `comparar_con_competidores`                                 |
| **Repurposing**                     | Long-form (blog/video/podcast/paper) → carruseles + reels + stories + captions de un tirón                                     | `repurpose_long_form`                                                                |
| **UGC**                             | Evaluación de candidatos, registro persistente, flow de permiso por DM con estados                                             | `evaluar_ugc`, `ugc_solicitar_permiso`, `ugc_listar`                                 |
| **Notificaciones**                  | Slack y/o webhook genérico para crisis, reportes, leads y aprobaciones                                                         | `enviar_alerta`                                                                      |
| **Calendario**                      | Export iCal del plan semanal importable a Google Calendar / Outlook / Apple Calendar                                           | `exportar_calendario_ics`                                                            |
| **Pipelines**                       | `brief_to_publish` (idea → publicación) y `autopilot_semanal` (semana entera con un comando)                                   | `brief_to_publish`, `autopilot_semanal`                                              |
| **Crisis Manager (sub-agente)**     | Sub-agente autónomo: analiza comentarios, decide pausar publicaciones, escala, redacta respuesta pública                       | `crisis_check`, `crisis_estado`, `crisis_reanudar`                                   |
| **Growth Experiments (sub-agente)** | Diseña experimentos con métrica + umbral, los corre, los cierra con aprendizaje IA                                             | `experimentos_disenar`, `experimentos_lanzar`, `experimentos_completar`              |
| **Content Curator (sub-agente)**    | Registra fuentes (RSS/URL), hace fetch, evalúa relevancia, llena backlog con ideas derivadas                                   | `curator_add_source`, `curator_procesar_todas`, `curator_backlog`, `curator_aprobar` |
| **Brand safety auditor**            | Gate pre-publicación: políticas deterministas (regex) + revisión IA + versión segura sugerida                                  | `safety_audit` (integrado en `brief_to_publish`)                                     |
| **Profile optimizer**               | Audita bio + pinneados + highlights, propone 3 versiones de bio + estructura ideal con score                                   | `profile_optimizar`                                                                  |
| **Nurture sequences**               | Diseña y ejecuta secuencias de DM por trigger (nuevo seguidor, lead frío, etc.) con persistencia                               | `nurture_disenar`, `nurture_inscribir`, `nurture_ejecutar`, `nurture_listar`         |
| **Localización**                    | Adapta caption + hooks + CTA a múltiples mercados con sensibilidad cultural                                                    | `localizar_contenido`                                                                |
| **Daily digest**                    | Consolida estado de todos los módulos en un brief diario filtrado por relevancia                                               | `digest_diario`                                                                      |
| **Collab Manager (sub-agente)**     | Evalúa creadores, scoreaa alineación + riesgo, drafta outreach, gestiona negociación                                           | `collab_evaluar`, `collab_outreach`, `collab_responder_negociacion`                  |
| **Story Arc (sub-agente)**          | Convierte una semana de slots sueltos en arco narrativo con callbacks explícitos entre días                                    | `arc_disenar`, `arc_ajustar_beats`                                                   |
| **Scheduler (cron)**                | Ejecuta jobs en cron real (`node-cron`): digest diario, curator-fetch, nurture, bot-poll, autopilot semanal                    | `scheduler_listar_jobs`, `scheduler_correr_job`                                      |
| **Daemon (HTTP+webhook+dashboard)** | Un solo proceso: scheduler + dashboard web + webhook de Meta con verificación HMAC SHA-256                                     | `npm run dev daemon`                                                                 |
| **Compliance & Safety**             | Guardian pre-acción, rate limits, audit log, reglas de Instagram, alertas, emergency stop, auditoría periódica                 | `npm run dev compliance-status`                                                      |
| **Content Studio**                  | Producción multimedia con múltiples engines (Canva, CapCut, InShot, ImageGen, Adobe Express, Figma) con PipelineRunner         | `studio-render`, `recipe-run`                                                        |
| **Brand Aesthetic Engine**          | Guía de estilo evaluable, score de coherencia visual, Visual Director, moodboards                                              | `aesthetic-score`, `visual-director`                                                 |
| **Ethical & Common Sense**          | Responsabilidad con receptor, sentido común, inclusividad, accesibilidad                                                       | `ethical-check`                                                                      |
| **Recetas de Automatización**       | 10 recetas predefinidas extensibles (reel faceless, carrusel educativo, weekly package, etc.)                                  | `recipe-list`, `recipe-run`                                                          |
| **Agentes de Producción**           | 6 agentes especializados: Visual Director, Ethical Guardian, Content Assembler, Aesthetic Judge, Format Adapter, Asset Curator | vía agente autónomo                                                                  |

## Integraciones

| Sistema                                       | Estado                                                                          | Cómo activar                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Anthropic Claude**                          | ✅ Funcional                                                                    | `ANTHROPIC_API_KEY`                                                                 |
| **Meta Graph API** (publicar/DMs/comentarios) | 🟡 Stub con interfaz lista                                                      | Completar `META_*` y reemplazar lógica en `src/integrations/meta.ts`                |
| **Make / n8n / Zapier**                       | 🟡 Webhook genérico                                                             | `MAKE_WEBHOOK_URL` o equivalente                                                    |
| **Notion CRM**                                | ✅ Implementado                                                                 | `CRM_PROVIDER=notion` + `CRM_API_KEY` + `CRM_DATABASE_ID`                           |
| **HubSpot / Salesforce**                      | 🔴 Pendiente                                                                    | Agregar handlers en `src/integrations/crm.ts`                                       |
| **Canva Connect API**                         | ✅ Implementado (autofill + export con polling, OAuth refresh o token estático) | `CANVA_API_TOKEN` o `CANVA_CLIENT_ID/SECRET/REFRESH_TOKEN` + IDs de brand templates |
| **CapCut**                                    | 🟡 Stub + webhook a Make/n8n                                                    | `CAPCUT_WEBHOOK_URL` o `MAKE_WEBHOOK_URL` + flujo de UI automation                  |
| **InShot**                                    | 🟡 Stub + webhook a Make/n8n                                                    | `INSHOT_WEBHOOK_URL` o `MAKE_WEBHOOK_URL` + flujo mobile automation                 |
| **Adobe Express / Firefly**                   | 🟡 Stub estructurado                                                            | `ADOBE_CLIENT_ID/SECRET` (API en desarrollo)                                        |
| **Figma**                                     | 🟡 Stub estructurado                                                            | `FIGMA_API_TOKEN`                                                                   |
| **Veo / Zebracat / InVideo**                  | 🟡 Stub que escribe a disco                                                     | Reemplazar `renderArtifact` en `src/integrations/contentRender.ts`                  |

## Principios anti-burnout

- **DRY_RUN por default**: nada se publica sin que vos lo confirmes.
- **Sin clickbait**: el system prompt prohíbe explícitamente promesas vacías y palabras como "gurú", "secreto", "fórmula mágica" (configurable por marca).
- **Calidad > cantidad**: si Claude duda, el prompt lo fuerza a elegir calidad.
- **Acciones sensibles requieren humano**: leads grandes, crisis de comentarios, datos sensibles.
- **Voz de marca persistente**: cargada una vez en `data/brand.json` y aplicada a cada llamada.
- **Memoria local**: el histórico de performance vive en `data/runtime/memory.json` y alimenta decisiones futuras (mejores horarios, top performers para reciclar).

## Pipelines end-to-end

**Brief-to-publish** — idea → contenido + Canva render + caption + hashtags auditados → publicación o aprobación humana:

```bash
npm run dev brief --idea="5 errores al automatizar con IA" --formato=carrusel
npm run dev brief --idea="Cómo recuperar 10 horas semanales" --formato=reel --duracionReel=30 --scheduledAt=2026-05-12T14:00:00-03:00
```

Esto genera el contenido, lo renderiza en Canva con tu brand template, audita los hashtags, y según `DRY_RUN` y `requiereAprobacion`: o publica directo, o te manda alerta para revisar.

**Autopilot semanal** — un comando = una semana completa:

```bash
npm run dev autopilot
# o desde el agente autónomo:
npm run agent -- "corré el autopilot semanal y dejame todo pendiente de aprobación"
```

Hace: análisis de nicho → 7 ideas frescas → plan semanal con horarios → brief-to-publish por slot → export iCal → alerta resumen a Slack.

## Content Studio — Producción Multimedia

Sistema completo de producción de contenido que abstrae múltiples herramientas de creación como "engines" interoperables.

### Engines disponibles

| Engine            | Estado               | Formatos                | Cómo activar                                 |
| ----------------- | -------------------- | ----------------------- | -------------------------------------------- |
| **Canva**         | ✅ Funcional         | PNG, JPG, MP4, GIF, PDF | `CANVA_API_TOKEN` o OAuth + template IDs     |
| **ImageGen**      | ✅ Funcional         | PNG, JPG, WEBP          | `IMAGE_GEN_PROVIDER` + API key del proveedor |
| **CapCut**        | 🟡 Stub + webhook    | MP4                     | `MAKE_WEBHOOK_URL` + flujo de UI automation  |
| **InShot**        | 🟡 Stub + webhook    | MP4, PNG                | `MAKE_WEBHOOK_URL` + flujo mobile automation |
| **Adobe Express** | 🟡 Stub estructurado | PNG, JPG, MP4, PDF      | `ADOBE_CLIENT_ID/SECRET` (API en desarrollo) |
| **Figma**         | 🟡 Stub estructurado | PNG, SVG, PDF           | `FIGMA_API_TOKEN`                            |

### Recetas de automatización

Recetas predefinidas que orquestan engines + agentes en un solo comando:

```bash
npm run dev recipe-list                    # ver todas las recetas
npm run dev recipe-run --id=reel-faceless-tutorial --idea="Cómo automatizar tu agenda"
npm run dev recipe-run --id=weekly-content-package --idea="Productividad con IA"
npm run dev recipe-run --id=repurpose-blog-to-all --idea="Blog post" --params='{"texto":"contenido del blog"}'
```

**Recetas incluidas:**

1. `reel-faceless-tutorial` — guion + storyboard + assets IA + render
2. `carrusel-educativo` — research + slides + render Canva + caption
3. `story-sequence-launch` — secuencia de stories interactivas
4. `post-imagen-quote` — quote card con tipografía brand
5. `repurpose-blog-to-all` — blog → carrusel + reel + stories + post
6. `weekly-content-package` — 3 reels + 2 carruseles + 14 stories
7. `trending-audio-reel` — adapta audio trending a tu marca
8. `testimonial-to-carrusel` — testimonio → carrusel premium
9. `product-showcase-reel` — producto → reel con transiciones
10. `faq-faceless-triple` — 3 FAQs → 3 reels + carrusel resumen

### Brand Aesthetic Engine

Codifica la estética de tu marca en reglas evaluables:

```bash
npm run dev aesthetic-score --description="Carrusel de 5 slides sobre automatización, fondo oscuro, texto blanco, acento naranja" --colors="#0A0A0A,#F5F5F5,#FF5F1F"
```

Extiende `data/brand.json` con campos visuales: `mood`, `photographyStyle`, `compositionRules`, `allowedIconography`, `forbiddenIconography`, `density`, `imageTextRatio`.

### Ethical & Common Sense Layer

Validación de responsabilidad con el receptor antes de publicar:

```bash
npm run dev ethical-check --caption="Garantizado al 100% que vas a duplicar tus ventas" --hooks="El secreto que nadie te cuenta"
```

Detecta: promesas absolutas, FOMO tóxico, datos sin fuente, superlativos sin evidencia, lenguaje no inclusivo, consejos médicos/legales sin disclaimer.

### Agentes de Producción (6 especializados)

| Agente                | Rol                                               | Autonomía   |
| --------------------- | ------------------------------------------------- | ----------- |
| **Visual Director**   | Decide engine, template, assets, dirección visual | Checkpoint  |
| **Ethical Guardian**  | Valida responsabilidad y sentido común            | Assist only |
| **Content Assembler** | Orquesta pipeline end-to-end                      | Checkpoint  |
| **Aesthetic Judge**   | Evalúa coherencia visual vs brand guide           | Assist only |
| **Format Adapter**    | Adapta contenido a múltiples formatos             | Full        |
| **Asset Curator**     | Genera y cura assets visuales con IA              | Full        |

## Daemon (todo en un proceso)

Un solo comando arranca scheduler + HTTP server + dashboard web + webhook entrante de Meta:

```bash
npm run dev daemon
```

Esto inicia:

- **Cron real** con `node-cron`: `digest-diario` 8:30 AM, `curator-fetch` 7AM y 3PM, `nurture-ejecutar` cada 15 min, `bot-poll` cada minuto, `ugc-expirar` 9 AM, `autopilot-semanal` lunes 8 AM. Override por job en `data/runtime/scheduler-overrides.json`.
- **Dashboard web** en `http://localhost:7321` (puerto configurable con `DAEMON_PORT`). Tabs: Digest, Curator, UGC, Experimentos, Collab, Nurture, Conversaciones, Crisis, Scheduler. HTML + CSS + JS vanilla (sin build).
- **Webhook entrante de Meta** en `GET /webhook/meta` (verificación) y `POST /webhook/meta` (eventos). Verifica firma `X-Hub-Signature-256` con HMAC SHA-256 contra `META_APP_SECRET`. Cada DM/comentario/mención entrante se rutea automáticamente al bot conversacional. Si llegan ≥5 comentarios al mismo post, dispara crisis check async.

```bash
# Comandos sueltos del scheduler (para CI/scripts):
npm run dev scheduler-listar
npm run dev scheduler-run --job=digest-diario
npm run dev scheduler-runs --limit=20
npm run dev scheduler-start         # solo cron, sin HTTP
```

### Configurar webhook en Meta Developer Console

1. Apuntá Meta Webhooks (`Instagram` y `Pages`) a `https://tu-dominio.com/webhook/meta`.
2. En "Verify Token" usá el mismo valor que `META_VERIFY_TOKEN` en tu `.env`.
3. Suscribite a los campos `comments`, `mentions`, `messages`.
4. Copiá tu App Secret a `META_APP_SECRET` para que el server valide la firma.

Para desarrollo local: usá `ngrok http 7321` (o Cloudflare Tunnel) y registrá la URL pública en Meta.

## Sub-agentes autónomos

A diferencia de las capacidades atómicas, los **sub-agentes** corren en loop con su propio set de herramientas y system prompt focalizado. Foundation: `src/agent/subagent.ts`.

### Crisis Manager

Sub-agente que protege reputación. Detecta pile-on, pausa publicaciones, redacta respuesta y escala a humano cuando hay riesgo legal/regulatorio.

```bash
npm run dev crisis-check --postId="abc123" --comentarios=path/to/comments.json
npm run dev crisis-estado
npm run dev crisis-reanudar
```

El `briefToPublish` consulta `isPausado()` antes de publicar — si hay crisis activa, todos los slots quedan bloqueados automáticamente.

### Growth Experiments

Diseña experimentos con UNA variable manipulada por experimento + métrica primaria + umbral de éxito. Persiste estado y al cerrarse genera "aprendizaje" reusable.

```bash
npm run dev exp-disenar --contexto="watch time bajó 20% en últimas 2 semanas" --cantidad=3
npm run dev exp-lanzar --id=exp-...
npm run dev exp-completar --id=exp-... --metricas=path/to/metrics.json
npm run dev exp-listar --status=corriendo
```

### Content Curator

Suscribite a fuentes (RSS, URLs, newsletters) → el sub-agente hace fetch → analiza relevancia con IA → llena backlog con ideas derivadas. Cero esfuerzo manual.

```bash
npm run dev curator-add --tipo=rss --nombre="HN Frontpage" --url="https://news.ycombinator.com/rss"
npm run dev curator-procesar
npm run dev curator-backlog --status=nuevo
npm run dev curator-aprobar --id=bk-...
```

### Collab Manager

Procesa observaciones de creadores → evalúa alineación + riesgo + motivación → score y borrador de outreach. Si veredicto es "avanzar", queda como prospect en estado `evaluado` listo para enviar DM con `collab-outreach`.

```bash
npm run dev collab-evaluar --observaciones=data/creators.json
npm run dev collab-outreach --id=pro-...
npm run dev collab-listar --status=outreach-enviado
```

Reglas built-in: nunca confirma precio en DM, deriva a humano si hay drama o demanda agresiva, máx 5 oraciones por respuesta, alineación ≥ 70 + riesgo bajo/medio para "avanzar".

### Story Arc

Convierte una semana de posts sueltos en un arco narrativo con UN tema central, callbacks explícitos entre días, setups y resoluciones. Los beats tienen rol narrativo (gancho-arco, tensión-creciente, callback, punto-medio, clímax, resolución, epílogo).

```bash
npm run dev arc-disenar --slots=output/autopilot-2026-05-09.json --contexto="lanzamiento del workflow"
```

`arc_ajustar_beats` además devuelve patches concretos (frases a insertar) para que los captions ya escritos encadenen como arco.

## Pre-publish brand safety

Cualquier `briefToPublish` ahora pasa por un **auditor pre-publicación** automático:

1. **Políticas deterministas (regex)**: detecta DNI/CUIT/tarjetas, promesas absolutas ("garantizado al 100%"), lenguaje gurú, controversia política, consejo médico/legal sin disclaimer, palabras prohibidas de tu marca.
2. **Revisión IA**: tono ofensivo en contexto, datos sin fuente que parecen stats, comparaciones difamatorias, riesgos de copyright.
3. **Veredicto**: `aprobado` | `cambios-menores` (devuelve versión segura) | `requiere-revision` | `bloqueado`.

Si el veredicto es `bloqueado` o `requiere-revision`, el brief **no se publica** aunque `DRY_RUN=false`. Se manda alerta a Slack para revisión humana.

```bash
npm run dev safety --caption="Comprá ahora con descuento garantizado del 100%" --hooks="No te lo pierdas"
```

## Profile optimizer

Auditá bio + pinneados + highlights y obtené propuesta concreta:

```bash
npm run dev profile-optimizar --snapshot=data/profile-snapshot.json
```

Devuelve 3 bios alternativas (directa/storytelling/minimalista), sugerencia de qué tipo + propósito tienen los 3 pinneados ideales, estructura óptima de highlights, y score actual vs esperado.

## Nurture sequences (DM automation)

Diseñá secuencias de mensajes directos para distintos triggers (nuevo seguidor, lead frío, cliente nuevo, reenganche 30 días, etc). El runner ejecuta los pasos pendientes y respeta cooldowns.

```bash
npm run dev nurture-disenar --trigger=nuevo-seguidor --pasos=4
npm run dev nurture-inscribir --user="@juana" --trigger=nuevo-seguidor
npm run dev nurture-ejecutar    # corre los pasos con esperaSegundos cumplidos
npm run dev nurture-listar --que=enrollments --status=activo
```

Reglas built-in: máximo 4 oraciones por mensaje, primer paso ≤5 min del trigger, posteriores espaciados por días, condición `sin-respuesta` para no spamear.

## Localización multi-mercado

Adaptá un mismo contenido a múltiples mercados sin traducir literal:

```bash
npm run dev localizar --contenido=data/contenido.json --mercados=data/mercados.json
```

Donde `mercados.json` define ajustes culturales y modismos a evitar. Detecta riesgos de traducción (frases que en otro mercado pueden sonar raras u ofensivas).

## Daily digest

Consolida el estado de los 16 módulos en un brief diario filtrado por relevancia:

```bash
npm run dev digest                  # construye y manda alerta a Slack
npm run dev digest --soloConstruir  # solo construye, no envía
```

Resumen ejecutivo (2-3 líneas), "cosas que requieren tu atención hoy" (acciones reales) y "corriendo solo" (módulos que están bien sin intervención — para sensación de control sin ruido).

## Render con Canva (autofill)

El agente conecta directo con [Canva Connect API](https://www.canva.dev/docs/connect/) usando tus brand templates:

1. Creá tus templates en Canva Pro con campos parametrizables (texto/imagen). Para un carrusel de 7 slides, declarar campos `titulo_1..titulo_7` y `cuerpo_1..cuerpo_7` + `hashtags`. Para reels: `hook_visual`, `texto_pantalla_1..8`, `broll_1..8`, `cta`, `audio_sugerido`. Para stories: `story_1..N`.
2. Copiá los IDs en `.env`: `CANVA_TEMPLATE_CARRUSEL`, `CANVA_TEMPLATE_REEL`, `CANVA_TEMPLATE_HISTORIA`.
3. Autenticá con token estático (`CANVA_API_TOKEN`) o OAuth refresh (`CANVA_CLIENT_ID` + `CANVA_CLIENT_SECRET` + `CANVA_REFRESH_TOKEN`). El cliente cachea y refresca solo.

```bash
npm run dev canva-carrusel --idea="5 errores al automatizar con IA"
npm run dev canva-reel --tema="Cómo recuperar 10 horas a la semana" --duracion=30
npm run dev canva-stories --evento="lanzamiento del workflow"
```

El runner hace autofill → polling del job (hasta 30 intentos cada 2s) → export → polling → URL del archivo final. En `DRY_RUN=true` simula todo y devuelve un design ID falso.

## Bot conversacional

Responde DMs y comentarios con contexto, memoria por usuario y rails estrictos.

**Cómo decide:**

1. **Rails de seguridad** (deterministas, no usan IA): bloquea si `BOT_AUTO_REPLY_ENABLED=false`, está en horario silencioso, el usuario fue escalado, superó el límite diario, o el mensaje matchea patrones sensibles (datos personales, precio cerrado, queja grave, amenaza, contrato).
2. **Clasificación de intent** vía Claude Sonnet 4.6 (rápido y barato): `saludo`, `pregunta-info`, `pregunta-soporte`, `pregunta-precio`, `feedback-positivo`, `feedback-negativo`, `colaboracion`, `spam`, `lead-caliente`, `troll`, `consulta-tecnica`, `fuera-de-tema`, `otro`.
3. **Whitelist de auto-reply**: solo `saludo`, `pregunta-info`, `feedback-positivo`, `consulta-tecnica` se responden solos. El resto se deriva a humano (incluso si rails dice OK).
4. **Confianza < `BOT_ESCALATE_THRESHOLD`** → siempre derivar a humano.
5. **Memoria persistente** en `data/runtime/conversations/{userId}.json` con últimos 30 turnos, intent history y conteo de auto-replies por día.

**Comandos:**

```bash
# QA antes de activar (siempre simula, no toca Meta)
npm run dev bot-simular --items='[{"remitente":"@juana","mensaje":"hola, vi su reel sobre n8n","canal":"dm"}]'

# Una iteración real (pide DMs/comentarios nuevos a Meta y procesa)
npm run dev bot-once

# Loop continuo (cada BOT_POLL_INTERVAL_SECONDS)
npm run dev bot-loop --iteraciones=10
npm run dev bot-loop                       # indefinido, Ctrl+C para detener

# Ver memoria de conversaciones
npm run dev bot-contextos
```

Activación real requiere `BOT_AUTO_REPLY_ENABLED=true` + `DRY_RUN=false` + Meta API configurada.

## Flujo "hands-off" sugerido

1. **Lunes (5 min)**: `npm run agent -- "planificá la semana, generá los carruseles con Canva y dejame las URLs para revisar"` → revisás los diseños.
2. **Aprobás o pedís cambios**: `npm run agent -- "el reel del miércoles más directo, regeneralo en Canva"`.
3. **Ejecución diaria**: con webhook a Make/n8n, los slots aprobados se publican solos vía Meta API oficial. El bot conversacional corre en paralelo: `npm run dev bot-loop`.
4. **Atención al cliente automática**: el bot responde saludos, preguntas generales y consultas técnicas claras. Todo lo demás se acumula en `bot-contextos` con `escaladoAHumano=true` para que vos lo veas.
5. **Domingo**: `npm run agent -- "reporte semanal: top performers, sentiment, leads calificados, conversaciones escaladas"`.

## Compliance y seguridad

El sistema incluye un **módulo de cumplimiento** que protege tus cuentas y las de tus clientes:

- **16 reglas de Instagram** basadas en los términos reales de Meta
- **Rate limits conservadores** por debajo de los oficiales
- **Audit log** de todas las acciones (90 días de retención)
- **Guardian pre-acción** que bloquea antes de ejecutar

### Comandos de compliance

```bash
npm run dev compliance-status              # estado del sistema
npm run dev compliance-rules               # listar 16 reglas implementadas
npm run dev compliance-check --texto="..." # verificar si un texto viola reglas
npm run dev compliance-rate-limits         # ver uso actual de rate limits
npm run dev compliance-audit [--limit=20]  # ver últimas entradas del audit log
npm run dev preflight                      # verificación completa antes de operar
npm run dev health-check                   # verificación de salud del sistema
npm run dev emergency-stop --razon="..."   # pausar TODAS las operaciones
npm run dev emergency-resume --resolucion="..." # reanudar operaciones
npm run dev auditoria-semanal              # reporte semanal de compliance
npm run dev auditoria-mensual              # reporte mensual de compliance
npm run dev auditoria-trimestral           # reporte trimestral de compliance
```

### Antes de operar en producción

1. Leer `TERMS_OF_SERVICE.md`
2. Leer `COMPLIANCE.md`
3. Configurar `COMPLIANCE_ACCEPTED_TERMS=true` en `.env`
4. Mantener `DRY_RUN=true` durante las primeras pruebas

> **No podemos garantizar 0% de riesgo de baneo** (nadie puede), pero sí garantizamos que el sistema no realizará acciones que sepamos que violan las reglas de Instagram.

## Convenciones (CLAUDE.md)

- TypeScript estricto, arrow functions, `const` por default.
- `npm run lint` antes de cada commit.
- Sin `any` salvo justificación documentada.
- Tipado explícito en parámetros y retornos.

## Deploy a producción

Ver [`README-DEPLOY.md`](README-DEPLOY.md) para el paso a paso completo:

- Supabase Postgres + RLS
- Upstash Redis TCP
- Vercel (frontend estático + serverless functions)
- Workers BullMQ en Render / Railway / Fly.io
- GitHub Actions CI/CD (lint, test, build, deploy, migraciones)
- Smoke tests post-deploy
- Seed del owner (`lucasdmarin@gmail.com`)
- Validación de entorno: `npm run validate:env`

Para operación y troubleshooting, ver [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## Próximos pasos sugeridos

- Conectar Meta Graph API real (oAuth + permisos `instagram_content_publish`, `instagram_manage_messages`, `pages_messaging`).
- Implementar handlers HubSpot y Salesforce en `crm.ts`.
- Agregar capa de scheduling persistente (BullMQ + Redis) para que el agente corra solo en cron.
- Tests con Vitest sobre cada capability (mockeando Claude).
- Dashboard web (Next.js) para revisar y aprobar el plan semanal sin tocar la consola.
