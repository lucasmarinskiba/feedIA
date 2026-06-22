# Programa de Capacitación y Certificación

## 🎓 Objetivo

Capacitar a operadores y administradores para usar el sistema de forma segura, ética y efectiva, minimizando el riesgo de incidentes de compliance.

---

## Módulo 1: Fundamentos de Compliance en Redes Sociales

### 1.1 ¿Qué es compliance?

Compliance = cumplir con las reglas. En redes sociales, significa:

- Respetar los Términos de Uso de la plataforma
- No violar Community Standards
- Operar dentro de los límites técnicos (API, rate limits)
- Proteger datos de usuarios

### 1.2 ¿Por qué Instagram banea cuentas?

Las razones más comunes:

1. **Spam**: mensajes masivos no solicitados
2. **Contenido inapropiado**: violencia, odio, desnudez
3. **Comportamiento bot-like**: acciones demasiado rápidas o repetitivas
4. **Violación de API**: scraping, creación de cuentas automatizada
5. **Engaño**: clickbait, promesas falsas, suplantación
6. **Reportes de usuarios**: muchas personas reportan tu contenido

### 1.3 Diferencia entre baneo temporal y permanente

- **Temporal (suspensión)**: 24h a 30 días. Normalmente por primera infracción.
- **Permanente**: Cuenta eliminada. Difícil de revertir.
- **Shadowban**: Tu contenido no aparece en hashtags ni Explore. Invisible pero dañino.

### 1.4 Responsabilidades del operador

- Vos sos responsable de lo que el sistema publica
- No podés culpar a la IA o al software
- Debés revisar el contenido antes de aprobarlo
- Debés reportar incidentes inmediatamente

---

## Módulo 2: Cómo Funciona el Guardian

### 2.1 Las tres capas de protección

1. **Guardian pre-acción**: Evalúa ANTES de ejecutar
2. **Rate limiter**: Controla frecuencia
3. **Audit log**: Registra todo para evidencia

### 2.2 Tipos de reglas

- **Crítica**: Bloquea inmediatamente. Ej: scraping, suplantación, acoso
- **Alta**: Bloquea en modo estricto. Ej: datos personales, clickbait
- **Media**: Bloquea solo en modo estricto. Ej: URLs en username
- **Baja**: Advertencia. Ej: tono potencialmente problemático

### 2.3 Score de riesgo

- **0-20**: Seguro. Auto-publicar si ya pasó safety audit.
- **20-40**: Bajo riesgo. Monitorear.
- **40-60**: Riesgo medio. Requiere aprobación humana.
- **60-80**: Riesgo alto. Requiere aprobación + notificación.
- **80-100**: Crítico. Bloqueo inmediato.

### 2.4 Qué hacer cuando el guardian bloquea algo

1. **NO desactives el guardian**
2. Leé la razón del bloqueo
3. Revisá el contenido manualmente
4. Si es un falso positivo: reportalo al equipo de desarrollo
5. Si es una violación real: corregí el contenido

---

## Módulo 3: Rate Limits y Por Qué Existen

### 3.1 ¿Qué son los rate limits?

Son límites de frecuencia impuestos por Instagram para:

- Prevenir spam
- Proteger sus servidores
- Detectar comportamiento automatizado
- Mantener la experiencia de usuario

### 3.2 Nuestros límites (conservadores)

| Acción                | Máx/hora | Máx/día |
| --------------------- | -------- | ------- |
| Publicar              | 5        | 15      |
| Enviar DM             | 20       | 100     |
| Responder comentarios | 30       | 200     |
| Comentar en ajenos    | 10       | 30      |

### 3.3 ¿Qué pasa si se alcanza un límite?

- La acción se bloquea automáticamente
- Se indica cuánto esperar
- NO se pierde la acción: podés reintentar después
- NO intentes evadir el límite: eso viola AUTO-002

### 3.4 Buenas prácticas

- Distribuí las acciones a lo largo del día
- No hagas "rafagas" de muchas acciones juntas
- Respetá los horarios de silencio (quiet hours)
- Monitoreá `npm run dev compliance-rate-limits`

---

## Módulo 4: Revisión de Contenido

### 4.1 Checklist antes de aprobar

- [ ] ¿El contenido es apropiado para la marca?
- [ ] ¿No hay promesas garantizadas?
- [ ] ¿No hay datos personales?
- [ ] ¿Los hashtags están auditados?
- [ ] ¿La imagen/video tiene licencia?
- [ ] ¿El tono es respetuoso?
- [ ] ¿No menciona competidores de forma difamatoria?

### 4.2 Señales de alerta en contenido

- Palabras como "garantizado", "100% efectivo", "secreto revelado"
- Precios sin contexto
- Promesas de resultados en tiempo determinado
- Datos estadísticos sin fuente
- Lenguaje que puede sonar amenazante u ofensivo

### 4.3 Proceso de corrección

1. Rechazá el contenido con razón clara
2. Escribí qué cambios necesita
3. El sistema regenerará con los ajustes
4. Revisá la nueva versión
5. Aprobá solo cuando esté correcto

---

## Módulo 5: Qué Hacer ante una Alerta de Crisis

### 5.1 Tipos de crisis

- **Crisis de reputación**: comentarios masivos negativos
- **Crisis de contenido**: post removido por Meta
- **Crisis técnica**: fallo de API, baneo
- **Crisis legal**: demanda, queja formal

### 5.2 Protocolo de respuesta

1. **Detectar**: ¿Qué pasó? ¿Cuándo? ¿Quién está afectado?
2. **Contener**: Pausar todo. `npm run dev emergency-stop --razon="..."`
3. **Investigar**: Revisar audit logs. Identificar causa.
4. **Comunicar**: Notificar al cliente y al equipo.
5. **Resolver**: Tomar acciones correctivas.
6. **Documentar**: Post-mortem en `data/incidents/`.

### 5.3 Contactos de emergencia

- Responsable principal: [completar]
- Backup: [completar]
- Legal: [completar]
- Soporte Meta: business.facebook.com/support

---

## Módulo 6: Cómo Leer el Audit Log

### 6.1 Ubicación

```bash
data/runtime/audit/audit-YYYY-MM-DD.ndjson
```

### 6.2 Comandos útiles

```bash
# Últimas 20 acciones
npm run dev compliance-audit --limit=20

# Buscar bloqueos
grep "COMPLIANCE_BLOCKED" data/runtime/audit/*.ndjson

# Buscar fallos
grep "failure" data/runtime/audit/*.ndjson

# Buscar publicaciones
grep "PUBLISH" data/runtime/audit/*.ndjson
```

### 6.3 Interpretar una entrada

```json
{
  "timestamp": "2026-05-14T14:30:00Z",
  "action": "PUBLISH",
  "outcome": "success",
  "targetContentId": "post-123",
  "rateLimitInfo": { "currentCount": 3, "limit": 5 }
}
```

### 6.4 Qué buscar en auditoría semanal

- Acciones bloqueadas: ¿hay patrones?
- Rate limits altos: ¿necesitamos ajustar estrategia?
- Fallos de API: ¿problema de conectividad?
- Contenido con score alto: ¿ajustar prompts?

---

## Módulo 7: Cómo Apelar un Baneo

### 7.1 Antes de apelar

- Revisá el audit log completo
- Identificá qué acción desencadenó el baneo
- Asegurate de que el contenido violador fue removido
- Prepará evidencia de cumplimiento

### 7.2 Template de apelación

```
Estimado equipo de Instagram:

Mi cuenta de negocio [@handle] fue suspendida el [fecha].
Opero una empresa legítima de [industria].

Utilizo la Meta Graph API oficial con permisos aprobados.
Mi sistema incluye salvaguardas de cumplimiento.

He revisado mi contenido y removido todo material
que pudiera violar las políticas.

Solicito amablemente una revisión de mi caso.

Atentamente,
[Nombre]
[Email]
```

### 7.3 Errores comunes al apelar

- ❌ Mentir o negar la violación
- ❌ Ser agresivo o exigente
- ❌ No presentar evidencia
- ❌ Apelar múltiples veces con el mismo mensaje
- ✅ Ser honesto, cortés y proporcionar evidencia

---

## Examen de Certificación

### Reglas

- 20 preguntas de opción múltiple
- 80% correctas para aprobar
- Tiempo límite: 30 minutos
- Podes consultar la documentación

### Preguntas de muestra

**1. ¿Qué hace el Compliance Guardian?**
a) Publica contenido automáticamente
b) Evalúa acciones antes de ejecutarlas ✅
c) Genera seguidores falsos
d) Evade los rate limits de Instagram

**2. Si el guardian bloquea una acción legítima, ¿qué hacés?**
a) Desactivás el guardian
b) Reportás el falso positivo al equipo de desarrollo ✅
c) Intentás la acción manualmente sin el sistema
d) Ignorás el bloqueo

**3. ¿Cuál es el límite diario de publicaciones?**
a) 50
b) 25
c) 15 ✅
d) No hay límite

**4. ¿Qué es un shadowban?**
a) Un tipo de ataque cibernético
b) Una restricción invisible donde tu contenido no aparece en hashtags ✅
c) Un módulo del sistema
d) Un tipo de cuenta de Instagram

**5. Si detectás una crisis de reputación, ¿cuál es el primer paso?**
a) Publicar una disculpa inmediatamente
b) Pausar todo con emergency-stop ✅
c) Ignorar y esperar que pase
d) Borrar todos los comentarios

**6. ¿Se puede garantizar 0% de riesgo de baneo?**
a) Sí, con el sistema adecuado
b) Sí, si pagamos por una herramienta premium
c) No, nadie puede garantizar eso ✅
d) Sí, si operamos desde múltiples IPs

**7. ¿Qué significa DRY_RUN=true?**
a) El sistema está roto
b) Nada se publica realmente, solo se simula ✅
c) El sistema consume más recursos
d) Las publicaciones se hacen en privado

**8. ¿Cuándo se debe usar `COMPLIANCE_ACCEPTED_TERMS=true`?**
a) Después de leer TERMS_OF_SERVICE.md ✅
b) Siempre, desde el primer día
.c) Nunca, es opcional
d) Solo si hay problemas legales

**9. ¿Qué hacer si Meta pide información sobre tu uso de la API?**
a) Ignorar el pedido
b) Presentar audit logs y evidencia de cumplimiento ✅
c) Borrar todos los logs
d) Decir que no usamos automatización

**10. ¿Cuál es la severidad más alta de regla de compliance?**
a) Baja
b) Media
c) Alta
d) Crítica ✅

---

## Certificación

### Proceso

1. Completar los 7 módulos de capacitación
2. Aprobar el examen con > 80%
3. Registrar certificación en `data/runtime/certifications.json`

### Formato del registro

```json
{
  "operatorName": "Juan Pérez",
  "operatorEmail": "juan@ejemplo.com",
  "certifiedAt": "2026-05-14T14:00:00Z",
  "expiresAt": "2026-11-14T14:00:00Z",
  "score": 18,
  "totalQuestions": 20,
  "modulesCompleted": [1, 2, 3, 4, 5, 6, 7]
}
```

### Recertificación

- Cada 6 meses
- Revisar cambios en términos de Instagram
- Actualizar conocimientos sobre nuevas funcionalidades
- Re-aprobación del examen

### Revocación

La certificación puede revocarse si:

- El operador viola intencionalmente las reglas de compliance
- No reporta incidentes
- Desactiva salvaguardas sin autorización
- Opera sin aceptar términos

---

**Versión**: 1.0 | **Duración estimada**: 4 horas  
**Requisito previo**: Completar ONBOARDING.md
