---
description: Computer Use — optimizado (compression, caching, watchdog, cancel mid-run)
---

Computer Use de FeedIA. Módulos: `src/capabilities/computerUse/`

## Modos del agente

| Modo               | Comportamiento                                         |
| ------------------ | ------------------------------------------------------ |
| 🔴 **Desactivado** | Pausa total, ninguna acción auto                       |
| 🟢 **Activado**    | Auto-pilot, ejecuta sin pedir                          |
| 👁️ **Asistente**   | Supervisado — pide aprobar cada paso (PendingApproval) |

API: `PUT /api/cu/mode { mode: 'off'|'auto'|'supervised' }`

## "Ver y operar"

- 👀 **Pantalla en vivo** → SSE `/ws/cu/:sessionId` con screenshots reales en tiempo real (ping 25s)
- 🎨 **Canva → Instagram** → pipeline end-to-end
- 🔍 **GlassBox** → cada acción gated antes de ejecutar
- 👥 **Equipo en vivo** → Nova/Lía/Gard/Luca/Mira operando
- 📜 **Replay Log** → sesiones grabadas con screenshots

## Optimizaciones aplicadas (driver Anthropic Computer Use)

| Optimización                                             | Ahorro / efecto                 |
| -------------------------------------------------------- | ------------------------------- |
| **Image compression** (JPEG 70%, max 1280px via sharp)   | ~80% menos bytes/imagen         |
| **Prompt caching** (system + tool def con cache_control) | ~90% menos input tokens turn 2+ |
| **History pruning** (mantener últimas N screenshots)     | contexto no explota             |
| **Action timeout** (8s default)                          | acción colgada no mata sesión   |
| **Turn timeout** (60s default)                           | turn colgado se aborta          |
| **Session timeout** (5min default)                       | sesión colgada se mata          |
| **Loop detection** (acción idéntica 3x = abort)          | no entra en loops               |
| **Adaptive abort** (3 turns sin progreso = stop)         | no gasta tokens en vano         |
| **Coord sanitization** (clamp a viewport)                | no rompe Playwright             |
| **Retry exponencial** (rate limit / 5xx)                 | robusto a errores transitorios  |
| **Cancellation mid-run** (`cancelSession()`)             | emergency stop real             |
| **Token usage tracking** + cost calc                     | métricas reales por sesión      |
| **Dedup narrations**                                     | UI no se satura con repetidos   |

## Env vars de tuning

```bash
# Activación
COMPUTER_USE_LIVE=true                  # OBLIGATORIO para correr en vivo
ANTHROPIC_API_KEY=sk-ant-xxx
COMPUTER_USE_HEADLESS=true              # false para ver navegador

# Modelo + display
COMPUTER_USE_BETA=computer-use-2025-01-24
COMPUTER_USE_TOOL=computer_20250124
COMPUTER_USE_WIDTH=1280
COMPUTER_USE_HEIGHT=800
COMPUTER_USE_MAX_TURNS=14

# Optimizaciones (default ON, set 'false' para desactivar)
CU_COMPRESS_SCREENSHOTS=true            # JPEG 70% + resize
CU_PRUNE_HISTORY=true                   # truncate viejas
CU_PROMPT_CACHING=true                  # cache_control ephemeral
CU_KEEP_LAST_SCREENSHOTS=4              # cuántas mantener
CU_MAX_EMPTY_TURNS=3                    # abort si no progresa
```

## Endpoints

```
POST /api/cu/cancel/:sessionId          → cancela sesión mid-run
GET  /api/cu/watchdog/active            → lista sesiones activas con elapsedMs
GET  /api/cu/optimizer/status           → flags + timeouts actuales
PUT  /api/cu/mode                       → cambiar modo (off|auto|supervised)
GET  /api/cu/mode/pending-approvals     → acciones esperando aprobar
POST /api/cu/mode/approve/:id           → aprobar acción
POST /api/cu/mode/reject/:id            → rechazar
GET  /api/cu/apps/installed             → apps disponibles
POST /api/cu/apps/launch                → abrir app
```

## Emergency Stop (botón rojo topbar)

3 acciones en paralelo:

1. `POST /api/cu/cancel/:sessionId` para cada sesión activa → aborta bucle agéntico (AbortController)
2. `POST /api/cu/mode/reject/:id` para cada PendingApproval pendiente
3. `PUT /api/cu/mode { mode: 'off' }` → modo desactivado

Mensaje: "🛑 Agente frenado · N sesiones + M acciones canceladas"

## Costo estimado por sesión (claude-opus-4)

Sin optimizaciones (10 turns × 1 imagen each):

- Input: ~25K tokens × 10 turns = 250K input → $0.75
- Imágenes: 10 × 750 tok = 7,500 tok → $0.022
- Total: **~$0.80/sesión**

Con todas las optimizaciones:

- Cache write (turn 1): 1× full → $0.10
- Cache read (turns 2-10): 9× → $0.025
- Imágenes JPEG comprimidas: ~150 tok/imagen
- Total: **~$0.15/sesión** (80% reducción)

## Anti-cuelgues garantizados

| Escenario                   | Antes                                               | Ahora                               |
| --------------------------- | --------------------------------------------------- | ----------------------------------- |
| Click cuelga Playwright     | ❌ sesión muerta para siempre                       | ✅ timeout 8s → continúa            |
| Modelo responde lento       | ❌ block indefinido                                 | ✅ turn timeout 60s + retry         |
| Loop infinito               | ❌ MAX_TURNS no protege si modelo termina turn fast | ✅ detectActionLoop aborta          |
| Sesión olvidada             | ❌ Playwright queda abierto                         | ✅ sessionTimeout 5min + auto-close |
| Rate limit Anthropic        | ❌ Error inmediato                                  | ✅ retry exponencial 3x             |
| Coordenadas fuera viewport  | ❌ Playwright error                                 | ✅ clampCoordinate                  |
| Emergency stop no para nada | ❌ solo cambiaba modo flag                          | ✅ AbortController real             |

## Cómo iniciar sesión

Desde código:

```ts
import { runAnthropicComputerUse } from './capabilities/computerUse/anthropicDriver.js';
const sessionId = `cu-${Date.now()}`;
await runAnthropicComputerUse('Abrir Canva y crear carrusel sobre nutrición', (ev) => console.log(ev), {
  sessionId,
  baseUrl: 'https://canva.com',
});
```

Cancelar desde otro lugar:

```ts
import { cancelSession } from './capabilities/computerUse/cuWatchdog.js';
cancelSession(sessionId, 'user-cancelled');
```

## Telemetría por sesión

Log al finalizar:

```
[CU-Live] OK (12 acciones, 8 turns, tokens: in=15234 out=2841 cache_read=89231 cost=$0.087)
```

## Instalación opcional sharp (recomendado para compresión real)

```bash
npm install sharp
```

Sin sharp → compresión no-op (devuelve PNG original). Sistema funciona igual pero usa más tokens.

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **ejecutor de Computer Use sobre apps reales**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
