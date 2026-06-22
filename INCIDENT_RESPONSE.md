# Procedimiento de Respuesta ante Incidentes

## 🚨 ¿Qué es un incidente?

Cualquier evento que ponga en riesgo la cuenta de Instagram de un cliente o la operación del sistema:

- **Crítico**: Cuenta baneada/suspendida, acceso revocado por Meta
- **Alto**: Shadowban detectado, rate limit agresivo de Meta, reporte masivo de usuarios
- **Medio**: Contenido removido, advertencia de Meta, crisis de reputación
- **Bajo**: Bloqueo del guardian, alerta de compliance, fallo de integración

---

## Fase 1: Detección (0-15 minutos)

### Canales de detección

1. **Webhook de Meta**: Recibís notificación directa de Meta
2. **Monitoreo del cliente**: El cliente te avisa
3. **Alertas automáticas**: El sistema detecta anomalías
4. **Audit log**: Revisión manual encuentra algo raro
5. **Dashboard**: KPIs de compliance muestran degradación

### Primeras acciones inmediatas

- [ ] **No entres en pánico.** La mayoría de incidentes son reversibles.
- [ ] Verificá si es un baneo temporal o permanente.
- [ ] Revisá el audit log de las últimas 24-48 horas:
  ```bash
  npm run dev compliance-audit --limit=50
  ```
- [ ] Revisá logs del sistema:
  ```bash
  tail -n 200 data/runtime/logs/app.log
  ```
- [ ] Identificá el cliente/cuenta afectada.

---

## Fase 2: Contención (15-30 minutos)

### Paso 2.1: Pausar todo lo relacionado

```bash
# Pausar publicaciones
npm run dev crisis-check --postId="all" --comentarios=data/empty.json

# Si hay crisis activa, pausá todo
# Si no existe emergency-stop aún, hacelo manual:
```

Cambios urgentes en `.env`:

```bash
DRY_RUN=true
BOT_AUTO_REPLY_ENABLED=false
```

Reiniciá el daemon:

```bash
# Detené el proceso actual (Ctrl+C o kill)
# Iniciá en modo seguro:
DRY_RUN=true BOT_AUTO_REPLY_ENABLED=false npm run dev daemon
```

### Paso 2.2: Notificar stakeholders

Usá la plantilla según severidad:

**Template Crítico (Baneo)**:

```
🚨 INCIDENTE CRÍTICO — Cuenta Instagram suspendida

Cliente: [nombre]
Cuenta: [@handle]
Detectado: [timestamp]
Síntoma: [baneo temporal/permanente / advertencia / shadowban]

Acciones tomadas:
- Sistema pausado inmediatamente (DRY_RUN=true)
- Bot desactivado
- Publicaciones detenidas

Próximos pasos:
- Investigación de causas (30 min)
- Contacto con Meta para apelación
- Reunión con cliente en [horario]

Responsable: [nombre]
```

**Template Medio (Contenido removido)**:

```
⚠️ INCIDENTE MEDIO — Contenido removido por Meta

Cliente: [nombre]
Post ID: [id]
Razón (según Meta): [razón]

Acciones:
- Post pausado
- Revisión de contenido en curso
- No se requiere acción inmediata del cliente

Responsable: [nombre]
```

### Paso 2.3: Documentar el incidente

Creá un archivo en `data/incidents/`:

```json
{
  "incidentId": "INC-2026-05-14-001",
  "severity": "critical|high|medium|low",
  "client": "nombre",
  "account": "@handle",
  "detectedAt": "2026-05-14T14:30:00Z",
  "detectedBy": "webhook|client|alert|manual",
  "symptom": "descripción",
  "containmentActions": ["pausado", "dry_run=true"],
  "status": "contained",
  "assignedTo": "nombre"
}
```

---

## Fase 3: Investigación (30 minutos - 2 horas)

### Paso 3.1: Revisar audit log completo

```bash
# Últimas 100 acciones
npm run dev compliance-audit --limit=100

# Buscar bloqueos previos (señal de alerta temprana)
grep "COMPLIANCE_BLOCKED" data/runtime/audit/*.ndjson | tail -20

# Buscar fallos de API (posible señal de rate limit agresivo)
grep "failure" data/runtime/audit/*.ndjson | tail -20
```

### Paso 3.2: Timeline de eventos

Construí una línea de tiempo:

1. ¿Cuándo fue la última publicación exitosa?
2. ¿Cuántas acciones se hicieron en las últimas 24h?
3. ¿Hubo bloqueos del guardian previos al incidente?
4. ¿El cliente hizo algo manual en la cuenta?
5. ¿Hubo cambios en la configuración recientemente?

### Paso 3.3: Identificar causa raíz

Posibles causas y cómo verificarlas:

| Causa probable                      | Cómo verificar                                  |
| ----------------------------------- | ----------------------------------------------- |
| Contenido violó Community Standards | Revisar el post/caption en audit log            |
| Rate limit excedido                 | Revisar `compliance-rate-limits`                |
| Spam reportado por usuarios         | Revisar comentarios/DMs masivos recientes       |
| Comportamiento bot-like detectado   | Revisar si se usaron delays anti-detección      |
| Cuenta comprometida                 | Revisar sesiones activas en Meta Business Suite |
| Cambio en algoritmo de Meta         | Revisar noticias/oficial de Meta Developers     |
| Error de configuración              | Revisar `.env` y logs de arranque               |
| Cliente hizo algo manual            | Preguntar al cliente directamente               |

### Paso 3.4: Recopilar evidencia

Guardá TODO en `data/incidents/INC-XXXX/`:

- [ ] Captura de pantalla del mensaje de error/baneo
- [ ] Audit log completo del período
- [ ] Configuración `.env` (sin secrets)
- [ ] Contenido que desencadenó el incidente
- [ ] Métricas de la cuenta antes/después

---

## Fase 4: Comunicación con Meta (si aplica)

### Paso 4.1: Apelación de baneo

**Por la app de Instagram:**

1. Abrí Instagram → "Ayuda" → "Informar de un problema"
2. Seleccioná "Mi cuenta fue desactivada por error"
3. Completá el formulario con:
   - Nombre completo
   - Nombre de usuario
   - Email asociado
   - Explicación clara y cortés

**Por Meta Business Help Center:**

1. Andá a [business.facebook.com/support](https://business.facebook.com/support)
2. Creá un ticket detallado

**Template de apelación**:

```
Estimado equipo de Instagram:

Mi cuenta de negocio [@handle] fue suspendida el [fecha].
Opero una empresa legítima de [industria] desde [año].

Utilizo la Meta Graph API oficial con permisos aprobados
para gestionar mi presencia en Instagram de manera automatizada.
Mi sistema incluye salvaguardas de cumplimiento que respetan
los Términos de Uso y Community Standards.

Entiendo que pueda haber habido una publicación que no cumplió
con las políticas. He pausado todas las publicaciones automáticas
y estoy revisando mi contenido manualmente.

Solicito amablemente una revisión de mi caso. Adjunto:
- Evidencia de negocio legítimo
- Logs de cumplimiento de mi sistema
- Confirmación de que he tomado medidas correctivas

Quedo a disposición para cualquier información adicional.

Atentamente,
[Nombre]
[Email]
[Teléfono]
```

### Paso 4.2: Presentar evidencia de cumplimiento

Si Meta pide información, prepará:

- Audit logs que muestren rate limits respetados
- Evidencia de que usás la API oficial (no scraping)
- Documentación de tus salvaguardas técnicas
- Confirmación de que el contenido violador fue removido

**NUNCA mientas a Meta.** Si cometiste un error, admitilo y mostrá las correcciones.

---

## Fase 5: Recuperación

### Paso 5.1: Si la cuenta se reactiva

- [ ] No publiques nada durante 24-48h
- [ ] Revisá TODO el contenido pendiente manualmente
- [ ] Reducí la frecuencia de publicación a la mitad por 1 semana
- [ ] Activá el modo más conservador de rate limits
- [ ] Monitoreá métricas de engagement diariamente
- [ ] No actives el bot automático durante 1 semana

### Paso 5.2: Si la cuenta NO se reactiva

- [ ] Informá al cliente inmediatamente
- [ ] Evaluá crear una nueva cuenta (solo si el negocio lo justifica)
- [ ] Revisá si hay datos del cliente que recuperar
- [ ] Considerá asesoría legal si hay pérdida significativa
- [ ] Documentá TODO para prevenir en el futuro

### Paso 5.3: Si fue un shadowban

- [ ] Reducí frecuencia de publicación
- [ ] Eliminá hashtags que puedan estar baneados
- [ ] Publicá contenido orgánico de alto valor (sin CTAs agresivos)
- [ ] Interactuá manualmente con la comunidad
- [ ] Esperá 7-14 días antes de reactivar automatizaciones

---

## Fase 6: Lecciones Aprendidas (Post-Mortem)

### Template de post-mortem

```
# Post-Mortem: INC-XXXX

## Resumen
- Incidente: [breve descripción]
- Severidad: [crítico/alto/medio/bajo]
- Duración: [cuánto duró desde detección hasta resolución]
- Cliente impactado: [nombre]

## Timeline
- HH:MM — Detección
- HH:MM — Contención
- HH:MM — Investigación completa
- HH:MM — Comunicación con Meta/cliente
- HH:MM — Resolución

## Causa raíz
[Análisis detallado de qué pasó y por qué]

## Impacto
- [ ] Cuenta baneada (temporal/permanente)
- [ ] Contenido removido
- [ ] Pérdida de seguidores
- [ ] Daño reputacional
- [ ] Pérdida económica estimada: $X

## Qué funcionó bien
- [ ]
- [ ]

## Qué se puede mejorar
- [ ]
- [ ]

## Acciones correctivas
- [ ] Acción 1 — Responsable — Fecha límite
- [ ] Acción 2 — Responsable — Fecha límite

## Evidencia
[Links a archivos en data/incidents/INC-XXXX/]

## Aprobado por
- Investigador: _____________ Fecha: ______
- Manager: _________________ Fecha: ______
```

---

## Anexos

### A. Contactos de emergencia

- Soporte Meta Business: [business.facebook.com/support](https://business.facebook.com/support)
- Meta Developer Support: [developers.facebook.com/support](https://developers.facebook.com/support)
- Centro de ayuda Instagram: [help.instagram.com](https://help.instagram.com)
- Reportar contenido indebido: [help.instagram.com/contact](https://help.instagram.com/contact)

### B. Checklist de respuesta rápida (imprimible)

```
□ 1. Detectar — ¿Qué pasó?
□ 2. Pausar — DRY_RUN=true, bot off
□ 3. Notificar — Cliente + equipo
□ 4. Investigar — Audit log + timeline
□ 5. Contener — Evitar que empeore
□ 6. Comunicar — Con Meta si aplica
□ 7. Recuperar — Restaurar operación
□ 8. Documentar — Post-mortem
```

### C. Señales de alerta temprana

Si ves estos patrones, actuá ANTES de que sea un incidente:

- Múltiples bloqueos del guardian en 1 hora
- Rate limit al 80% antes del mediodía
- Fallos de API consecutivos
- Engagement cayendo > 30% de un día para otro
- Cliente reporta "no veo mis posts"
- Hashtags auditados con aumento de baneados

---

**Versión**: 1.0 | **Última actualización**: 2026-05-14  
**Revisar trimestralmente**: Sí | **Entrenamiento requerido**: Sí
