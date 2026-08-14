# FeedIA Three Integrated Systems — API Documentation

## Overview

Three systems deployed on Railway (`https://web-production-fa7b5.up.railway.app`):

1. **Quality Feedback Loop** — `/api/feedback/*`
2. **Strategic Reasoning Agent** — `/api/strategy/*`
3. **Multi-Agent Orchestration** — `/api/orchestrate/*`

---

## 1️⃣ Quality Feedback Loop (`/api/feedback/*`)

Users rate prompts (⭐ 1-5 stars). Ratings are aggregated, averaged, and applied as quality boost multiplier (0.8–1.3x) to future rankings.

### Endpoints

#### POST `/api/feedback/save`
Save user feedback on prompt quality.

**Request:**
```json
{
  "userId": "user-123",
  "batchId": 88,
  "rating": 5,
  "content": "Excellent carousel design - smooth transitions"
}
```

**Response:**
```json
{
  "success": true,
  "feedbackId": "feedback_user-123_88_1723500000000"
}
```

**Rules:**
- `rating`: 1–5 (required)
- `content`: optional
- Minimum 3 ratings before boost applies

---

#### GET `/api/feedback/quality-scores/:batchId`
Get average rating and trend for a batch.

**Response:**
```json
{
  "batchId": 88,
  "averageRating": 4.6,
  "totalRatings": 5,
  "trend": "improving",
  "qualityBoost": 1.25
}
```

**Quality Boost Formula:**
```
normalizedRating = (avgRating - 1) / 4   // 0–1 scale
boost = 0.8 + (normalizedRating * 0.5)   // 0.8–1.3 range
```

---

#### GET `/api/feedback/quality-scores`
Get all batch quality scores (analytics + retraining).

**Response:**
```json
{
  "totalBatches": 15,
  "scores": [
    { "batchId": 88, "averageRating": 4.8, "totalRatings": 12, "boost": 1.3 },
    { "batchId": 72, "averageRating": 3.2, "totalRatings": 8, "boost": 1.05 }
  ]
}
```

---

#### GET `/api/feedback/history/:userId`
Get user's past 50 ratings.

**Response:**
```json
{
  "userId": "user-123",
  "feedbackCount": 5,
  "history": [
    { "batchId": 88, "rating": 5, "createdAt": "2026-08-14T10:30:00Z" },
    { "batchId": 72, "rating": 3, "createdAt": "2026-08-13T15:20:00Z" }
  ]
}
```

---

#### GET `/api/feedback/recommendations`
Get top-performing batches (4.8+ avg rating).

**Response:**
```json
{
  "topPerformers": [
    { "batchId": 88, "averageRating": 4.8, "totalRatings": 12, "boost": 1.3 }
  ],
  "underperformers": [
    { "batchId": 45, "averageRating": 2.1, "totalRatings": 6, "boost": 0.8 }
  ]
}
```

---

#### POST `/api/feedback/retrain`
Manually trigger weight retraining (format/category/topic percentages).

**Response:**
```json
{
  "success": true,
  "topPerformers": 3,
  "underperformers": 2,
  "weights": {
    "formatWeight": 0.50,
    "categoryWeight": 0.32,
    "topicWeight": 0.18
  }
}
```

**Retraining Logic:**
- If top performers (4.8+) > underperformers (<3.0):
  - `formatWeight += 0.05`
  - `topicWeight -= 0.05`

---

## 2️⃣ Strategic Reasoning Agent (`/api/strategy/*`)

Analyzes competitive landscape, recommends pricing, allocates budget, positions messaging.

### Endpoints

#### POST `/api/strategy/analyze-competitors`
Analyze competitor pricing, threats, and gaps.

**Request:**
```json
{
  "competitors": [
    { "name": "Figma", "pricing": 12 },
    { "name": "Canva", "pricing": 13 },
    { "name": "Adobe Express", "pricing": 9.99 }
  ]
}
```

**Response:**
```json
{
  "averagePrice": 11.66,
  "priceRange": { "min": 9.99, "max": 13 },
  "topThreats": [
    "Figma's collaborative features",
    "Canva's ease-of-use",
    "Adobe's brand trust"
  ],
  "gapOpportunities": [
    "AI-powered design automation",
    "Creator community features",
    "Mobile-first canvas"
  ]
}
```

---

#### POST `/api/strategy/recommend-pricing`
Generate pricing recommendations with elasticity curves.

**Request:**
```json
{
  "context": "Premium carousel design tool for creators",
  "competitors": [
    { "name": "Figma", "pricing": 12 },
    { "name": "Canva", "pricing": 13 }
  ]
}
```

**Response:**
```json
{
  "positioning": "premium",
  "pricePoints": [
    {
      "tier": "value",
      "price": 7.99,
      "label": "Budget-conscious creators",
      "elasticity": "price-sensitive"
    },
    {
      "tier": "mid",
      "price": 14.99,
      "label": "Professional creators",
      "elasticity": "moderate"
    },
    {
      "tier": "premium",
      "price": 29.99,
      "label": "Teams & agencies",
      "elasticity": "low (less price-sensitive)"
    }
  ]
}
```

---

#### POST `/api/strategy/allocate-budget`
Budget allocation by growth stage.

**Request:**
```json
{
  "monthlyRevenue": 50000,
  "growthRate": 0.15
}
```

**Response (Scaling Stage: 15% MoM):**
```json
{
  "stage": "scaling",
  "allocation": {
    "marketing": "45%",
    "product": "30%",
    "operations": "15%",
    "reserve": "10%"
  },
  "breakdown": {
    "marketing": 22500,
    "product": 15000,
    "operations": 7500,
    "reserve": 5000
  }
}
```

**Stage Rules:**
- **Bootstrap** (<5% MoM): 30% marketing, 50% product, 10% ops, 10% reserve
- **Scaling** (5–20% MoM): 45% marketing, 30% product, 15% ops, 10% reserve
- **Hypergrowth** (>20% MoM): 55% marketing, 20% product, 15% ops, 10% reserve

---

#### POST `/api/strategy/position`
Generate positioning messaging vs. competitor.

**Request:**
```json
{
  "ourFeatures": ["AI-powered design", "Real-time collab", "Mobile-first"],
  "mainCompetitor": "Canva",
  "targetSegment": "Professional creators"
}
```

**Response:**
```json
{
  "positioning": "The AI-first carousel design tool for creators who demand professional quality + speed",
  "messaging": {
    "vs_competitor": "Unlike Canva (template-heavy), we generate custom designs powered by AI. No hunting for the perfect template.",
    "for_segment": "Professional creators need speed AND quality. We deliver both without compromise."
  },
  "defensibleAdvantages": [
    "AI customization (no template lock-in)",
    "Real-time team collaboration",
    "Mobile-native workflow"
  ]
}
```

---

#### POST `/api/strategy/full-analysis`
Combined strategic analysis (all 4 dimensions).

**Request:**
```json
{
  "product": "FeedIA Carousel Pro",
  "revenue": 50000,
  "growthRate": 0.12,
  "competitors": [
    { "name": "Figma", "pricing": 12 },
    { "name": "Canva", "pricing": 13 }
  ],
  "features": ["AI designs", "Real-time collab", "Mobile-first"],
  "targetSegment": "Professional creators"
}
```

**Response:**
```json
{
  "executive_summary": "Premium positioning at $14.99 with AI differentiation. 45% marketing budget focus. Defensible against Canva via AI + collab.",
  "competitive_analysis": { ... },
  "pricing_recommendation": { ... },
  "budget_allocation": { ... },
  "positioning": { ... }
}
```

---

## 3️⃣ Multi-Agent Orchestration (`/api/orchestrate/*`)

Art Director and Carousel Designer collaborate iteratively: proposal → feedback → refine → validate.

### Endpoints

#### POST `/api/orchestrate/start`
Start collaboration session.

**Request:**
```json
{
  "userId": "user-456",
  "brief": {
    "topic": "Luxury skincare carousel",
    "format": "carousel",
    "style": "minimalist luxury",
    "constraints": ["max 10 slides", "mobile-first"],
    "targetAudience": "beauty enthusiasts 25-45"
  }
}
```

**Response:**
```json
{
  "sessionId": "session_user-456_1723500000000",
  "status": "active",
  "topic": "Luxury skincare carousel",
  "iterations": 0
}
```

---

#### POST `/api/orchestrate/:sessionId/art-director-proposal`
Art Director sends initial design concept.

**Request:**
```json
{
  "concept": "Luxury skincare ritual with natural ingredients",
  "visualStyle": "minimalist luxury",
  "mood": "aspirational, calming"
}
```

**Response:**
```json
{
  "messageId": "msg_1723500000001",
  "from": "art-director",
  "to": "carousel-designer",
  "message": "Art Director proposal sent to Carousel Designer"
}
```

---

#### POST `/api/orchestrate/:sessionId/carousel-designer-response`
Carousel Designer responds with feasibility + suggestions.

**Request:**
```json
{
  "feasibility": "Highly feasible with standard carousel tools",
  "suggestions": ["Use 8-10 frames", "Consistent color palette", "Add subtle animations"],
  "concerns": ["Mobile text readability", "Animation performance on older devices"]
}
```

**Response:**
```json
{
  "messageId": "msg_1723500000002",
  "from": "carousel-designer",
  "to": "art-director",
  "message": "Carousel Designer feedback sent back to Art Director"
}
```

---

#### POST `/api/orchestrate/:sessionId/art-director-refine`
Art Director refines based on feedback.

**Request:**
```json
{
  "adjustments": ["Reduced to 8 frames", "Applied WCAG AA standards", "GPU-friendly transitions"],
  "revisedConcept": "8-frame luxury skincare carousel with premium animations"
}
```

**Response:**
```json
{
  "messageId": "msg_1723500000003",
  "from": "art-director",
  "to": "carousel-designer",
  "message": "Art Director refinements sent for validation"
}
```

---

#### POST `/api/orchestrate/:sessionId/carousel-designer-validate`
Carousel Designer validates final design.

**Request:**
```json
{
  "isValid": true,
  "readiness": "production",
  "notes": "All accessibility checks passed. Ready for generation pipeline."
}
```

**Response:**
```json
{
  "messageId": "msg_1723500000004",
  "isValid": true,
  "readiness": "production",
  "message": "✅ DESIGN APPROVED FOR PRODUCTION"
}
```

---

#### GET `/api/orchestrate/:sessionId/history`
Get full conversation history.

**Response:**
```json
{
  "sessionId": "session_user-456_1723500000000",
  "topic": "Luxury skincare carousel",
  "status": "completed",
  "iterations": 1,
  "messageCount": 4,
  "messages": [
    { "id": "msg_1", "from": "art-director", "to": "carousel-designer", "type": "request", "content": "..." },
    { "id": "msg_2", "from": "carousel-designer", "to": "art-director", "type": "feedback", "content": "..." },
    ...
  ]
}
```

---

#### GET `/api/orchestrate/:sessionId/session`
Get session details.

**Response:**
```json
{
  "session": {
    "id": "session_user-456_1723500000000",
    "userId": "user-456",
    "topic": "Luxury skincare carousel",
    "status": "completed",
    "iterations": 1,
    "createdAt": "2026-08-14T10:00:00Z",
    "updatedAt": "2026-08-14T10:15:00Z"
  }
}
```

---

#### POST `/api/orchestrate/run-full-loop`
Run complete collaboration loop (automated end-to-end).

**Request:**
```json
{
  "userId": "user-456",
  "brief": {
    "topic": "Luxury skincare carousel",
    "format": "carousel",
    "style": "minimalist luxury",
    "constraints": ["max 10 slides", "mobile-first"],
    "targetAudience": "beauty enthusiasts 25-45"
  }
}
```

**Response:**
```json
{
  "sessionId": "session_user-456_1723500000000",
  "status": "completed",
  "iterations": 1,
  "finalDesign": { "concept": "...", "visualStyle": "...", "mood": "..." },
  "message": "Collaboration complete. Design ready for production (1 refinement cycles)."
}
```

---

## Integration Flow

```
User Request
    ↓
[Quality Feedback Loop] ← Ratings → boost multiplier
    ↓
[Strategic Reasoning] ← Pricing + positioning
    ↓
[Multi-Agent Orchestration] ← Art Director ↔ Carousel Designer
    ↓
Content Generation Pipeline
    ↓
Output (Carousel, Reel, Story)
```

---

## Testing

Run full test suite:
```bash
bash test-three-systems.sh https://web-production-fa7b5.up.railway.app
```

Expected output:
- ✅ Quality Feedback: ratings, scores, recommendations
- ✅ Strategic Reasoning: competitor analysis, pricing, positioning
- ✅ Multi-Agent Orchestration: proposal → feedback → refine → validate

---

## Deployment Status

- **Railway**: https://web-production-fa7b5.up.railway.app (live)
- **Git commit**: 5b109b3
- **Deployed**: 2026-08-14 (after push)
- **Status**: Monitoring deployment completion

---

## Error Handling

All endpoints return JSON with standardized error response:
```json
{
  "error": "Description of error",
  "code": 400|404|500
}
```

Common errors:
- `400`: Missing required parameters
- `404`: Session/batch not found
- `500`: Server error (check logs)

---
