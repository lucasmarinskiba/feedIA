# FeedIA ↔ SellIA Integration Bridge

**Content generation (FeedIA) feeds sales automation (SellIA) with product-driven campaigns.**

---

## ARCHITECTURE

```
FeedIA Content Generated
    ↓ (includes product refs)
Extract Product IDs + Audience Data
    ↓
SellIA Automation Triggered
    ↓ (plan + execute)
Customer Outreach + Listing
    ↓
Sales Conversion
```

---

## INTEGRATION POINTS

### 1. Content Metadata Injection
**FeedIA generates carousel/video → includes SellIA metadata:**

```json
{
  "content": { "carousel": {...} },
  "sellIA_metadata": {
    "product_id": "prod_123",
    "product_name": "Premium Jersey",
    "target_price": 49.99,
    "target_audience_emails": ["user1@email.com", "user2@email.com"],
    "platforms": ["amazon", "shopify"],
    "automation_trigger": "on_publish"
  }
}
```

### 2. Content → SellIA Workflow Mapping

| FeedIA Content | SellIA Automation | Result |
|---|---|---|
| Product carousel (5-slide) | List on 3 marketplaces + email customers | 3 listings + outreach |
| Viral humor (reel) | Contact engaged audience | DM/email to 100+ viewers |
| Educational video (YouTube) | Segment audience by product interest | Targeted follow-up |
| Brand ecosystem (12-image) | Launch complete product collection | Bundle listing + promotion |

### 3. Workflow Execution

**POST /api/feedia-sellIA/activate-sales-automation**

```typescript
{
  content_id: "carousel_123",
  product_id: "prod_456",
  automation_type: "list_and_promote",
  
  // FeedIA → SellIA
  parameters: {
    product_name: "extracted_from_carousel_copy",
    price: 49.99,
    target_emails: "extracted_from_audience_data",
    platforms: ["amazon", "shopify", "ebay"],
    campaign_message: "generated_from_carousel_cta"
  }
}
```

**Execution Pipeline:**
1. FeedIA carousel published
2. Extract product metadata
3. Call SellIA ComputerUseWorkflow.list_and_promote_product()
4. Auto-list on 3 platforms
5. Auto-email target audience
6. Track conversions

---

## COPY TEMPLATES (FeedIA → SellIA)

**Carousel Slide 3 (CTA):**
```
"Ready to [BENEFIT]?
Get [PRODUCT] at [PRICE].
Link in bio 👇"
```
→ SellIA uses this exact copy for email subject + product listing description.

**Reel Hook:**
```
"POV: You finally found [PRODUCT]"
```
→ SellIA uses as marketplace listing title + outreach subject line.

**Video Conclusion:**
```
"[PRODUCT] changed my [OUTCOME].
Yours for just [PRICE]. Limited stock."
```
→ SellIA sends to audiences as urgency-driven message.

---

## DATA FLOW

```
FeedIA generates carousel
    ↓
{
  "slides": [...],
  "product_refs": {
    "product_name": "Elite Jersey",
    "product_price": 49.99,
    "product_link": "shopify.com/products/elite-jersey",
    "target_segments": ["athletes", "fitness"],
    "cta_copy": "Get yours now"
  }
}
    ↓
SellIA receives metadata
    ↓
ComputerUsePlanner.plan_product_listing(
  "Elite Jersey",
  49.99,
  BrowserContext.SHOPIFY
)
    ↓
ComputerUseExecutor.execute_plan()
    ↓
Product listed + customers notified
    ↓
Conversions tracked → FeedIA metrics loop
```

---

## BACKEND INTEGRATION (TypeScript + Python)

**src/api/feedIA-sellIA-bridge.ts (FeedIA side)**

```typescript
import { generateCarouselWithAgents } from './agentIntegrationLayer.js';
import axios from 'axios';

async function publishCarouselWithSales(brief: Record<string, unknown>) {
  // Step 1: FeedIA generates carousel
  const { plan, content } = await generateCarouselWithAgents(brief);
  
  // Step 2: Extract product metadata
  const metadata = extractProductMetadata(content);
  
  // Step 3: Trigger SellIA automation
  await axios.post('http://sellia-backend/api/computer-use/activate', {
    content_id: brief.id,
    product_name: metadata.product_name,
    product_price: metadata.product_price,
    target_emails: metadata.audience_emails,
    platforms: ['amazon', 'shopify'],
  });
  
  return { carousel: content, sellia_triggered: true };
}
```

**backend/app/core/feedia_bridge.py (SellIA side)**

```python
from computer_use_intelligence import ComputerUseWorkflow

async def activate_sales_automation(request: dict):
    """Receives FeedIA content metadata → triggers automation"""
    
    workflow = ComputerUseWorkflow()
    
    product = {
        'name': request['product_name'],
        'price': request['product_price'],
        'target_emails': request['target_emails'],
        'platforms': request['platforms']
    }
    
    result = await workflow.list_and_promote_product(product)
    
    # Log: FeedIA content ID → SellIA automation result
    return {
        'feedia_content_id': request['content_id'],
        'sellia_automation_result': result,
        'listings_created': len(request['platforms']),
        'customers_contacted': len(request['target_emails'])
    }
```

---

## METRICS LOOP

**FeedIA ← SellIA Feedback:**

```
SellIA automation result
    ↓
{
  "content_id": "carousel_123",
  "impressions": 50000,
  "conversions": 150,
  "revenue": 7500,
  "engagement_rate": 0.003
}
    ↓
FeedIA metrics engine learns
    ↓
Next carousel uses:
- Same product position (slide 3-4 best)
- Same CTA format (7-word CTAs convert 2x)
- Same audience psychology (athletes respond to "elite" framing)
    ↓
Continuous improvement loop
```

---

## NEXT STEPS

1. Wire FeedIA POST endpoints → SellIA activation API
2. Test carousel→product listing end-to-end
3. Measure conversion rate (content quality → sales quality)
4. Add A/B testing (two carousel styles → measure sales lift)
5. Scale to reel/video/stories → SellIA workflows
6. Implement closed feedback loop (sales results → content iteration)

FeedIA creates demand. SellIA fulfills it. Bridge automates entire value chain.
