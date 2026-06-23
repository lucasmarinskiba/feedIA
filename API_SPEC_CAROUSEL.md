# Carousel Designer Pro — API Specification

**Endpoint:** `https://feedia.vercel.app/api/skills/carousel-designer-pro`

Generate Pinterest-inspired HD carousels with animations via 3-step async workflow:
1. **POST /generate** — Create job, get jobId
2. **GET /status/:jobId** — Poll progress
3. **GET /download/:jobId** — Download when ready

---

## POST /generate — Create Carousel Job

**Request:**
```bash
curl -X POST https://feedia.vercel.app/api/skills/carousel-designer-pro/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "5 viral tips for Instagram reels 2025",
    "style": "bold-playful",
    "slideCount": 10,
    "animationStyle": "slideLeft",
    "includeVideo": true
  }'
```

**Parameters:**
| Name | Type | Required | Default | Options |
|------|------|----------|---------|---------|
| `prompt` | string | ✓ | — | Any carousel topic |
| `style` | string | — | bold-playful | warm-organic, bold-playful, dark-premium, clean-editorial |
| `slideCount` | number | — | 10 | 3–30 |
| `animationStyle` | string | — | fade | fade, slideLeft, slideUp, zoom, rotate |
| `includeVideo` | boolean | — | false | true/false |
| `includeMusic` | boolean | — | false | true/false (requires Runway API) |
| `brandId` | string | — | — | Optional account brand context |

**Response (202 Accepted):**
```json
{
  "jobId": "carousel-1719158400000-a1b2c3",
  "status": "queued",
  "createdAt": "2025-06-23T20:38:50.123Z",
  "statusUrl": "/api/skills/carousel-designer-pro/status/carousel-1719158400000-a1b2c3"
}
```

**Status codes:**
- `202 Accepted` — Job queued successfully
- `400 Bad Request` — Invalid parameters (missing prompt)
- `500 Internal Server Error` — Server error

---

## GET /status/:jobId — Poll Progress

**Request:**
```bash
curl https://feedia.vercel.app/api/skills/carousel-designer-pro/status/carousel-1719158400000-a1b2c3
```

**Response (200 OK):**
```json
{
  "jobId": "carousel-1719158400000-a1b2c3",
  "status": "running",
  "progress": 45,
  "createdAt": "2025-06-23T20:38:50.123Z",
  "startedAt": "2025-06-23T20:38:52.456Z",
  "completedAt": null,
  "aestheticScore": null,
  "readyToPublish": null,
  "log": [
    "[2025-06-23T20:38:52Z] Job started",
    "[2025-06-23T20:38:55Z] Generating base carousel...",
    "[2025-06-23T20:39:02Z] Applying Pinterest patterns...",
    "[2025-06-23T20:39:15Z] Generating animations and exports..."
  ]
}
```

**Status values:**
- `queued` — Waiting to start
- `running` — Currently processing (5–99%)
- `done` — Complete, ready to download
- `error` — Failed with error message

**Progress:**
- 0–5%: Initialization
- 5–25%: Carousel generation (prompts, scripting)
- 25–50%: Design & aesthetics (patterns, colors, typography)
- 50–80%: Animations & assets (CSS, images, MP4)
- 80–99%: Export preparation
- 100%: Complete

**Poll interval:** 2–5 seconds recommended

---

## GET /download/:jobId — Download Carousel

**Request:**
```bash
curl https://feedia.vercel.app/api/skills/carousel-designer-pro/download/carousel-1719158400000-a1b2c3
```

**Response while running (202 Accepted):**
```json
{
  "jobId": "carousel-1719158400000-a1b2c3",
  "status": "running",
  "progress": 75,
  "message": "Job still processing"
}
```

**Response when done (200 OK):**
```json
{
  "jobId": "carousel-1719158400000-a1b2c3",
  "status": "done",
  "htmlPreview": "<!DOCTYPE html>...",
  "mp4Url": "https://cdn.runway.ml/...",
  "zipUrl": "/api/skills/carousel-designer-pro/download/carousel-1719158400000-a1b2c3/package",
  "aestheticScore": 87,
  "readyToPublish": true
}
```

**Response on error (400 Bad Request):**
```json
{
  "jobId": "carousel-1719158400000-a1b2c3",
  "status": "error",
  "error": "Image download failed: connection timeout"
}
```

---

## Export Package Contents

**ZIP structure** (at `zipUrl`):
```
carousel-{jobId}.zip
├── metadata.json          # Export metadata (created_at, expires_at, scores)
├── slides.json            # Slide specs (text, colors, patterns, animations)
├── animations.css         # All CSS keyframes for slide transitions
├── timeline.json          # Animation timing data (delay, duration, easing)
├── preview.html           # Standalone HTML preview with inline CSS
└── MANIFEST.json          # File listing and checksums
```

**Metadata fields:**
```json
{
  "id": "carousel-1719158400000-a1b2c3",
  "version": "1.0",
  "created_at": "2025-06-23T20:39:35Z",
  "expires_at": "2025-06-30T20:39:35Z",
  "slides_count": 10,
  "animation_type": "slideLeft",
  "aesthetic_score": 87,
  "mp4_url": "https://cdn.runway.ml/...",
  "files": {
    "slides": "slides.json",
    "css": "animations.css",
    "timeline": "timeline.json",
    "preview": "preview.html"
  }
}
```

---

## Complete Workflow Example

```bash
#!/bin/bash

# 1. Create carousel
RESPONSE=$(curl -s -X POST https://feedia.vercel.app/api/skills/carousel-designer-pro/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How to grow Instagram followers",
    "style": "bold-playful",
    "slideCount": 10,
    "animationStyle": "slideLeft",
    "includeVideo": true
  }')

JOB_ID=$(echo $RESPONSE | jq -r '.jobId')
echo "Job created: $JOB_ID"

# 2. Poll until complete
while true; do
  STATUS=$(curl -s https://feedia.vercel.app/api/skills/carousel-designer-pro/status/$JOB_ID)
  PROGRESS=$(echo $STATUS | jq -r '.progress')
  STATE=$(echo $STATUS | jq -r '.status')
  
  echo "Progress: $PROGRESS% ($STATE)"
  
  if [ "$STATE" = "done" ] || [ "$STATE" = "error" ]; then
    break
  fi
  
  sleep 3
done

# 3. Download when ready
curl -s https://feedia.vercel.app/api/skills/carousel-designer-pro/download/$JOB_ID | jq '.'
```

---

## Styles & Aesthetics

### Pinterest Patterns
Carousels follow Pinterest design standards:

**Typography:**
- Headlines: 28–36px, bold (700–900 weight)
- Body: 14–18px, regular (400–500 weight)
- Max 4 colors per slide (primary, secondary, 1–2 accents)

**Layouts:**
- Left-aligned text + right image (40/60 split)
- Full-bleed image + centered text overlay
- Grid layout (3x3 or 2x2)
- Asymmetrical balance with whitespace

**Color Palettes:**
- `warm-organic`: Terracotta, cream, sage green
- `bold-playful`: Magenta, electric blue, lime
- `dark-premium`: Dark gray, soft gold, white
- `clean-editorial`: Navy, white, soft gray

---

## Error Handling

**Common errors:**

| Status | Error | Cause | Fix |
|--------|-------|-------|-----|
| 400 | `prompt required` | Missing prompt field | Add `prompt` to request |
| 404 | `job not found` | Invalid jobId | Check jobId format |
| 500 | `Image download failed` | Network timeout | Retry or use `includeVideo: false` |
| 202 | Still processing | Job not complete | Wait, then retry |

---

## Rate Limits & Quotas

- **Request rate:** 10 requests/minute (per IP)
- **Job timeout:** 5 minutes (Vercel limit)
- **Export retention:** 7 days (auto-cleanup)
- **Max slides:** 30 per carousel
- **Max file size:** 50MB ZIP

---

## Authentication

Current: No auth required (public API)  
Future: OAuth2 for account-linked generation

---

## Changelog

**v1.0** (2025-06-23)
- Initial release
- 3-endpoint async workflow
- Runway MP4 integration
- Visual QA validation
- ZIP export package

---

## Support

- Issue tracking: GitHub issues
- Email: support@feedia.app (future)
- Docs: https://docs.feedia.app (future)
