# GlassBox — Caja de Cristal

## Supervisión en Tiempo Real del Agente de Instagram

---

## ¿Qué es GlassBox?

**GlassBox** es el sistema de supervisión paso a paso del agente. A diferencia de las automatizaciones tradicionales que operan "a ciegas" en el backend, GlassBox expone cada acción atómica del agente a un supervisor humano **antes** de que se ejecute.

### Filosofía

> "Es mejor que el supervisor vea cada paso y pueda intervenir, que descubrir un problema después de que el daño está hecho."

---

## Modos de Operación

| Modo           | Descripción                                                                                    | Cuándo usar                                                  |
| -------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **autonomous** | El agente ejecuta sin supervisión. Cada acción se registra en audit pero no espera aprobación. | Operaciones rutinarias de bajo riesgo. Sistema estable.      |
| **supervised** | Cada acción de escritura/modificación espera aprobación humana con timeout.                    | Contenido nuevo, clientes exigentes, alta sensibilidad.      |
| **paused**     | El agente encola todas las acciones pero no las ejecuta.                                       | Mantenimiento, revisión manual, investigación de incidentes. |

### Cambiar de modo

```bash
# Modo autónomo (default)
npm run dev glassbox-modo --modo=autonomous

# Modo supervisado — cada acción espera aprobación
npm run dev glassbox-modo --modo=supervised

# Modo pausado — encolar sin ejecutar
npm run dev glassbox-modo --modo=paused

# Atajos
npm run dev glassbox-pausar
npm run dev glassbox-reanudar
```

---

## Flujo de una Acción

```
1. El agente decide ejecutar una acción (ej: publicar en Instagram)
2. GlassBox evalúa la acción contra el Compliance Guardian
   ├── Si el guardian BLOQUEA → acción rechazada automáticamente
   └── Si el guardian APRUEBA → continúa
3. GlassBox verifica el modo:
   ├── autonomous → ejecuta directo
   ├── paused → encola, no ejecuta
   └── supervised → espera aprobación del supervisor
4. Si supervised:
   ├── El supervisor APRUEBA → se ejecuta la acción
   ├── El supervisor RECHAZA → acción cancelada
   └── Timeout (5 min default) → comportamiento configurable
5. Resultado auditado en data/runtime/audit/
```

---

## Supervisión desde CLI

### Ver estado

```bash
npm run dev glassbox-estado
```

### Ver cola de pendientes

```bash
npm run dev glassbox-cola
```

### Aprobar una acción

```bash
npm run dev glassbox-aprobar --id=gb-a-20260514-123456-7 --nota="Publicar"
```

### Rechazar una acción

```bash
npm run dev glassbox-rechazar --id=gb-a-20260514-123456-7 --razon="Caption demasiado promocional"
```

### Modificar una acción antes de aprobar

```bash
npm run dev glassbox-modificar --id=gb-a-20260514-123456-7 --payload='{"text":"Nuevo caption corregido"}'
```

### Ver historial

```bash
npm run dev glassbox-historial --limit=20
```

---

## Supervisión desde Dashboard Web

Cuando el daemon está corriendo (`npm run dev daemon`), el dashboard expone:

### Endpoints REST

| Método | Endpoint                            | Descripción                                         |
| ------ | ----------------------------------- | --------------------------------------------------- |
| GET    | `/api/glassbox/status`              | Estado actual, cola, historial reciente             |
| POST   | `/api/glassbox/mode`                | Cambiar modo (`autonomous`, `supervised`, `paused`) |
| POST   | `/api/glassbox/pause`               | Pausar ejecución                                    |
| POST   | `/api/glassbox/resume`              | Reanudar en modo supervised                         |
| GET    | `/api/glassbox/pending`             | Listar acciones pendientes                          |
| GET    | `/api/glassbox/history?limit=N`     | Historial de acciones                               |
| GET    | `/api/glassbox/actions/:id`         | Detalle de una acción                               |
| POST   | `/api/glassbox/actions/:id/approve` | Aprobar acción                                      |
| POST   | `/api/glassbox/actions/:id/reject`  | Rechazar acción                                     |
| POST   | `/api/glassbox/actions/:id/modify`  | Modificar payload de acción                         |
| GET    | `/api/glassbox/stream`              | **SSE** — stream de eventos en tiempo real          |

### Eventos SSE

Conectarse a `GET /api/glassbox/stream` para recibir eventos Server-Sent Events:

```javascript
const evtSource = new EventSource('http://localhost:7321/api/glassbox/stream');
evtSource.addEventListener('gb', (e) => {
  const data = JSON.parse(e.data);
  // data.kind puede ser:
  // 'action-pending', 'action-approved', 'action-rejected',
  // 'action-modified', 'action-executing', 'action-completed',
  // 'action-failed', 'mode-changed', 'screenshot-update'
});
```

---

## Integración con Live Theater

El **Live Theater** (`/api/studio/live-theater` o similar) muestra visualmente al agente operando. GlassBox se integra de dos formas:

1. **Eventos en el teatro**: Cuando una acción está pendiente de aprobación, el teatro muestra:
   - `⏸️ Esperando aprobación del supervisor: [tipo de acción]`
   - `▶️ Supervisor aprobó: [tipo de acción] — continuando...`
   - `❌ Supervisor rechazó: [tipo de acción]`

2. **Dos streams simultáneos**: El dashboard puede escuchar tanto el teatro (animación del cursor) como el GlassBox stream (controles de aprobación) y superponer la UI de supervisión sobre el teatro.

---

## Integración con Compliance

GlassBox y Compliance Guardian trabajan en **tandem**:

- **Guardian primero**: Evalúa la acción contra las 16 reglas de Instagram, rate limits, y contexto. Si bloquea, la acción **nunca llega** a GlassBox.
- **GlassBox segundo**: Si el guardian aprueba pero con advertencia, la acción llega al gate con flag amarilla. El supervisor decide.
- **Audit siempre**: Toda acción (autónoma o supervisada) se registra en `data/runtime/audit/`.

Esto da **tres capas de seguridad**:

1. Emergency Stop (sistema global)
2. Compliance Guardian (automático por reglas)
3. GlassBox (supervisión humana paso a paso)

---

## Qué acciones están gateadas

### Acciones de API (Instagram/Meta)

- `publishToInstagram` — publicar posts, reels, stories, carruseles
- `replyToComment` — responder comentarios
- `sendDm` — enviar mensajes directos
- `commentOnPost` — comentar en posts de terceros
- `deleteComment` — eliminar comentarios

### Acciones de Computer Use (Desktop)

- `computer_mouse_move` — mover cursor
- `computer_left_click` — clic izquierdo
- `computer_right_click` — clic derecho
- `computer_double_click` — doble clic
- `computer_left_click_drag` — arrastrar
- `computer_type` — tipear texto
- `computer_key` — presionar tecla
- `computer_scroll` — scroll

### Acciones de Computer Use (Browser/Playwright)

- `browser_click` — clic en elemento
- `browser_type` — llenar campo de texto
- `browser_hover` — hover sobre elemento
- `browser_navigate` — navegar a URL
- `browser_scroll` — scroll en página

### Acciones de Anthropic Computer Use

- `anthropic_mouse_move`, `anthropic_left_click`, `anthropic_type`, `anthropic_key`, `anthropic_scroll`

---

## Configuración Avanzada

### Timeout de aprobación

Por defecto, una acción en modo supervised espera **5 minutos** por aprobación. Si no hay respuesta:

- Acciones de **escritura** (publish, DM, comment) → se **bloquean** (default: `onTimeout: 'block'`)
- Acciones de **lectura** (screenshot, scroll, navigate) → se **auto-aprueban** (configurable)

Esto se configura en el código al llamar a `actionGate()`:

```typescript
await actionGate('publish', 'Publicar reel', async () => { ... }, {
  timeoutMs: 300_000,      // 5 minutos
  onTimeout: 'block',      // 'block' | 'approve' | 'escalate'
});
```

### Persistencia

El estado de GlassBox se guarda en `data/runtime/glassbox.json`:

- Modo actual
- Historial de últimas 200 acciones

Las acciones pendientes se mantienen en memoria (se pierden si el proceso se reinicia).

---

## Casos de Uso

### Caso 1: Publicación de contenido con revisión

```bash
# 1. Activar modo supervised
npm run dev glassbox-modo --modo=supervised

# 2. El agente genera contenido y llega al gate de publicación
# 3. Supervisor revisa caption, imagen, hashtags en el dashboard
# 4. Supervisor aprueba o rechaza
# 5. Si aprueba → se publica. Si rechaza → el agente intenta alternativa.
```

### Caso 2: Diseño en Canva con supervisión visual

```bash
# 1. Activar modo supervised
npm run dev glassbox-modo --modo=supervised

# 2. Iniciar sesión de Computer Use
npm run dev computer-use --goal="Diseñar un carrusel en Canva sobre tips de marketing"

# 3. El supervisor ve el cursor moverse en la pantalla
# 4. Antes de cada click/drag/type, puede pausar y corregir
# 5. El teatro muestra "Esperando aprobación" entre acciones
```

### Caso 3: Crisis — pausar inmediatamente

```bash
# Detectar comportamiento anómalo
npm run dev glassbox-pausar

# Investigar las acciones encoladas
npm run dev glassbox-cola

# Rechazar acciones sospechosas
npm run dev glassbox-rechazar --id=gb-a-... --razon="Posible spam"

# Reanudar cuando todo está claro
npm run dev glassbox-reanudar
```

---

## Troubleshooting

### "El agente no hace nada en modo supervised"

- Verificar que hay acciones pendientes: `npm run dev glassbox-cola`
- Aprobar o rechazar la acción pendiente
- Verificar que no hay timeout expirado

### "No puedo aprobar una acción"

- La acción ya puede haber sido resuelta (timeout o resolución previa)
- Verificar el ID exacto con `glassbox-cola`

### "El teatro se congela"

- Es normal: en modo supervised, el teatro muestra "Esperando aprobación" entre acciones
- Aprobar la acción en el dashboard o CLI para continuar

### "Quiero que solo algunas acciones requieran supervisión"

- Actualmente el gate aplica a todas las acciones de escritura
- Para granularidad más fina, modificar `requiresForcedSupervision()` en `complianceBridge.ts`

---

**Versión**: 1.0 | **Fecha**: 2026-05-14  
**Requiere**: Node.js 20+, módulo compliance activo
