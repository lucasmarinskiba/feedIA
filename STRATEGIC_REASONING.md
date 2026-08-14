# Strategic Reasoning Agent — Decision Engine

Multi-dimensional reasoning for competitive strategy, pricing, budget allocation, and market positioning.

## Three Pillars

### 1. Competitive Analysis
```bash
POST /api/strategy/analyze-competitors
```

**Input:**
```json
{
  "competitors": [
    {
      "name": "Stripe",
      "pricing": 2.9,
      "features": ["payments", "subscriptions", "fraud-detection"],
      "positioning": "Global payments for internet",
      "weaknesses": ["high fees", "slow onboarding"]
    }
  ]
}
```

**Output:**
```json
{
  "averagePrice": 89,
  "priceRange": [29, 299],
  "topThreats": [...],
  "gapOpportunities": ["AI-recommendations", "creator-tools"]
}
```

**Logic:**
- Average price = mean of all competitors
- Top threats = highest (features + pricing) score
- Gaps = features claimed by some competitors, missing in top 3

### 2. Pricing Strategy
```bash
POST /api/strategy/recommend-pricing
```

**Input:**
```json
{
  "context": {
    "ourPrice": 99,
    "ourFeatures": ["feature1", "feature2", "feature3"],
    "competitorCount": 5,
    "marketSize": 10000,
    "growthRate": 15
  },
  "competitors": [...]
}
```

**Output:**
```json
{
  "recommendedPrice": 79,
  "competitivePosition": "value",
  "pricePoints": [
    { "price": 55, "elasticity": "high (high volume, low margin)" },
    { "price": 79, "elasticity": "medium (recommended)" },
    { "price": 111, "elasticity": "low (premium tier)" }
  ],
  "rationale": "Market average $89. Value position = $79 (10% discount)."
}
```

**Strategy Rules:**
- **Premium** (+2 unique features): 30% above market average
- **Disruptor** (<10 competitors): 40% below market average
- **Value** (default): 10% below market average

### 3. Budget Allocation
```bash
POST /api/strategy/allocate-budget
```

**Input:**
```json
{
  "monthlyRevenue": 50000,
  "growthRate": 25
}
```

**Output:**
```json
{
  "marketing": 30,
  "product": 30,
  "ops": 30,
  "reserve": 10,
  "rationale": "Mid-stage scaling. Balanced allocation across all three pillars.",
  "dollars": {
    "marketing": 15000,
    "product": 15000,
    "ops": 15000,
    "reserve": 5000
  }
}
```

**Allocation by Stage:**
- **Bootstrap** (<10% MoM): 40% product, 35% marketing, 15% ops, 10% reserve
- **Scaling** (10-50% MoM): 30% product, 30% marketing, 30% ops, 10% reserve
- **Hypergrowth** (>50% MoM): 20% product, 20% marketing, 40% ops, 20% reserve

### 4. Market Positioning
```bash
POST /api/strategy/position
```

**Input:**
```json
{
  "ourFeatures": ["AI-powered", "creator-native", "fast-onboarding"],
  "mainCompetitor": {
    "name": "Stripe",
    "features": ["payments", "subscriptions"],
    "positioning": "Global payments"
  },
  "targetSegment": "creator"
}
```

**Output:**
```json
{
  "coreMessage": "Creators first. AI-powered recommendations built in from day 1.",
  "targetSegment": "creator",
  "defensibleAdvantage": "AI-powered recommendations",
  "vs": "Stripe",
  "nextSteps": [
    "Validate defensible advantage with 5 customer interviews",
    "Create comparison matrix: us vs Stripe",
    "Test messaging on LinkedIn + Twitter",
    "Build case studies highlighting unique advantage",
    "Price 20% below if value position, 30% above if premium"
  ]
}
```

**Segment-Specific Messages:**
- **Enterprise:** "Enterprise-grade [advantage] at mid-market price"
- **Creator:** "Creators first. [Advantage] built in from day 1"
- **General:** "[Advantage]. No complexity. Focus on what matters"

## Full Analysis

```bash
POST /api/strategy/full-analysis
```

**All four dimensions in one call:**
- Competitive landscape
- Pricing recommendation
- Budget allocation
- Market positioning

**Response includes:**
```json
{
  "competitiveAnalysis": {...},
  "pricingRecommendation": {...},
  "budgetAllocation": {...},
  "positioning": {...},
  "executive_summary": "Market: 5 competitors, avg price $89. Recommendation: VALUE position at $79/mo..."
}
```

## Decision Framework

### When to Use Each Endpoint

**Quarterly Planning:**
→ Use `/full-analysis` for complete strategic picture

**Pricing Changes:**
→ Use `/recommend-pricing` + `/analyze-competitors`

**Budget Reallocation:**
→ Use `/allocate-budget` (monthly)

**New Product Launch:**
→ Use `/position` + `/recommend-pricing`

## Examples

### Scenario 1: SaaS Pricing Optimization
```bash
curl -X POST http://localhost:3000/api/strategy/recommend-pricing \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "ourPrice": 99,
      "ourFeatures": ["api", "webhooks", "rate-limiting", "ai-analytics"],
      "competitorCount": 8,
      "marketSize": 50000,
      "growthRate": 18
    },
    "competitors": [
      {"name": "Competitor A", "pricing": 79, "features": [...], ...},
      {"name": "Competitor B", "pricing": 149, "features": [...], ...}
    ]
  }'
```

→ Response: "PREMIUM positioning. Recommend $129/mo. Your 4 features vs top competitor's 2."

### Scenario 2: Market Entry Strategy
```bash
curl -X POST http://localhost:3000/api/strategy/full-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "context": { ... },
    "competitors": [ ... ],
    "targetSegment": "creator"
  }'
```

→ Response includes: competitive gaps, pricing, budget allocation, and positioning message.

### Scenario 3: Budget Planning (High Growth)
```bash
curl -X POST http://localhost:3000/api/strategy/allocate-budget \
  -H "Content-Type: application/json" \
  -d '{
    "monthlyRevenue": 500000,
    "growthRate": 75
  }'
```

→ Response: "Hypergrowth mode: 40% ops ($200k) to handle scale, 20% reserve ($100k) for cash buffer."

## Integration with FeedIA

**Strategic Reasoning ↔ Business Logic:**

1. **Tier Pricing** → Use `/recommend-pricing` to auto-adjust free/pro/agency based on market
2. **Marketing Spend** → Use `/allocate-budget` to inform daily spend caps (Cost Guardian)
3. **Positioning Copy** → Use `/position` output as prompt context for copy generation
4. **Competitive Moats** → Analyze `/analyze-competitors` gaps → feature prioritization

## Algorithm Details

### Competitive Advantage Calculation
```
advantage_count = ourFeatures.length - topCompetitor.features.length

if advantage_count > 2 → Premium (30% markup)
else if competitors.length < 10 → Disruptor (40% discount)
else → Value (10% discount)
```

### Budget Stage Detection
```
if growthRate < 10% → Bootstrap (product-heavy)
else if growthRate < 50% → Scaling (balanced)
else → Hypergrowth (ops-heavy, cash guard)
```

### Gap Opportunity Identification
```
gaps = allFeatures - topThreatsFeatures
prioritized = gaps sorted by competitive frequency
```

## Testing

```bash
# 1. Analyze competitors
curl http://localhost:3000/api/strategy/analyze-competitors \
  -d '{"competitors": [...]}'

# 2. Get pricing recommendation
curl http://localhost:3000/api/strategy/recommend-pricing \
  -d '{"context": {...}, "competitors": [...]}'

# 3. Allocate budget
curl http://localhost:3000/api/strategy/allocate-budget \
  -d '{"monthlyRevenue": 50000, "growthRate": 25}'

# 4. Generate positioning
curl http://localhost:3000/api/strategy/position \
  -d '{"ourFeatures": [...], "mainCompetitor": {...}, "targetSegment": "creator"}'

# 5. Full analysis
curl http://localhost:3000/api/strategy/full-analysis \
  -d '{"context": {...}, "competitors": [...], "targetSegment": "creator"}'
```

## Output Format

All responses include:
- `success: boolean`
- `analysis` / `recommendation` / `allocation` / `positioning` (core data)
- `summary` (1-2 sentence human-readable explanation)
- `executive_summary` (for full-analysis only)

## Limitations

❌ Not real-time market data (use external API for live pricing)
❌ Heuristic-based (not ML-trained on actual market dynamics)
❌ No macroeconomic factors (recession, seasonality)
❌ Assumes rational actors (doesn't account for irrational competition)

## Next Steps

1. **Live data integration:** Connect to Crunchbase API for real competitor data
2. **ML retraining:** Collect 6 months of pricing changes → train model
3. **Sensitivity analysis:** "What if we grow 2x faster?" scenario modeling
4. **Revenue optimization:** A/B test recommended prices, measure elasticity
5. **Macroeconomic layer:** Weight strategy by market conditions (booming vs recession)

---

**Why:** Moves FeedIA from guessing to data-driven strategy. Reusable for any SaaS facing competitive pressure.
