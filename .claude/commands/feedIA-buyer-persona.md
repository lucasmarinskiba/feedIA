---
description: Skill de Auditoría de Cuenta y Buyer Persona — Análisis de audiencia e historial
---

Skill de auditoría e investigación de audiencia para FeedIA.
Módulos: `src/capabilities/buyerPersona/buyerPersonaBuilder.ts`

## Comportamiento según $ARGUMENTS

**"auditar"** → Ejecuta `auditAccount(brand, posts)`. Solicita CSV o JSON de publicaciones.
Detecta: temas que funcionan, formatos top, voz actual de la marca, inconsistencias, oportunidades.

**"persona"** → Ejecuta `buildBuyerPersonas(brand, audit, 2)`. Construye 2 buyer personas en profundidad.

**"ideas [nombre-persona]"** → `generatePersonaContent(brand, persona, 5)` — 5 ideas de contenido específicas para esa persona.

**"completo"** → Ejecuta flujo completo: auditoría → personas → ideas de contenido para cada persona.

## Estructura del Buyer Persona que genera FeedIA

Para cada persona incluye:

- **Demografía:** edad, género, ubicación, ingreso, ocupación
- **Psicografía:** valores, estilo de vida, rasgos de personalidad
- **Dolores específicos:** 3 pain points concretos
- **Deseos:** qué sueña lograr
- **Miedos:** qué frena la compra
- **Comportamiento digital:** plataformas, horas activas, qué consume
- **Triggers de compra:** qué la hace decidir
- **Objeciones:** por qué NO compraría
- **Ángulo de mensajería:** cómo hablarle exactamente
- **5 ideas de contenido específicas para esta persona**
- **CTA que más le resuena**

## Formato de input para auditoría

Para subir historial de posts, usar CSV con columnas:
`date, format, topic, caption, likes, comments, saves, reach, engagement_rate`

O JSON con la misma estructura.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **analista de audiencia y buyer persona accionable**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
