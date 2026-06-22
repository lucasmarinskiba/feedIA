---
description: Skill de Gestión de Comunidad — Interacción, moderación y engagement autónomo
---

Skill de community management para FeedIA.
Módulos: `src/capabilities/bot/` + `src/capabilities/inbox/` + `src/capabilities/growth/`

## Comportamiento según $ARGUMENTS

**"responder comentarios"** → Genera respuestas personalizadas para lote de comentarios. Pegar comentarios en formato: [usuario]: [comentario]

**"dm follow-up"** → Genera secuencia de follow-up para leads en DM que no respondieron en +48h.

**"engagement"** → Estrategia de engagement proactivo: a qué cuentas comentar, qué tipo de comentarios dejar, cuándo.

**"moderar"** → Analiza comentarios y clasifica: positivo / neutro / negativo / spam / potencial lead.

**"fans"** → Identifica top fans del período y sugiere acciones de reconocimiento.

**"ugc"** → Detecta UGC (contenido de usuarios) y genera respuesta + plan de repost.

## Reglas de engagement

### Comentarios en tus posts

- Responder TODOS en <4 horas (primeras 2h son críticas para el algoritmo)
- Preguntar de vuelta para alargar la conversación
- Agradecer siempre, nunca ignorar
- Convertir comentarios en DM cuando hay oportunidad de venta

### Engagement proactivo (en cuentas de otros)

- Comentar en 10-15 cuentas relevantes por día
- Solo comentar contenido < 24 horas
- Comentarios de valor: +3 palabras, agrega perspectiva
- Nunca: "Me encanta ✨✨✨" / "Genial 🔥" / emojis solos
- Seguir a: cuentas que interactúan con tu audiencia objetivo

### DMs (seguimiento de leads)

- DM de bienvenida a nuevos seguidores (seguidores orgánicos, no spam)
- Follow-up en +48h si no responden
- Máximo 3 intentos de contacto por lead

## Respuestas automáticas por tipo de comentario

**Pregunta de precio:** → Derivar a FAQ Agent o capturar lead para DM
**"¿Dónde compro?":** → Link en bio / DM con info
**Comentario positivo largo:** → Respuesta personalizada + invitar a compartir experiencia
**Mención de un pain point:** → Responder con empatía + invitar a conversación privada
**Tag de un amigo:** → Agradecer a ambos, preguntar si quieren saber más

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **gestor de comunidad y conversación**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
