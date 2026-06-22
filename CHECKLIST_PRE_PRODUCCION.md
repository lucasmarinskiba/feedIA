# Checklist Pre-Producción

## ⚠️ ANTES DE CAMBIAR `DRY_RUN=false`

Este checklist tiene **50+ items** que DEBÉS verificar antes de operar en producción. Cada item tiene un `[ ]` para marcar. Guardá una copia firmada en `data/runtime/pre-prod-checklist.json`.

---

## Sección A: Documentación Legal y Compliance

- [ ] **A.1** Leí completamente `TERMS_OF_SERVICE.md`
- [ ] **A.2** Leí completamente `COMPLIANCE.md`
- [ ] **A.3** Leí completamente `ONBOARDING.md`
- [ ] **A.4** Entiendo que NO hay garantía anti-baneo
- [ ] **A.5** Entiendo que soy responsable del contenido publicado
- [ ] **A.6** `COMPLIANCE_ACCEPTED_TERMS=true` está configurado en `.env`
- [ ] **A.7** `COMPLIANCE_STRICT_MODE=true` está activo
- [ ] **A.8** El onboarding está completado (`data/runtime/onboarding-complete.json` existe)
- [ ] **A.9** Tengo contacto legal identificado ante problemas con Meta
- [ ] **A.10** Tengo plan de comunicación ante incidente (template listo)

---

## Sección B: Configuración Técnica

- [ ] **B.1** `ANTHROPIC_API_KEY` configurado y válido
- [ ] **B.2** `CLAUDE_MODEL_PRIMARY` y `CLAUDE_MODEL_FAST` configurados
- [ ] **B.3** `DRY_RUN=true` (todavía, hasta que termine este checklist)
- [ ] **B.4** `LOG_LEVEL=info` o `debug` (no `silent`)
- [ ] **B.5** `TIMEZONE` configurado correctamente
- [ ] **B.6** `META_ACCESS_TOKEN` generado con permisos mínimos necesarios
- [ ] **B.7** `META_IG_BUSINESS_ID` correcto y verificado
- [ ] **B.8** `META_PAGE_ID` correcto
- [ ] **B.9** `META_APP_SECRET` configurado para validación HMAC
- [ ] **B.10** `META_VERIFY_TOKEN` configurado para webhook
- [ ] **B.11** Meta App está en modo **Live** (no Development)
- [ ] **B.12** Permisos de API son los mínimos necesarios (no over-scoping)
- [ ] **B.13** Webhook registrado y verificado en Meta Developers Console
- [ ] **B.14** Firma HMAC-SHA256 validada (prueba con webhook de prueba)
- [ ] **B.15** URL del webhook es HTTPS (no HTTP en producción)
- [ ] **B.16** `DAEMON_PORT` configurado y firewall abierto

---

## Sección C: Brand y Contenido

- [ ] **C.1** `data/brand.json` completado con datos reales
- [ ] **C.2** `voice.forbidden` tiene al menos 5 palabras/frases prohibidas
- [ ] **C.3** `voice.tone` describe correctamente la personalidad de marca
- [ ] **C.4** `audience.pains` y `audience.desires` están definidos
- [ ] **C.5** `goals.primary` alineado con objetivo de negocio real
- [ ] **C.6** `competitors` tiene al menos 3 cuentas faro reales
- [ ] **C.7** `hashtagPools` tiene hashtags organizados por tier
- [ ] **C.8** Generé al menos 5 piezas de contenido de prueba en DRY_RUN
- [ ] **C.9** Revisé cada pieza manualmente antes de simular publicación
- [ ] **C.10** Brand safety auditor probado con 10+ casos de prueba
- [ ] **C.11** No hay contenido con promesas garantizadas o clickbait
- [ ] **C.12** No hay contenido con datos personales o PII
- [ ] **C.13** Hashtags auditados: 0 baneados en los pools activos
- [ ] **C.14** Canva templates configurados con campos parametrizados
- [ ] **C.15** Canva templates tienen licencias válidas
- [ ] **C.16** Imágenes/música para Reels tienen licencias válidas
- [ ] **C.17** UGC: flujo de permisos documentado y probado
- [ ] **C.18** Política de contenido prohibido personalizada cargada

---

## Sección D: Integraciones

- [ ] **D.1** CRM configurado (`CRM_PROVIDER`, `CRM_API_KEY`, `CRM_DATABASE_ID`)
- [ ] **D.2** CRM sync probado en DRY_RUN sin enviar datos reales
- [ ] **D.3** Notificaciones Slack configuradas (`SLACK_WEBHOOK_URL`)
- [ ] **D.4** Notificaciones de prueba enviadas y recibidas
- [ ] **D.5** Webhook genérico configurado si aplica (`NOTIFICATIONS_WEBHOOK_URL`)
- [ ] **D.6** Canva API token configurado (OAuth o estático)
- [ ] **D.7** Canva templates IDs correctos
- [ ] **D.8** Make/n8n/Zapier webhook configurado si se usa como puente
- [ ] **D.9** Integraciones de terceros inventariadas

---

## Sección E: Bot y Automatizaciones

- [ ] **E.1** `BOT_AUTO_REPLY_ENABLED=false` (mantener deshabilitado al inicio)
- [ ] **E.2** `BOT_POLL_INTERVAL_SECONDS` >= 60 (no más frecuente)
- [ ] **E.3** `BOT_MAX_AUTO_REPLIES_PER_USER_PER_DAY` <= 3
- [ ] **E.4** `BOT_QUIET_HOURS_START` y `END` configurados razonablemente
- [ ] **E.5** `BOT_ESCALATE_THRESHOLD` >= 0.7
- [ ] **E.6** Bot simulado con 10+ conversaciones de prueba
- [ ] **E.7** Rails de seguridad probados con mensajes sensibles
- [ ] **E.8** Bot no responde preguntas de precio sin escalamiento
- [ ] **E.9** Bot no solicita datos personales
- [ ] **E.10** Nurture sequences vacías o en modo simulación inicial
- [ ] **E.11** Scheduler jobs listados y cron validado
- [ ] **E.12** No hay jobs de playbook comentados activos (posible riesgo)

---

## Sección F: Rate Limits y Compliance Técnico

- [ ] **F.1** `COMPLIANCE_MAX_DAILY_PUBLISH` <= 15 (conservador)
- [ ] **F.2** `COMPLIANCE_MAX_DAILY_DM` <= 100 (conservador)
- [ ] **F.3** `COMPLIANCE_MAX_DAILY_COMMENTS` <= 200 (conservador)
- [ ] **F.4** `COMPLIANCE_AUDIT_RETENTION_DAYS` >= 90
- [ ] **F.5** Rate limits probados: publicar 5 posts simulados en 1 hora
- [ ] **F.6** Rate limits probados: 50 DMs simulados en modo dry_run
- [ ] **F.7** Test de estrés: contenido límite que roza las reglas
- [ ] **F.8** Guardian bloquea correctamente contenido prohibido
- [ ] **F.9** Guardian permite contenido legítimo
- [ ] **F.10** Audit log escribe correctamente en `data/runtime/audit/`
- [ ] **F.11** Audit log sanitiza datos personales ([EMAIL], [TEL])
- [ ] **F.12** `npm run dev compliance-status` muestra todo OK
- [ ] **F.13** `npm run dev compliance-rate-limits` no muestra anomalías
- [ ] **F.14** No hay módulos antiBan activos en flujos productivos
- [ ] **F.15** Revisión de código custom por posibles violaciones

---

## Sección G: Infraestructura y Seguridad

- [ ] **G.1** Servidor tiene firewall activo
- [ ] **G.2** Solo puertos necesarios abiertos
- [ ] **G.3** Acceso SSH por key, no password
- [ ] **G.4** Usuario del sistema tiene permisos mínimos
- [ ] **G.5** Logs del sistema rotados y monitoreados
- [ ] **G.6** Backup de `data/runtime/` configurado (automático diario)
- [ ] **G.7** Backup de `.env` en lugar seguro (fuera del repo)
- [ ] **G.8** `.env` en `.gitignore` (nunca commiteado)
- [ ] **G.9** `data/runtime/` en `.gitignore`
- [ ] **G.10** Espacio en disco > 5GB libre
- [ ] **G.11** VPS/ servidor documentado (IP, proveedor, acceso)
- [ ] **G.12** VPN/IPs documentadas para soporte de Meta

---

## Sección H: Equipo y Procesos

- [ ] **H.1** Responsable de escalamiento definido y contactable
- [ ] **H.2** Backup del responsable definido
- [ ] **H.3** Canal de emergencia configurado (teléfono/Signal/Telegram)
- [ ] **H.4** Capacitación del equipo completada (módulos 1-7)
- [ ] **H.5** Examen de certificación pasado (> 80%)
- [ ] **H.6** Certificación registrada en `data/runtime/certifications.json`
- [ ] **H.7** SLA definido con cliente (tiempos de respuesta, alcance)
- [ ] **H.8** Documento de arquitectura técnica actualizado
- [ ] **H.9** Escalamiento: quién decide contenido borderline
- [ ] **H.10** Plan de rollback: cómo desactivar todo en < 5 minutos
- [ ] **H.11** Revisión trimestral calendarizada en calendario compartido

---

## Sección I: Cliente y Contrato

- [ ] **I.1** Cliente leyó y firmó términos de servicio
- [ ] **I.2** Cliente entiende que no hay garantía anti-baneo
- [ ] **I.3** Cliente aprobó voz de marca y palabras prohibidas
- [ ] **I.4** Cliente aprobó cuentas faro y competidores a monitorear
- [ ] **I.5** Cliente entregó assets visuales con licencias válidas
- [ ] **I.6** Cliente designó aprobador de contenido final
- [ ] **I.7** Cliente entiende horarios de publicación propuestos
- [ ] **I.8** Cliente conoce canales de comunicación de emergencia
- [ ] **I.9** Política de retención de datos alineada con GDPR/LGPD si aplica
- [ ] **I.10** Contrato tiene cláusula de responsabilidad clara

---

## Sección J: Verificación Final

- [ ] **J.1** Ejecuté `npm run typecheck` → 0 errores
- [ ] **J.2** Ejecuté `npm run lint` → 0 errores (warnings aceptables)
- [ ] **J.3** Ejecuté `npm run dev compliance-status` → todo OK
- [ ] **J.4** Ejecuté `npm run dev preflight` → PASS (si ya existe)
- [ ] **J.5** Plan semanal generado y aprobado manualmente
- [ ] **J.6** Dashboard accesible y funcionando (si aplica)
- [ ] **J.7** Primeras 10 publicaciones van a requerir aprobación humana SIEMPRE
- [ ] **J.8** Sé cómo pausar todo en emergencia (`npm run dev emergency-stop` si existe)
- [ ] **J.9** Contacto de soporte de Meta documentado
- [ ] **J.10** Tengo acceso a Meta Business Suite del cliente

---

## ✅ FIRMA DE APROBACIÓN

Al firmar, confirmo que:

1. Completé todos los items aplicables de este checklist
2. Entiendo los riesgos de operar en producción
3. Estoy preparado para responder ante incidentes
4. Acepto la responsabilidad de las acciones del sistema

```
Nombre del operador: _________________________
Email: ______________________________________
Fecha: ______________________________________
Firma digital: ______________________________

Nombre del responsable legal/gerente: _________
Email: ______________________________________
Fecha: ______________________________________
Firma digital: ______________________________
```

---

## Post-Firma: Activación de Producción

Solo después de las firmas:

1. Cambiar en `.env`:

   ```bash
   DRY_RUN=false
   COMPLIANCE_ACCEPTED_TERMS=true
   ```

2. Reiniciar el daemon:

   ```bash
   npm run dev daemon
   ```

3. Verificar inmediatamente:

   ```bash
   npm run dev compliance-status
   npm run dev compliance-audit --limit=5
   ```

4. Monitorear las primeras 24h intensivamente.

---

**Versión**: 1.0 | **Items totales**: 95 | **Última actualización**: 2026-05-14
