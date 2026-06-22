---
description: Broadcast Channels — IG Channels strategy para 1-to-many directo a notificaciones
---

IG Broadcast Channels = mensajes directos a TODA tu audiencia con notificación push. Bypass del algoritmo.

## Según $ARGUMENTS

**"setup [nombre]"** → Crea channel + estrategia inicial.

**"content-mix"** → Mix de tipos de broadcast: tip / sneak peek / poll / drop / behind-scenes.

**"schedule [semana]"** → Calendar semanal 3-5 broadcasts.

**"poll [topic]"** → Poll broadcast format (genera engagement masivo).

**"drop [oferta]"** → Drop broadcast: scarcity + urgency + link.

**"audience-test"** → Pre-test contenido en channel antes de publicar al feed.

## Por qué Channels matter

- **Notificación push** → 80-95% delivery rate (vs <30% en feed)
- **No algoritmo** → cada follower del channel recibe TODO
- **Engagement: ~40%** vs feed ~3-5%
- **Sense of exclusivity** → comunidad core
- **Audio messages OK** → voice notes íntimas

## Tipos de broadcast óptimos

### 1. Tip rápido (texto, 1-2 oraciones)

"Tip del día: para subir engagement de Reels, respondé el primer comentario en menos de 5 minutos. Boost algoritmo confirmado."

### 2. Sneak peek (foto/video)

Imagen + "Mañana sale algo que vas a amar. Pista: 👀"

### 3. Poll (interactivo)

"¿Qué tema querés que cubra esta semana?
A) Hashtags
B) Reels
C) Monetización"

### 4. Drop / lanzamiento (link + scarcity)

"🚨 LIVE en 1h. Voy a mostrar mi sistema para crear 30 carruseles/mes en 2 horas. Link: ..."

### 5. Behind-the-scenes (foto + texto)

"Esto es lo que NUNCA verías en mi feed. La caja oscura del día a día."

### 6. Audio note

30-90s voice note íntimo. Multiplica conexión emocional 5x.

## Cadencia óptima

- **3-5 broadcasts/semana** (max 1/día)
- **Mix**: 40% tips, 25% polls, 20% sneak peeks, 10% drops, 5% audio
- **Best times**: 8am, 12pm, 8pm (cuando notif tiene más visibility)

## Anti-patterns

- ❌ Broadcast diario → opt-outs masivos
- ❌ Solo links/ventas → channel pierde valor
- ❌ Mensajes largos > 200 palabras → no se leen
- ❌ Sin polls → desperdicia 80% del potencial
- ❌ Olvidarse del channel semanas → audiencia se duerme

## Métricas

- **View rate**: 80%+ es saludable
- **Reaction rate**: 15%+ engagement
- **Poll participation**: 25%+ es excelente
- **Channel growth**: 5%+ del seguidor base es bueno
- **Link CTR**: 8-12% (vs feed 1-2%)

## Integración

`POST /api/me/broadcast/send { type, content, scheduledFor? }` — envía via Meta API Channels endpoint (cuando soportado).

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **estratega de canales de difusión (relación directa)**. Algoritmo: optimiza para sends/saves y alcance de Reels en frío (Instagram). Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
