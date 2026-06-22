---
description: Web Artifacts Builder — HTML artifacts complejos (React, Tailwind, shadcn/ui)
---

Web Artifacts Builder para FeedIA. Genera artifacts HTML completos con estado, routing, componentes.

## Según $ARGUMENTS

**"landing [oferta]"** → Landing page completa React + Tailwind + shadcn/ui.

**"dashboard [data]"** → Dashboard con charts, filtros, state management.

**"calculator [tipo]"** → Calculadora interactiva (ROI, pricing, ahorro tiempo, etc).

**"quiz [tema]"** → Quiz interactivo con scoring + result page.

**"form [campos]"** → Multi-step form con validación.

**"pricing-table [tiers]"** → Pricing table interactiva con toggle monthly/annual.

**"testimonials [data]"** → Carousel/grid de testimonios.

**"changelog [versions]"** → Changelog con filtros + búsqueda.

## Stack default

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
      // shadcn-style components inline
      // state via React hooks
      // ...
    </script>
  </body>
</html>
```

## Cuándo usar

- ✅ Componente con state + routing
- ✅ Multi-step flow
- ✅ Interactive viz (charts)
- ✅ Form complejo con validación
- ✅ Quiz/calculator
- ❌ Static HTML simple (overkill)
- ❌ Solo styling (usa Tailwind directo)
- ❌ Backend logic (separar)

## Componentes shadcn/ui-style disponibles

- `Button` — variants: default/secondary/destructive/ghost/outline
- `Card` — header, content, footer
- `Input` — text, email, password, number
- `Select` — dropdown con search
- `Dialog` — modal accesible
- `Toast` — notifications
- `Tabs` — tabs navigation
- `Accordion` — collapsible sections
- `Badge` — status indicators
- `Avatar` — user images
- `Progress` — progress bars
- `Slider` — range input
- `Switch` — toggle
- `Tooltip` — hover info

## Output

HTML artifact único (sin build step):

```
/output/artifacts/{name}.html
```

Servible vía `/api/artifacts/{name}` → embed en email, share link, etc.

## Integración con FeedIA

- Landing pages → `cro` skill optimiza conversiones
- Calculadoras → leads en `crm` skill
- Quizzes → segmenta audiencia para `nurture`
- Pricing tables → A/B test desde `pricing` skill

## Templates listos para FeedIA

1. **"Calcula cuánto ahorrás con FeedIA"** — input horas/semana CM → output $ ahorro/mes
2. **"Quiz: ¿Qué plan FeedIA te conviene?"** — 5 preguntas → recomienda Pro/Business
3. **"Landing FeedIA"** — hero + features + pricing + testimonials + CTA
4. **"Dashboard demo"** — mock dashboard interactivo para demos
5. **"ROI calculator"** — proyecta ROI 12 meses según uso

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **constructor de artefactos web (landing/UI)**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
