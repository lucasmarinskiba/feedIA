# Testing Carousel Designer Pro

## Test Workflow (E2E)

Generate carousel → Poll status → Download results.

---

## Step 1: Generate Carousel (POST)

```bash
curl -X POST https://feedia.vercel.app/api/skills/carousel-designer-pro/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "5 viral tips for Instagram growth 2025",
    "style": "bold-playful",
    "slideCount": 10,
    "animationStyle": "slideLeft",
    "includeVideo": false
  }'
```

**Expected response (202 Accepted):**
```json
{
  "jobId": "carousel-1719158400000-a1b2c3",
  "status": "queued",
  "createdAt": "2025-06-23T20:38:50.123Z",
  "statusUrl": "/api/skills/carousel-designer-pro/status/carousel-1719158400000-a1b2c3"
}
```

**Save `jobId` from response.**

---

## Step 2: Poll Status (GET)

Wait 5 seconds, then poll:

```bash
JOB_ID="carousel-1719158400000-a1b2c3"

curl https://feedia.vercel.app/api/skills/carousel-designer-pro/status/$JOB_ID
```

**Expected response (200 OK) while running:**
```json
{
  "jobId": "carousel-1719158400000-a1b2c3",
  "status": "running",
  "progress": 45,
  "log": [
    "[2025-06-23T20:38:52Z] Job started",
    "[2025-06-23T20:38:55Z] Generating base carousel...",
    "[2025-06-23T20:39:02Z] Applying Pinterest patterns..."
  ]
}
```

**Poll every 3-5 seconds until `status: "done"` (usually 30-60 seconds).**

---

## Step 3: Download (GET)

When status is "done", download:

```bash
JOB_ID="carousel-1719158400000-a1b2c3"

curl https://feedia.vercel.app/api/skills/carousel-designer-pro/download/$JOB_ID
```

**Expected response (200 OK) when done:**
```json
{
  "jobId": "carousel-1719158400000-a1b2c3",
  "status": "done",
  "htmlPreview": "<!DOCTYPE html>...",
  "mp4Url": null,
  "zipUrl": "/api/skills/carousel-designer-pro/download/carousel-1719158400000-a1b2c3/package",
  "aestheticScore": 87,
  "readyToPublish": true
}
```

---

## Full Test Script (Bash)

```bash
#!/bin/bash

API="https://feedia.vercel.app/api/skills/carousel-designer-pro"

# 1. Create carousel
echo "📤 Creating carousel..."
RESPONSE=$(curl -s -X POST $API/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How to grow Instagram followers",
    "style": "bold-playful",
    "slideCount": 10,
    "animationStyle": "slideLeft"
  }')

JOB_ID=$(echo $RESPONSE | jq -r '.jobId')
echo "✓ Job ID: $JOB_ID"

# 2. Poll until done
echo ""
echo "📊 Polling status..."
while true; do
  STATUS=$(curl -s $API/status/$JOB_ID)
  STATE=$(echo $STATUS | jq -r '.status')
  PROGRESS=$(echo $STATUS | jq -r '.progress')
  
  echo "Progress: $PROGRESS% ($STATE)"
  
  if [ "$STATE" = "done" ] || [ "$STATE" = "error" ]; then
    break
  fi
  
  sleep 3
done

# 3. Download results
echo ""
echo "📥 Downloading results..."
DOWNLOAD=$(curl -s $API/download/$JOB_ID)

HTML=$(echo $DOWNLOAD | jq -r '.htmlPreview' | head -c 200)
SCORE=$(echo $DOWNLOAD | jq -r '.aestheticScore')
READY=$(echo $DOWNLOAD | jq -r '.readyToPublish')

echo "✓ Aesthetic Score: $SCORE"
echo "✓ Ready to Publish: $READY"
echo "✓ HTML Preview: ${HTML}..."
```

Save as `test-carousel.sh`:
```bash
chmod +x test-carousel.sh
./test-carousel.sh
```

---

## Expected Results

✓ **POST /generate**: 202 Accepted with jobId
✓ **GET /status/:jobId**: Running → Done (30-60 seconds)
✓ **GET /download/:jobId**: Returns HTML + metadata (aestheticScore ≥ 70 = readyToPublish)

✓ **Log entries**: Job created → carousel generation → animations → export done

✓ **Aesthetic score**: 70-95 (Visual QA passing)

✓ **Ready to publish**: true (score ≥ 70)

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| 400 Bad Request | Missing prompt | Add `prompt` field |
| 404 Not Found | Invalid jobId | Check jobId format from POST response |
| 202 Accepted (download) | Still processing | Wait & retry (poll /status until done) |
| Score < 70 | Design issues | Check log entries for QA failures |
| HTML preview empty | Export failed | Check error field in status response |

---

## Test Scenarios

### Scenario 1: Minimal Carousel
```bash
curl -X POST https://feedia.vercel.app/api/skills/carousel-designer-pro/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test tips"}'
```
Expected: 202, defaults applied (style: bold-playful, slideCount: 10, animation: fade)

### Scenario 2: Custom Style
```bash
curl -X POST https://feedia.vercel.app/api/skills/carousel-designer-pro/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt":"wellness guide",
    "style":"warm-organic",
    "slideCount":15
  }'
```
Expected: 202, warm color palette applied

### Scenario 3: No Progress (Error Case)
```bash
curl https://feedia.vercel.app/api/skills/carousel-designer-pro/status/carousel-invalid-id
```
Expected: 404 (job not found)

### Scenario 4: MP4 Generation (Optional)
```bash
curl -X POST https://feedia.vercel.app/api/skills/carousel-designer-pro/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt":"viral reels",
    "includeVideo":true
  }'
```
Expected: 202, MP4 generated if RUNWAY_API_KEY set

---

## Next: Deploy

Once tests pass:
1. Configure remaining env vars (if not done)
2. Redeploy to Vercel
3. Run tests again on live instance
4. Go live

See SETUP_DATABASE.md for configuration.
