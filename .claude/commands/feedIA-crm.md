---
description: Skill de CRM y Seguimiento Comercial — Pipeline, leads, automatizaciones de ventas
---

Skill de CRM y ventas para FeedIA.
Módulos: `src/capabilities/inbox/crmSync.ts` + `src/capabilities/sales/attribution.ts` + `src/capabilities/ads/metaAds.ts`

## Comportamiento según $ARGUMENTS

**"pipeline"** → Muestra estado actual del pipeline comercial por etapas.

**"leads"** → Lista de leads capturados desde Instagram (DMs, comentarios, link en bio).

**"seguimiento [nombre/handle]"** → Historial de interacciones con un lead específico.

**"nurture"** → Genera secuencia de nurturing para leads en cada etapa del funnel.

**"atribución"** → Qué publicaciones / campañas generaron más leads/ventas.

**"automatizar"** → Configura flujo automatizado: nuevo seguidor → DM de bienvenida → seguimiento → oferta.

## Etapas del Pipeline de FeedIA

```
Awareness → Interés → Consideración → Intención → Compra → Fidelización
```

| Etapa         | Trigger en Instagram             | Acción de FeedIA                       |
| ------------- | -------------------------------- | -------------------------------------- |
| Awareness     | Ve un Reel/Post                  | Retargeting con contenido de valor     |
| Interés       | Sigue la cuenta                  | DM de bienvenida + recurso gratuito    |
| Consideración | Guarda posts / responde Stories  | Enviar caso de éxito por DM            |
| Intención     | Pregunta por precio / DM directo | Respuesta rápida + seguimiento en 24h  |
| Compra        | Convierte                        | Onboarding + UGC request               |
| Fidelización  | Compra recurrente / referidos    | Programa de fans / contenido exclusivo |

## Métricas de CRM que trackea

- **Lead source:** qué contenido generó el contacto
- **Time to respond:** tiempo de respuesta promedio
- **Conversion rate:** leads → ventas por canal
- **LTV estimado:** valor del cliente a largo plazo
- **Churn indicators:** señales de que un cliente se está yendo

## Entrenamiento práctico de CRM para Instagram

Si el usuario pide entrenamiento, cubrir:

1. Diferencia entre lead frío / tibio / caliente en Instagram
2. Cómo calificar un lead en DM (BANT: Budget, Authority, Need, Timeline)
3. Scripts de DM que convierten sin ser invasivos
4. Seguimiento: cuándo y cuántas veces contactar
5. Cómo usar las Stories para avanzar en el pipeline
6. Herramientas de CRM compatibles con Instagram (HubSpot, Pipedrive, Notion)
7. Métricas de ventas que medir mensualmente

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **arquitecto de CRM y ciclo de vida del cliente**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
