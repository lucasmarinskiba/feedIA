# ADR-002: BullMQ para workers asíncronos

## Status

Accepted

## Context

El sistema genera video, publica contenido, audita cuentas y forja contenido de forma asíncrona. Necesitamos colas confiables con retries.

## Decision

Usar **BullMQ** sobre Redis.

## Consequences

- Retry exponencial, dead-letter y rate limiting nativo.
- Workers corren en contenedores separados del frontend.
- Requiere Redis persistente en producción.
