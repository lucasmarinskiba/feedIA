---
description: Product Marketing Context — ICP, positioning, target audience doc base
---

Product Marketing para FeedIA. Crea contexto base reutilizable por todas las skills.

## Según $ARGUMENTS

**"init [brand]"** → Crea `data/product-marketing.json` con ICP + positioning + USP + voice.

**"icp"** → Ideal Customer Profile detallado (firmographics + psychographics + jobs-to-be-done).

**"positioning"** → Frase de posicionamiento: "Para [target] que [pain], [producto] es [category] que [benefit] a diferencia de [alternative]."

**"usp"** → Unique Selling Proposition en 1 frase memorable.

**"jtbd"** → Jobs-to-be-Done: functional + emotional + social jobs.

**"messaging"** → Messaging house: tagline + 3 pillars + 9 proof points.

**"competitors-vs"** → Tabla nosotros vs cada competidor (feature matrix).

## Estructura del doc

```json
{
  "brand": "FeedIA",
  "category": "AI Instagram automation platform",
  "icp": {
    "demographics": { ageRange: [25, 50], geo: ["LATAM", "Spain"] },
    "firmographics": { companySize: "1-50", industry: "any with IG presence" },
    "psychographics": { values, fears, desires },
    "techStack": ["Instagram Business", "Canva opcional", "WhatsApp Business"]
  },
  "positioning": "Para PyMEs y creadores de LATAM que pierden 20+ horas/mes en Instagram, FeedIA es la plataforma de IA autónoma que crea, publica y gestiona todo el contenido por vos — a diferencia de Hootsuite/Buffer que solo programan.",
  "usp": "El único CM de IA que realmente publica solo, no solo programa.",
  "jtbd": {
    "functional": ["crear contenido", "publicar a horario", "responder DMs"],
    "emotional": ["sentirme profesional", "no quedarme atrás de competidores"],
    "social": ["que mi cuenta se vea seria", "tener autoridad en mi nicho"]
  },
  "messagingHouse": {
    "tagline": "Tu CM de IA que nunca duerme",
    "pillars": ["Autonomía total", "Calidad humana", "Resultados medibles"],
    "proofPoints": ["100% auto", "0 frases robóticas", "ROI 5x promedio"]
  },
  "voiceOfMarket": ["frases reales que dicen los clientes en reviews/DMs"]
}
```

## Uso por otras skills

Todas las skills leen este JSON antes de generar contenido. Esto asegura coherencia:

- `quickCarousel` lo usa para refinar prompts
- `aidaCopywriter` aplica positioning + USP
- `humanizer` usa voiceOfMarket
- `bioOptimizer` usa tagline + pillars
- `competitorProfiling` compara vs competitors-vs

## Endpoint

```
POST /api/product-marketing/init  → crear/actualizar
GET  /api/product-marketing       → leer contexto actual
```

## 🧠 Cerebro FeedIA — hereda `/feedIA-brain`

Rol: **product marketer (posicionamiento + mensaje)**. Algoritmo: diferencia IG (sends/saves, grafo+Reels) de TikTok (completion/FYP en frío) y aplica el correcto. Salida lista para usar, voz de marca, sin tells de IA, máxima elocuencia, mínimo esfuerzo del usuario.
