---
description: Skill de Gestión de Crisis de Reputación — Protocolo institucional de respuesta
---

Skill de gestión de crisis para FeedIA. Módulos: `src/capabilities/crisis/` + `src/capabilities/reputation/`

## Protocolo de activación

Cuando el usuario dice "crisis", "comentario negativo", "reputación", "urgente" → activar modo crisis.

## Niveles de crisis

### 🟡 Nivel 1 — Comentario negativo aislado

- 1-3 comentarios negativos sin viralización
- Respuesta empática + solución concreta
- Timeline: responder en <2 horas
- ¿Escala a humano? Solo si el comentario menciona datos personales o legales

### 🟠 Nivel 2 — Patrón de comentarios negativos

- Múltiples comentarios sobre el mismo tema
- Respuesta oficial en el post + DM personalizado a usuarios afectados
- Evaluar si publicar un story/post de respuesta pública
- Timeline: responder en <1 hora
- Escala a humano: SÍ, notificar al equipo

### 🔴 Nivel 3 — Crisis viral / Ataque coordinado

- Comentarios virales / menciones negativas en múltiples cuentas
- Activar contingencia `cp-crisis-comentarios` del safetyController
- Pausa inmediata de publicaciones programadas
- Comunicado oficial + respuesta de crisis
- Escala a humano: INMEDIATO

## Comportamiento según $ARGUMENTS

**"responder [comentario]"** → Genera respuesta institucional empática para el comentario dado. NO defensiva, NO agresiva, SÍ resolutiva.

**"evaluar [situación]"** → Clasifica el nivel de crisis y recomienda acciones.

**"comunicado"** → Redacta comunicado oficial para publicar en Stories/Feed sobre la situación.

**"protocolo"** → Muestra el protocolo completo paso a paso.

## Reglas de respuesta en crisis

1. Nunca eliminar comentarios legítimos (solo spam o violaciones)
2. Nunca responder con defensividad o agresividad
3. Reconocer el problema antes de dar solución
4. Mover conversaciones sensibles a DM privado
5. Documentar todo para aprendizaje futuro
6. Nunca prometer lo que no se puede cumplir

## Plantillas base (adaptar según contexto)

**Error de la marca:**
"Hola [nombre], tienes razón. Lamentamos [situación específica]. Estamos [acción concreta]. Te escribimos por DM para resolverlo. 🙏"

**Queja de producto/servicio:**
"Entendemos tu frustración [nombre]. Esto no es nuestra calidad habitual. Escríbenos al [contacto] con tu # de pedido y lo solucionamos hoy. 💙"

**Comentario agresivo sin base:**
"Gracias por compartir tu experiencia [nombre]. Nos gustaría entender mejor qué pasó. ¿Nos escribís por DM?"

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **gestor de crisis y reputación en tiempo real**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
