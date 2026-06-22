# Guía de Onboarding — Agente IA Especialista Instagram

## 📋 Índice

1. [Requisitos previos](#requisitos-previos)
2. [Configuración inicial](#configuración-inicial)
3. [Primeros pasos en modo simulación](#primeros-pasos-en-modo-simulación)
4. [Conexión con Meta](#conexión-con-meta)
5. [Pruebas de cada capacidad](#pruebas-de-cada-capacidad)
6. [Verificaciones de compliance](#verificaciones-de-compliance)
7. [Aprobación final](#aprobación-final)

---

## Requisitos previos

Antes de tocar el sistema, asegurate de cumplir con:

- [ ] **Edad mínima**: Tenés al menos 18 años (o la edad legal para operar un negocio en tu país).
- [ ] **Elegibilidad**: No estás prohibido por Meta de usar sus servicios.
- [ ] **Cuenta de Instagram**: Tenés una cuenta de Business/Creator activa y en buen estado.
- [ ] **Meta Business Account**: Tenés acceso a Meta Business Suite.
- [ ] **App de Meta Developers**: Creaste una app en [developers.facebook.com](https://developers.facebook.com) (si vas a usar la API directa).
- [ ] **Node.js 20+**: Instalado en tu máquina.

---

## Configuración inicial

### Paso 1: Clonar e instalar

```bash
git clone <repo>
cd agente-ia-instagram
npm install
```

### Paso 2: Configurar entorno

```bash
cp .env.example .env
cp data/brand.example.json data/brand.json
```

### Paso 3: Completar `.env` (mínimo inicial)

Solo estas variables son necesarias para empezar:

```bash
ANTHROPIC_API_KEY=sk-ant-...
DRY_RUN=true                    # OBLIGATORIO: mantener en true por ahora
LOG_LEVEL=info
```

**NO completes aún** las variables de Meta (`META_ACCESS_TOKEN`, etc.). Las vas a obtener en el Paso 6.

### Paso 4: Completar `data/brand.json`

Editá el archivo con tu marca real. Campos críticos:

- `name`: Nombre de la marca
- `niche`: Nicho específico (ej: "automatización con IA para PyMEs")
- `voice.forbidden`: Palabras que NUNCA debe usar el agente
- `goals.primary`: Objetivo principal (awareness, engagement, leads, ventas, autoridad)

### Paso 5: Leer documentación obligatoria

- [ ] `TERMS_OF_SERVICE.md` → entendé tus responsabilidades legales
- [ ] `COMPLIANCE.md` → entendé las salvaguardas técnicas
- [ ] `README.md` → conocé todas las capacidades del sistema

---

## Primeros pasos en modo simulación

### Paso 6: Verificar compilación

```bash
npm run typecheck
npm run lint
```

Ambos deben pasar sin errores.

### Paso 7: Primer run del agente autónomo

```bash
npm run agent -- "planificá la semana con 3 posts sobre mi nicho"
```

**Esperado**: El agente genera un plan pero NO publica nada (DRY_RUN=true).

### Paso 8: Revisar salida

- Revisá el archivo generado en `output/`
- Verificá que el contenido sea apropiado para tu marca
- Buscá palabras prohibidas en `voice.forbidden`

### Paso 9: Probar generación de contenido

```bash
npm run dev carrusel --idea="5 errores comunes en mi industria"
npm run dev reel --tema="Cómo ahorrar tiempo con automatización" --duracion=30
npm run dev caption --contexto="reel sobre productividad" --formato=reel
```

### Paso 10: Probar safety auditor

```bash
npm run dev safety --caption="Comprá ahora con descuento garantizado del 100%"
```

**Esperado**: El auditor debe bloquear esto por promesa garantizada (CONT-003).

### Paso 11: Probar compliance check

```bash
npm run dev compliance-status
npm run dev compliance-check --texto="Texto de prueba para verificar"
npm run dev compliance-rules
```

---

## Conexión con Meta

### Paso 12: Crear app en Meta Developers

1. Andá a [developers.facebook.com](https://developers.facebook.com)
2. Creá una nueva app (tipo "Business")
3. Agregá el producto "Instagram"
4. Configurá el modo Live (no Development)

### Paso 13: Obtener permisos

Solicitá estos permisos mínimos:

- `instagram_content_publish`
- `instagram_manage_messages`
- `pages_messaging`
- `pages_read_engagement`

**NO pidas permisos que no necesites.** Cada permiso adicional es una superficie de riesgo.

### Paso 14: Generar Access Token

1. En Meta Developers, andá a "Tools" → "Graph API Explorer"
2. Seleccioná tu app
3. Generá un token con los permisos de arriba
4. El token debe ser de tipo "User" (no Page)

### Paso 15: Obtener IDs

```bash
# Esto te da tu IG Business Account ID
curl "https://graph.facebook.com/v19.0/me?fields=instagram_business_account&access_token=TU_TOKEN"
```

### Paso 16: Completar `.env` con datos de Meta

```bash
META_ACCESS_TOKEN=tu_token_largo
META_IG_BUSINESS_ID=tu_ig_business_id
META_PAGE_ID=tu_page_id
META_APP_SECRET=tu_app_secret
META_VERIFY_TOKEN=un_token_secreto_para_webhook
```

### Paso 17: Probar conexión a Meta (en DRY_RUN)

```bash
npm run dev brief --idea="Test de conexión" --formato=carrusel
```

**Esperado**: DRY_RUN=true simula la publicación. NO debe haber errores de conexión.

---

## Pruebas de cada capacidad

### Paso 18: Bot conversacional (simulado)

```bash
npm run dev bot-simular --items='[{"remitente":"@test_user","mensaje":"hola, vi su reel","canal":"dm"}]'
```

**Verificá**: La respuesta suena natural, no genérica, y no promete lo que no puede cumplir.

### Paso 19: Hashtags

```bash
npm run dev hashtags-research --tema="automatización"
npm run dev hashtags-audit --tags="#automatización|#marketingdigital|#emprendedor"
```

### Paso 20: Competidores (con datos de prueba)

Crea un archivo `data/test-competitors.json` con posts de ejemplo y corré:

```bash
npm run dev competidores --observaciones=data/test-competitors.json
```

### Paso 21: UGC

```bash
npm run dev ugc-evaluar --candidatos=data/test-ugc.json
```

### Paso 22: Crisis Manager

```bash
npm run dev crisis-check --postId="test-123" --comentarios=data/test-comments.json
npm run dev crisis-estado
```

### Paso 23: Scheduler

```bash
npm run dev scheduler-listar
```

**Verificá**: Todos los jobs listados son los que esperás.

---

## Verificaciones de compliance

### Paso 24: Verificar rate limits limpios

```bash
npm run dev compliance-rate-limits
```

**Esperado**: Sin actividad registrada (todavía no hiciste nada en producción).

### Paso 25: Verificar audit log vacío

```bash
npm run dev compliance-audit --limit=10
```

**Esperado**: Solo entradas de tus pruebas en DRY_RUN.

### Paso 26: Confirmar DRY_RUN=true

```bash
grep "DRY_RUN" .env
```

**Debe decir**: `DRY_RUN=true`

### Paso 27: Confirmar COMPLIANCE_ACCEPTED_TERMS=false

```bash
grep "COMPLIANCE_ACCEPTED_TERMS" .env
```

**Debe decir**: `COMPLIANCE_ACCEPTED_TERMS=false` (todavía no aceptaste).

### Paso 28: Revisar que no hay módulos antiBan activos

Verificá que no estés usando `src/capabilities/antiBan/fingerprint.ts` en ningún flujo productivo.

### Paso 29: Designar responsable de escalamiento

Definí quién será el humano que recibe alertas cuando:

- Hay crisis de reputación
- El guardian bloquea algo inesperado
- Un cliente reporta un problema

Agregalo a `.env`:

```bash
ESCALATION_CONTACT=nombre@email.com
ESCALATION_PHONE=+549...
```

---

## Aprobación final

### Paso 30: Firma digital de onboarding

Creá un archivo `data/runtime/onboarding-complete.json`:

```json
{
  "operatorName": "Tu nombre",
  "operatorEmail": "tu@email.com",
  "completedAt": "2026-05-14T14:00:00-03:00",
  "stepsCompleted": 30,
  "dryRunVerified": true,
  "termsRead": true,
  "complianceRead": true,
  "metaAppCreated": true,
  "webhookConfigured": false,
  "readyForProduction": false
}
```

### ¿Listo para producción?

**NO cambies DRY_RUN=false todavía.** Primero completá el `CHECKLIST_PRE_PRODUCCION.md`.

---

## Próximos pasos

1. 📖 Leer `CHECKLIST_PRE_PRODUCCION.md`
2. ✅ Completar los 50+ items del checklist
3. 🧪 Operar en DRY_RUN durante al menos 1 semana
4. 📊 Revisar métricas y logs diariamente
5. 🚀 Solo entonces: `COMPLIANCE_ACCEPTED_TERMS=true` + `DRY_RUN=false`

---

**Versión**: 1.0 | **Última actualización**: 2026-05-14
