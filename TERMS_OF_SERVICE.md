# Términos de Servicio del Sistema

## ⚠️ OBLIGATORIO LEER ANTES DE OPERAR

Al usar este sistema ("Agente IA — Especialista Instagram"), vos (el operador, administrador o cliente final) aceptás cumplir con estos términos. **El sistema NO funcionará en modo producción hasta que aceptés estos términos explícitamente configurando `COMPLIANCE_ACCEPTED_TERMS=true`.**

---

## 1. Naturaleza del Sistema

Este sistema es una **herramienta de asistencia para community managers, marketers y creadores de contenido**. No es un "hacker" de Instagram, ni un evasor de límites, ni un generador de engagement artificial.

El sistema te ayuda a:

- Planificar y crear contenido de calidad
- Responder mensajes y comentarios de forma contextual
- Analizar tendencias y competidores
- Gestionar tu comunidad con criterio humano

El sistema **NO** te ayuda a:

- Evadir las reglas de Instagram
- Comprar o generar seguidores falsos
- Scrapear datos de usuarios sin permiso
- Enviar spam masivo
- Suplantar identidades

---

## 2. Compromisos del Operador

Al usar este sistema, te comprometés a:

### 2.1 Respetar los Términos de Instagram

Vos y tus clientes deben cumplir con:

- [Instagram Terms of Use](https://help.instagram.com/581066165581870)
- [Instagram Community Standards](https://help.instagram.com/477434105621119)
- [Meta Platform Terms](https://developers.facebook.com/terms/)
- [Meta Developer Policies](https://developers.facebook.com/policy/)

### 2.2 Usar la API Oficial de Meta

Toda interacción con Instagram debe realizarse a través de:

- **Meta Graph API** con permisos válidos y aprobados
- **Webhooks oficiales** de Meta para recibir eventos
- **OAuth** para autenticación (nunca solicitar contraseñas de Instagram)

### 2.3 No automatizar acciones no autorizadas

Queda **estrictamente prohibido**:

- Usar este sistema para crear cuentas automáticamente
- Extraer datos de perfiles, seguidores o contactos sin autorización
- Simular comportamiento humano con la intención de engañar a Instagram
- Eludir rate limits, verificaciones CAPTCHA o cualquier medida de seguridad

### 2.4 Obtener consentimiento

Antes de:

- Enviar secuencias automatizadas de DMs → el usuario debe haber contactado primero o dado consentimiento explícito
- Publicar UGC (contenido de usuarios) → obtener permiso por escrito del creador
- Compartir testimonios o datos de clientes → obtener autorización

### 2.5 Transparencia

Si un usuario pregunta si está hablando con un bot, no podés mentir. El sistema debe operar con **transparencia**. Recomendamos:

- Incluir en la bio o highlights que usás asistencia de IA
- No ocultar la naturaleza automatizada de las respuestas cuando se pregunte directamente

---

## 3. Responsabilidad y Riesgos

### 3.1 El operador es responsable

**Vos sos responsable del contenido que publicás y de las interacciones que realizás** a través de este sistema. El sistema tiene salvaguardas técnicas, pero la decisión final de publicar, enviar o interactuar es tuya (o de tu cliente).

### 3.2 Riesgo de baneo

Ningún sistema puede garantizar un "0% de riesgo de baneo". Instagram/Meta tiene algoritmos propietarios que detectan patrones de comportamiento. Sin embargo, este sistema minimiza el riesgo mediante:

- Rate limits conservadores
- Análisis de contenido pre-publicación
- Bloqueo de acciones que violen las reglas
- Transparencia en las interacciones

**Si Instagram decide banear una cuenta, no nos hacemos responsables.** Eso puede ocurrir por:

- Contenido que viola Community Standards (incluso si lo aprobaste manualmente)
- Reportes de usuarios
- Decisiones algorítmicas de Meta que no controlamos
- Uso del sistema de manera que contradiga estos términos

### 3.3 Modo DRY_RUN por defecto

El sistema inicia en modo `DRY_RUN=true`, lo que significa que **no publica nada** hasta que vos lo configures explícitamente. Esto te da tiempo de:

- Revisar todo el contenido generado
- Entender cómo funciona el sistema
- Configurar correctamente las integraciones

---

## 4. Licencia de Uso

Este sistema se te proporciona "tal cual" (as-is) para uso legítimo en gestión de redes sociales. No podés:

- Revender el sistema como herramienta de "anti-baneo" o "hackeo" de Instagram
- Usarlo para actividades ilegales o fraudulentas
- Eliminar o desactivar los mecanismos de compliance

---

## 5. Aceptación

Para activar el sistema en modo producción, debés:

1. **Leer completamente** este documento (`TERMS_OF_SERVICE.md`)
2. **Leer** `COMPLIANCE.md` para entender las salvaguardas técnicas
3. **Configurar** en tu `.env`:
   ```
   COMPLIANCE_ACCEPTED_TERMS=true
   ```
4. **Confirmar** que entendés que el uso indebido puede resultar en:
   - Suspensión de la cuenta de Instagram
   - Acciones legales por parte de Meta
   - Pérdida de datos o reputación

---

## 6. Contacto y Soporte

Si tenés dudas sobre si una acción específica está permitida:

1. Consultá `COMPLIANCE.md`
2. Revisá los logs de auditoría en `data/runtime/audit/`
3. Consultá directamente los términos oficiales de Meta/Instagram

---

**Última actualización:** 2025-01-01  
**Versión:** 1.0
