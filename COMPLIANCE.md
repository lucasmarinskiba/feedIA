# Guía de Compliance para Instagram

## ¿Qué es este documento?

Esta guía explica **cómo funciona el sistema de cumplimiento** y cómo te protege a vos y a tus clientes de violar las normas de Instagram/Meta.

> **Recuerda:** Este sistema es una herramienta de asistencia, no un evasor de reglas. Su objetivo es **minimizar el riesgo de penalizaciones** operando siempre dentro de los límites permitidos.

---

## 1. Arquitectura de Compliance

El sistema tiene **tres capas de protección** que actúan en serie:

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA 1: Compliance Guardian (evaluación pre-acción)        │
│  - Analiza reglas de Instagram                              │
│  - Verifica rate limits                                     │
│  - Calcula score de riesgo                                  │
│  → SI FALLA: la acción se bloquea antes de ejecutarse       │
├─────────────────────────────────────────────────────────────┤
│  CAPA 2: Rate Limiter (control de frecuencia)               │
│  - Límites por hora y por día por tipo de acción            │
│  - Delays mínimos entre acciones                            │
│  - Persistencia en disco (sobrevive reinicios)              │
│  → SI FALLA: la acción se pospone hasta que sea segura      │
├─────────────────────────────────────────────────────────────┤
│  CAPA 3: Audit Log (registro de todo)                       │
│  - Cada acción queda registrada con timestamp               │
│  - Datos sensibles se sanitizan automáticamente             │
│  - Retención configurable (default: 90 días)                │
│  → SIEMPRE ACTIVO: permite demostrar cumplimiento           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Reglas de Instagram Implementadas

El sistema conoce y aplica **16 reglas** basadas en los términos reales de Instagram:

### Categoría: Automatización

| Código     | Regla                                         | Severidad |
| ---------- | --------------------------------------------- | --------- |
| `AUTO-001` | No crear cuentas ni extraer datos sin permiso | Crítica   |
| `AUTO-002` | No eludir medidas de seguridad                | Crítica   |

### Categoría: Contenido

| Código     | Regla                                | Severidad |
| ---------- | ------------------------------------ | --------- |
| `CONT-001` | No violar Community Standards        | Crítica   |
| `CONT-002` | No publicar información privada      | Alta      |
| `CONT-003` | No promesas garantizadas / clickbait | Alta      |
| `CONT-004` | Respetar copyright                   | Alta      |

### Categoría: Interacción

| Código    | Regla                                  | Severidad |
| --------- | -------------------------------------- | --------- |
| `INT-001` | No spam / mensajes masivos             | Alta      |
| `INT-002` | No acoso ni amenazas                   | Crítica   |
| `INT-003` | No comprar/vender cuentas o engagement | Crítica   |
| `INT-004` | No suplantar identidades               | Crítica   |

### Categoría: Datos

| Código     | Regla                     | Severidad |
| ---------- | ------------------------- | --------- |
| `DATA-001` | No solicitar credenciales | Crítica   |
| `DATA-002` | No vender/compartir datos | Crítica   |

### Categoría: Cuenta

| Código     | Regla                           | Severidad |
| ---------- | ------------------------------- | --------- |
| `ACCT-001` | Edad mínima (13 años)           | Alta      |
| `ACCT-002` | No URLs en username sin permiso | Media     |

### Categoría: Técnica

| Código     | Regla                       | Severidad |
| ---------- | --------------------------- | --------- |
| `TECH-001` | Respetar rate limits de API | Alta      |
| `TECH-002` | No ingeniería inversa       | Crítica   |

---

## 3. Rate Limits (Límites de Frecuencia)

Los límites son **conservadores**, por debajo de los oficiales de Meta Graph API:

| Acción                        | Máx/hora | Mín. entre acciones | Máx/día |
| ----------------------------- | -------- | ------------------- | ------- |
| Publicar posts/stories        | 5        | 10 minutos          | 15      |
| Enviar DMs                    | 20       | 30 segundos         | 100     |
| Responder comentarios         | 30       | 20 segundos         | 200     |
| Responder DMs                 | 40       | 15 segundos         | 300     |
| Likes                         | 60       | 10 segundos         | 500     |
| Seguir cuentas                | 10       | 2 minutos           | 50      |
| Comentarios en cuentas ajenas | 10       | 3 minutos           | 30      |
| Reacciones a stories          | 30       | 30 segundos         | 200     |
| Llamadas API genéricas        | 150      | 5 segundos          | 2.000   |

**¿Qué pasa si se alcanza un límite?**

- La acción se bloquea con un mensaje claro
- El sistema indica cuánto tiempo esperar
- No se pierde la acción: podés reintentar manualmente después

---

## 4. Configuración de Compliance

En tu `.env`:

```bash
# Modo estricto: bloquea incluso violaciones de severidad MEDIA
COMPLIANCE_STRICT_MODE=true

# DEBE ser true para operar (después de leer TERMS_OF_SERVICE.md)
COMPLIANCE_ACCEPTED_TERMS=false

# Límites diarios personalizables (los valores default son conservadores)
COMPLIANCE_MAX_DAILY_PUBLISH=15
COMPLIANCE_MAX_DAILY_DM=100
COMPLIANCE_MAX_DAILY_COMMENTS=200

# Retención de logs de auditoría
COMPLIANCE_AUDIT_RETENTION_DAYS=90
```

---

## 5. Audit Log

Todas las acciones quedan registradas en `data/runtime/audit/audit-YYYY-MM-DD.ndjson`.

### Formato de entrada

```json
{
  "timestamp": "2026-05-14T14:30:00.000Z",
  "id": "lxyz-abc123",
  "action": "PUBLISH",
  "outcome": "success",
  "targetContentId": "post-123",
  "contentSummary": "Caption sanitizado...",
  "rateLimitInfo": { "currentCount": 3, "limit": 5 },
  "systemVersion": "0.1.0",
  "dryRun": false
}
```

### Entradas de bloqueo

Cuando el guardian bloquea algo, se registra:

```json
{
  "action": "COMPLIANCE_BLOCKED",
  "outcome": "blocked",
  "reason": "Violación ALTA de compliance: [CONT-003] ...",
  "complianceRules": ["CONT-003"]
}
```

### Privacidad

- Los emails se reemplazan por `[EMAIL]`
- Los teléfonos se reemplazan por `[TEL]`
- Los números largos se reemplazan por `[NUM]`

---

## 6. Modo DRY_RUN (Simulación)

Por defecto, `DRY_RUN=true`. En este modo:

- Se ejecutan TODAS las verificaciones de compliance
- Se registran TODAS las acciones en el audit log
- **Nada se publica ni se envía realmente**

**Recomendación:** Mantené `DRY_RUN=true` durante al menos 1 semana de pruebas antes de activar producción.

---

## 7. Preguntas Frecuentes

### ¿Puede garantizar que no me baneen?

**No.** Ningún sistema puede garantizar eso. Instagram usa algoritmos propietarios y puede tomar decisiones que no controlamos. Lo que sí garantizamos es que el sistema no va a realizar acciones que nosotros sepamos que violan las reglas.

### ¿Puedo desactivar el compliance?

**No.** El guardian es parte integral del sistema. Podés ajustar la severidad con `COMPLIANCE_STRICT_MODE`, pero no podés desactivar las reglas críticas.

### ¿Qué pasa si Instagram cambia sus reglas?

El sistema usa reglas codificadas en `src/compliance/instagramRules.ts`. Si Instagram actualiza sus términos, necesitarás actualizar ese archivo. Te recomendamos revisar los términos de Instagram trimestralmente.

### ¿Los comentarios en cuentas ajenas están permitidos?

Sí, **si aportan valor genuino**. El sistema bloqueará:

- Comentarios que mencionen tu marca (spam encubierto)
- Comentarios genéricos o de emoji
- Más de 10 comentarios externos por hora

### ¿Las secuencias de nurture están permitidas?

Sí, **si el usuario contactó primero o dio consentimiento**. Instagram permite responder DMs automatizados cuando:

- El usuario envió un DM primero
- Hay un webhook autorizado
- No es spam masivo no solicitado

---

## 8. Mejores Prácticas

1. **Nunca pidas la contraseña de Instagram** de un cliente. Usá OAuth de Meta.
2. **Revisá el contenido generado** antes de publicar, especialmente en los primeros meses.
3. **Monitoreá el audit log** semanalmente para detectar patrones.
4. **Mantené DRY_RUN=true** hasta estar 100% seguro.
5. **No uses proxies o VPNs** para ocultar la automatización: eso viola AUTO-002.
6. **Sé transparente** con tu audiencia sobre el uso de herramientas de IA.

---

## 9. Reportar Problemas

Si detectás que el sistema:

- Permite una acción que debería bloquearse
- Bloquea una acción legítima
- Tiene un comportamiento inesperado

Revisá:

1. `data/runtime/audit/` para ver el historial
2. `data/runtime/rate-limits.json` para ver límites actuales
3. Los logs de consola con `LOG_LEVEL=debug`

---

**Documento vivo:** Esta guía se actualiza a medida que evolucionan las políticas de Instagram y las capacidades del sistema.
