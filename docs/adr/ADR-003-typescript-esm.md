# ADR-003: TypeScript ESM

## Status

Accepted

## Context

El proyecto usa Node 20+. ESM es el estándar moderno y permite top-level await.

## Decision

Usar TypeScript con `module: ESNext`, `moduleResolution: Bundler` y output ESM.

## Consequences

- Imports con extensión `.js` obligatoria.
- Compatibilidad con librerías modernas.
- Mejor tree-shaking y startup.
