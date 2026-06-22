# Guía Avanzada de Compliance

## Para Operadores y Administradores Experimentados

---

## 1. Sistema de Backup

### Crear backup manual

```bash
npm run dev backup-crear --razon="Antes de cambio mayor"
```

### Listar backups

```bash
npm run dev backup-listar
```

### Restaurar backup

```bash
npm run dev backup-restaurar --id=backup-2026-05-14-...
```

### Política recomendada

- Backup automático diario (configurar en scheduler)
- Backup manual antes de cualquier cambio mayor
- Retención: 90 días default
- Almacenar copia off-site mensualmente

---

## 2. Disaster Recovery

### Escenarios de recuperación

**Escenario A: Corrupción de datos**

```bash
npm run dev disaster-recovery
```

El sistema intentará:

1. Restaurar desde el backup más reciente
2. Si no hay backup, reconstruir estado mínimo
3. Ejecutar preflight para verificar integridad

**Escenario B: Servidor caído**

1. Reinstalar Node.js 20+
2. Clonar repositorio
3. Copiar `.env` desde backup off-site
4. Ejecutar `npm install`
5. Ejecutar `npm run dev disaster-recovery`
6. Verificar con `npm run dev preflight`

**Escenario C: Cuenta de Instagram comprometida**

1. `npm run dev emergency-stop --razon="Cuenta comprometida"`
2. Cambiar contraseña de Meta desde otro dispositivo
3. Revocar tokens de API
4. Generar nuevos tokens
5. Actualizar `.env`
6. Reanudar con `npm run dev emergency-resume --resolucion="Tokens rotados"`

---

## 3. Gestión de Versiones de Contenido

### Flujo de trabajo

```
1. Generar contenido → trackVersion(status: 'draft')
2. Revisar → approveVersion() o rejectVersion()
3. Si rechazado → trackVersion(status: 'draft', changes: [...])
4. Aprobar → trackVersion(status: 'approved')
5. Publicar → trackVersion(status: 'published')
```

### Comandos

```bash
# Registrar versión
npm run dev version-track --id=carrusel-001 --caption="Texto..." --hashtags="#a|#b" --score=15 --status=draft

# Listar historial
npm run dev version-listar --id=carrusel-001

# Aprobar
npm run dev version-aprobar --id=carrusel-001 --version=2 --aprobador="María"

# Rechazar
npm run dev version-rechazar --id=carrusel-001 --version=2 --razon="Demasiado promocional"

# Comparar
npm run dev version-comparar --id=carrusel-001 --v1=1 --v2=3
```

---

## 4. Reportes para Clientes

### Generar reporte manual

```bash
npm run dev reporte-cliente --cliente="MarcaX" --desde=2026-05-01
```

### Automatización

Agregar al scheduler:

```json
{
  "name": "reporte-clientes-semanal",
  "cron": "0 9 * * 1",
  "action": "sendWeeklyClientReport"
}
```

### Contenido del reporte

- Acciones realizadas (posts, DMs, comentarios)
- Score de compliance
- Alertas y bloqueos
- Contenido publicado vs. planificado
- Recomendaciones

---

## 5. Monitoreo de Webhook y API

### Ver estado

```bash
npm run dev webhook-stats
```

### Métricas clave

- **Webhooks**: % de fallos, firmas inválidas, tiempo de procesamiento
- **API**: % de errores, rate limits (429), tiempo de respuesta

### Alertas automáticas

- Más de 20% de webhooks fallidos en 1 hora → DEGRADED
- Firma HMAC inválida → CRITICAL (posible ataque)
- Más de 3 rate limits (429) en 1 hora → DEGRADED
- Tiempo promedio de respuesta > 5s → DEGRADED

---

## 6. Configuración de Scheduler para Compliance

Jobs recomendados para agregar a `src/scheduler/jobs.ts`:

```typescript
{
  name: 'backup-diario',
  description: 'Backup automático diario del sistema',
  defaultCron: '0 3 * * *', // 3 AM
  handler: async () => {
    const { createBackup } = await import('../compliance/backup.js');
    return createBackup({ reason: 'backup-diario-automatico' });
  },
},
{
  name: 'purge-backups-antiguos',
  description: 'Elimina backups más allá del período de retención',
  defaultCron: '0 4 * * 0', // Domingo 4 AM
  handler: async () => {
    const { purgeOldBackups } = await import('../compliance/backup.js');
    const deleted = purgeOldBackups();
    return { deleted };
  },
},
{
  name: 'health-check-compliance',
  description: 'Verificación de salud del sistema de compliance',
  defaultCron: '0 */6 * * *', // Cada 6 horas
  handler: async () => {
    const { runHealthChecks } = await import('../compliance/healthCheck.js');
    return runHealthChecks();
  },
},
{
  name: 'alertas-compliance',
  description: 'Revisa y envía alertas de compliance',
  defaultCron: '*/30 * * * *', // Cada 30 minutos
  handler: async () => {
    const { checkAndAlert } = await import('../compliance/alerts.js');
    return checkAndAlert();
  },
},
{
  name: 'reporte-clientes-semanal',
  description: 'Envía reportes semanales a todos los clientes',
  defaultCron: '0 9 * * 1', // Lunes 9 AM
  handler: async () => {
    const { sendWeeklyClientReport } = await import('../compliance/clientReports.js');
    await sendWeeklyClientReport('cliente-default'); // Iterar sobre todos los clientes
    return { sent: true };
  },
},
```

---

## 7. Checklist de Operación Diaria

### Al inicio del día

- [ ] `npm run dev health-check`
- [ ] `npm run dev webhook-stats`
- [ ] `npm run dev compliance-rate-limits`
- [ ] Revisar alertas pendientes en Slack
- [ ] Verificar que no hay emergencia activa

### Durante el día

- [ ] Revisar aprobaciones de contenido pendientes
- [ ] Monitorear audit log por anomalías
- [ ] Verificar que DRY_RUN está como corresponde

### Al final del día

- [ ] `npm run dev compliance-audit --limit=20`
- [ ] Revisar backups (verificar que backup-diario corrió)
- [ ] Documentar cualquier incidente

### Semanal (lunes)

- [ ] `npm run dev auditoria-semanal`
- [ ] Revisar reportes de clientes enviados
- [ ] Revisar métricas de compliance

### Mensual

- [ ] `npm run dev auditoria-mensual`
- [ ] Revisar consentimientos UGC vencidos
- [ ] Analizar tendencias de bloqueos

### Trimestral

- [ ] `npm run dev auditoria-trimestral`
- [ ] Revisar términos actualizados de Meta
- [ ] Rotar credenciales de API
- [ ] Capacitación de recertificación del equipo

---

## 8. Escenarios de Troubleshooting

### "El guardian bloquea TODO"

1. Verificar `COMPLIANCE_STRICT_MODE` — si es true, bloquea también reglas MEDIA
2. Revisar `data/brand.json` — asegurar que `voice.forbidden` no sea demasiado amplio
3. Ejecutar `npm run dev compliance-check --texto="texto de prueba"` para ver qué regla se dispara

### "No puedo publicar aunque DRY_RUN=false"

1. `npm run dev compliance-status` — verificar términos aceptados
2. `npm run dev preflight` — verificar configuración
3. Revisar si hay crisis activa: `npm run dev crisis-estado`
4. Revisar si hay emergencia activa: verificar `data/runtime/emergency-state.json`

### "Rate limits siempre bloquean"

1. `npm run dev compliance-rate-limits` — ver cuáles están saturados
2. Reducir frecuencia de scheduler jobs
3. Aumentar `minSecondsBetween` en `src/compliance/rateLimiter.ts` si es necesario
4. NUNCA aumentar `maxPerHour` o `maxPerDay` sin justificación

### "Webhook no recibe eventos"

1. `npm run dev webhook-stats` — verificar salud
2. Verificar URL del webhook en Meta Developers Console
3. Verificar que `META_VERIFY_TOKEN` coincide
4. Verificar firma HMAC con `META_APP_SECRET`
5. Revisar logs del servidor HTTP

---

## 9. Integración con CI/CD

### Pre-deployment checklist

```bash
npm run typecheck
npm run lint
npm run dev preflight
npm run dev compliance-self-test
```

### Post-deployment

```bash
npm run dev health-check
npm run dev backup-crear --razon="Post-deploy"
```

---

**Versión**: 1.0 | **Actualización**: 2026-05-14  
**Requiere**: Haber completado ONBOARDING.md y TRAINING.md
