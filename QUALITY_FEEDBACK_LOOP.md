# Quality Feedback Loop — Implementation Guide

## Overview

Quality Feedback Loop closes the gap between prompt selection and user satisfaction:

```
User asks for prompts → Engine ranks batches → User generates content → User rates quality → Feedback stored
→ Weights retrained → Future rankings improved
```

## Architecture

### 1. **Feedback Collection** (`POST /api/feedback/save`)

```bash
curl -X POST http://localhost:3000/api/feedback/save \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "batchId": 88,
    "rating": 5,
    "content": "Perfect carousel prompts for skincare!"
  }'
```

**Response:**

```json
{
  "success": true,
  "feedbackId": "feedback_user-123_88_1723457890",
  "batchId": 88,
  "rating": 5,
  "message": "Thanks! Rating saved for Batch 88"
}
```

### 2. **Quality Score Retrieval** (`GET /api/feedback/quality-scores/:batchId`)

```bash
curl http://localhost:3000/api/feedback/quality-scores/88
```

**Response:**

```json
{
  "batchId": 88,
  "averageRating": 4.7,
  "totalRatings": 23,
  "trend": "improving",
  "qualityBoost": 1.18,
  "interpretation": "⭐ Highly recommended"
}
```

### 3. **Dynamic Ranking with Quality Boost**

Integrated into `selectPromptsForUser()`:

```typescript
// Before: score = (formatScore * 0.5) + (categoryScore * 0.3) + (topicScore * 0.2)

// After: score *= qualityBoost (1.0 = no boost, 1.3 = max boost)

// Example:
// Base score: 0.85 (format + category + keywords)
// Batch 88 avg rating: 4.8/5 → boost = 1.18
// Final score: 0.85 * 1.18 = 1.003 (capped at 1.0)
```

### 4. **Batch Quality Analysis** (`GET /api/feedback/quality-scores`)

```bash
curl http://localhost:3000/api/feedback/quality-scores
```

**Response:**

```json
{
  "success": true,
  "batches": [
    { "batchId": 88, "averageRating": 4.7, "totalRatings": 23 },
    { "batchId": 65, "averageRating": 4.3, "totalRatings": 15 },
    { "batchId": 82, "averageRating": 3.9, "totalRatings": 8 }
  ],
  "totalBatches": 3,
  "message": "Retrieved quality scores for 3 batches"
}
```

### 5. **Weight Retraining** (`POST /api/feedback/retrain`)

```bash
curl -X POST http://localhost:3000/api/feedback/retrain \
  -H "Content-Type: application/json"
```

**Response:**

```json
{
  "success": true,
  "oldWeights": {
    "formatWeight": 0.5,
    "categoryWeight": 0.3,
    "topicWeight": 0.2,
    "qualityBoost": true
  },
  "newWeights": {
    "formatWeight": 0.55,
    "categoryWeight": 0.3,
    "topicWeight": 0.15,
    "qualityBoost": true
  },
  "improvementPercent": 10,
  "message": "📈 Ranking weights retrained. 10% improvement"
}
```

**Logic:** If top-rated batches (4.8+) outnumber underperformers (< 3.0), boost `formatWeight` (0.50 → 0.55) and reduce `topicWeight` (0.20 → 0.15).

### 6. **Recommendations** (`GET /api/feedback/recommendations`)

```bash
curl http://localhost:3000/api/feedback/recommendations
```

**Response:**

```json
{
  "success": true,
  "recommendations": [
    {
      "formatCategory": "Batch 88",
      "avgRating": 4.8,
      "totalRatings": 23,
      "recommendation": "⭐ Highly recommended"
    },
    {
      "formatCategory": "Batch 65",
      "avgRating": 4.3,
      "totalRatings": 15,
      "recommendation": "✓ Recommended"
    }
  ],
  "count": 2,
  "message": "Top-rated batches for prompt selection"
}
```

### 7. **User Feedback History** (`GET /api/feedback/history/:userId`)

```bash
curl http://localhost:3000/api/feedback/history/user-123
```

**Response:**

```json
{
  "success": true,
  "userId": "user-123",
  "feedback": [
    {
      "id": "feedback_user-123_88_1723457890",
      "userId": "user-123",
      "batchId": 88,
      "rating": 5,
      "content": "Perfect carousel prompts for skincare!",
      "createdAt": "2026-08-14T10:30:45.123Z"
    }
  ],
  "count": 1
}
```

## Database Schema

### `feedback` Table

```sql
CREATE TABLE feedback (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  batch_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, batch_id)
);

CREATE INDEX idx_feedback_batch_id ON feedback(batch_id);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at);
```

### `ranking_weights` Table

```sql
CREATE TABLE ranking_weights (
  id VARCHAR(255) PRIMARY KEY,
  format_weight DECIMAL(3, 2) DEFAULT 0.50,
  category_weight DECIMAL(3, 2) DEFAULT 0.30,
  topic_weight DECIMAL(3, 2) DEFAULT 0.20,
  quality_boost BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Quality Boost Algorithm

**Boost Calculation:**

```typescript
// For batch with avg rating (1-5 stars)
normalizedRating = (avgRating - 1) / 4; // 0-1 scale
boost = 0.8 + normalizedRating * 0.5; // range: 0.8 - 1.3

// Examples:
// 1.0 stars → boost = 0.8  (penalize low performers)
// 3.0 stars → boost = 1.0  (neutral)
// 5.0 stars → boost = 1.3  (promote high performers)
```

**Minimum Feedback Threshold:** 3+ ratings required before boost applies (prevents noise).

## Integration Points

### 1. **Prompt Selection Pipeline**

- `selectPromptsForUser()` → `selectPromptBatches()` → `scoreBatch()`
- For each batch, `scoreBatch()` applies quality boost after base score calculation
- Async flow ensures DB reads complete before returning results

### 2. **Frontend UX Pattern**

```javascript
// 1. User searches: "carousel for skincare"
POST /api/prompt-selection/select {query: "carousel for skincare"}
→ Response: [Batch 88, Batch 65, Batch 82] (ranked by quality + relevance)

// 2. User generates content with Batch 88 prompts
// 3. User sees quality feedback widget:
//    "Was this prompt helpful?" [😞 😐 😐😊 😍]

// 4. User clicks ⭐ (rating: 5)
POST /api/feedback/save {userId, batchId: 88, rating: 5}

// 5. Future searches now prioritize Batch 88 (quality boost: 1.18x)
```

## Scheduling Retraining

**Manual Retraining:**

```bash
# Retrain weights after every 50 feedback entries
curl -X POST http://localhost:3000/api/feedback/retrain
```

**Automated (Optional):**

```typescript
// Add cron job (e.g., daily at midnight UTC)
cron.schedule('0 0 * * *', async () => {
  await retrainWeights();
  console.log('[AutoRetrain] Weights updated');
});
```

## Monitoring

**Check Feedback Health:**

```bash
# How many ratings per batch?
curl http://localhost:3000/api/feedback/quality-scores

# Which batches improved?
curl http://localhost:3000/api/feedback/recommendations

# Specific batch trend?
curl http://localhost:3000/api/feedback/quality-scores/88
# Look for: trend: "improving" | "stable" | "declining"
```

## Testing Workflow

### Step 1: Save Feedback

```bash
curl -X POST http://localhost:3000/api/feedback/save \
  -H "Content-Type: application/json" \
  -d '{"userId": "tester-1", "batchId": 88, "rating": 5, "content": "Excellent!"}'
```

### Step 2: Verify Storage

```bash
curl http://localhost:3000/api/feedback/quality-scores/88
# Should show: "totalRatings": 1, "averageRating": 5
```

### Step 3: Add More Ratings (Simulate 5+ users)

```bash
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/feedback/save \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"tester-$i\", \"batchId\": 88, \"rating\": $((4 + RANDOM % 2)), \"content\": \"Good prompt\"}"
done
```

### Step 4: Check Averages

```bash
curl http://localhost:3000/api/feedback/quality-scores/88
# Should show: "totalRatings": 6, "averageRating": 4.83, "qualityBoost": 1.21
```

### Step 5: Retrain Weights

```bash
curl -X POST http://localhost:3000/api/feedback/retrain
# Check: "improvementPercent" to see if weights adjusted
```

### Step 6: Verify Ranking Improvement

```bash
curl -X POST http://localhost:3000/api/prompt-selection/select \
  -H "Content-Type: application/json" \
  -d '{"query": "carousel for premium skincare products", "topN": 3}'
# Batch 88 should now rank higher due to quality boost (1.21x multiplier)
```

## Anti-Patterns to Avoid

❌ **Don't:**

- Store feedback in-memory only (lost on restart)
- Apply boost without minimum threshold (vote manipulation risk)
- Retrain weights on every feedback entry (computational waste)
- Show boost factor to users (confidential algorithm)

✅ **Do:**

- Persist feedback to database (PostgreSQL/SQLite)
- Require 3+ ratings before applying boost
- Retrain weights hourly or daily (batch job)
- Log retraining decisions for audit trail

## Next Steps

1. **A/B Testing:** Run with/without quality boost on 10% of users
2. **Active Learning:** Flag edge cases (very high/low ratings) for investigation
3. **Multi-Dimensional Feedback:** Extend beyond 5-star (add detailed feedback type)
4. **Personalization:** Per-user quality preferences (e.g., "premium" vs "viral")
5. **Competitive Analysis:** Compare batch quality across competitor tools
