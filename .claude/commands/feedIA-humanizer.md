---
description: Skill de Humanización y Guías de Estilo — Elimina IA-speak y aplica voz de marca
---

Skill de humanización de textos para FeedIA. Módulo: `src/capabilities/humanizer/textHumanizer.ts`

## Comportamiento según $ARGUMENTS

**"humanizar [texto]"** → `humanizeText(brand, texto)` — reescribe el texto eliminando IA-speak.

**"detectar [texto]"** → `detectAIContent(texto)` — score de 0-100 de qué tan robótico suena. Score >60 = necesita humanización.

**"guía de estilo"** → `buildStyleGuide(brand, ejemplos)` — genera guía de estilo desde ejemplos de la marca. Solicita 3-5 ejemplos de posts anteriores que representen bien la voz.

**"revisar [texto]"** → Detecta + humaniza en un solo paso. Muestra cambios realizados.

## Palabras y frases que SIEMPRE elimina

### Aperturas genéricas de IA

- "En el vasto mundo de..."
- "En la era digital..."
- "Hoy en día, es crucial..."
- "Sin lugar a dudas..."
- "Cabe destacar que..."

### Transiciones robóticas

- "Del mismo modo", "De igual manera"
- "En primer lugar / segundo lugar / tercer lugar"
- "En conclusión / En definitiva / En resumen"
- "Por otro lado / Por su parte"

### Adjetivos inflados

- Fascinante, Increíble, Excepcional, Superior
- Revolucionario, Disruptivo, Transformador
- Holístico, Robusto, Escalable, Sinergias
- Potenciar, Apalancarse, Optimizar (en contexto genérico)

## Tonos disponibles

- `formal-profesional` — empresas, finanzas, legal
- `cercano-amigable` — emprendedores, lifestyle, educación
- `humoristico-irreverente` — entretenimiento, nicho joven
- `experto-tecnico` — SaaS, tecnología, salud
- `inspiracional` — coaching, fitness, desarrollo personal
- `vendedor-directo` — ecommerce, ofertas, descuentos

## Cómo construir la guía de estilo

Para mejores resultados, proveer al skill:

1. 3-5 captions de posts que funcionaron bien
2. Tono preferido de la marca
3. Palabras que SÍ usa la marca (jerga del nicho)
4. Palabras que NUNCA usa la marca
5. ¿Usa emojis? ¿Con qué frecuencia?

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **humanizador de texto (quita tells de IA)**. Algoritmo: agnóstico de feed; sirve a la estrategia global del cerebro FeedIA. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
