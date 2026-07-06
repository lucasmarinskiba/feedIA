# Parameterized Image Endpoints — Test Scenarios

## Architecture
- **Library**: 12,870 parameterized prompts (batches 62-95)
- **Token**: `[USER_IMAGE]` placeholder in each prompt
- **Flow**: User image → Endpoint → Prompt matching → Content generation

---

## Test Scenario 1: Upload Product Image

### Request
```bash
curl -X POST http://localhost:3000/api/parameterized/upload-images \
  -F "images=@product.jpg" \
  -F "objective=branding" \
  -F "contentType=carousel" \
  -F "occasion=trabajo"
```

### Response
```json
{
  "contentType": "carousel",
  "prompts": [
    {
      "id": "77-001",
      "base": "Premium Product Photography",
      "parameterized": "[USER_IMAGE] premium watch product photography cinematic lighting",
      "occasion": "trabajo",
      "batchId": "77",
      "confidence": 0.87
    },
    {
      "id": "78-002",
      "base": "Viral Showcase",
      "parameterized": "[USER_IMAGE] viral product showcase neon box aesthetic",
      "occasion": "trabajo",
      "batchId": "78",
      "confidence": 0.82
    }
  ],
  "images": ["uploads/product.jpg"],
  "objective": "branding",
  "metadata": {
    "totalPrompts": 15,
    "generatedAt": "2026-07-05T10:30:00Z",
    "brand": "FeedIA"
  }
}
```

---

## Test Scenario 2: Match by Description

### Request
```bash
curl -X POST http://localhost:3000/api/parameterized/match-prompts \
  -H "Content-Type: application/json" \
  -d '{
    "imageDescriptions": [
      "A beautiful woman wearing a black blazer in an office with plants and design sketches"
    ],
    "objective": "professional",
    "contentType": "carousel",
    "occasion": "trabajo"
  }'
```

### Response
```json
{
  "status": "success",
  "matched": [
    {
      "id": "72-005",
      "base": "Interior Designer Minimalist",
      "parameterized": "[USER_IMAGE] designer office minimalist aesthetic architectural sketches",
      "occasion": "trabajo",
      "batchId": "72",
      "confidence": 0.78
    }
  ],
  "count": 12,
  "contentType": "carousel",
  "objective": "professional"
}
```

---

## Test Scenario 3: Full Pipeline — Images to Content

### Request
```bash
curl -X POST http://localhost:3000/api/parameterized/generate-content \
  -H "Content-Type: application/json" \
  -d '{
    "imageDescriptions": [
      "Girl wearing pink puffer jacket on frozen lake, blonde hair, aerial overhead shot"
    ],
    "objective": "lifestyle",
    "contentType": "carousel",
    "occasion": "amigos"
  }'
```

### Response
```json
{
  "status": "success",
  "contentType": "carousel",
  "variants": [
    {
      "promptId": "95-015",
      "originalParameterized": "[USER_IMAGE] AI editorial cyberpunk branding cyborg gaming profile stats",
      "finalPrompt": "Girl wearing pink puffer jacket on frozen lake, blonde hair, aerial overhead shot AI editorial cyberpunk branding cyborg gaming profile stats",
      "occasion": "amigos",
      "contentType": "carousel",
      "confidence": 0.74,
      "metadata": {
        "batchId": "95",
        "base": "AI/Editorial/Cyberpunk"
      }
    },
    {
      "promptId": "79-008",
      "originalParameterized": "[USER_IMAGE] viral product showcase context",
      "finalPrompt": "Girl wearing pink puffer jacket on frozen lake, blonde hair, aerial overhead shot viral product showcase context",
      "occasion": "amigos",
      "contentType": "carousel",
      "confidence": 0.69,
      "metadata": {
        "batchId": "79",
        "base": "Viral Showcase"
      }
    }
  ],
  "objective": "lifestyle",
  "metadata": {
    "promptsMatched": 8,
    "variantsGenerated": 10,
    "generatedAt": "2026-07-05T10:35:00Z",
    "brand": "FeedIA"
  }
}
```

---

## Test Scenario 4: Library Status

### Request
```bash
curl http://localhost:3000/api/parameterized/library-status
```

### Response
```json
{
  "status": "ready",
  "library": "FeedIA Parameterized Prompts",
  "totalPrompts": 12870,
  "baseBatches": "28-61",
  "parameterizedBatches": "62-95",
  "basePrompts": 6770,
  "parameterizedTemplates": 6100,
  "placeholderToken": "[USER_IMAGE]",
  "supportedContentTypes": ["carousel", "reel", "story", "post"],
  "supportedOccasions": ["trabajo", "amigos", "temática"]
}
```

---

## Next Steps

1. ✅ Endpoint routes wired (parameterized-image-routes.ts)
2. ✅ Server integration (server.ts updated)
3. ✅ Multer image upload configured
4. ⏳ **Test endpoints** (curl scenarios above)
5. ⏳ Deploy to feedia.vercel.app
6. ⏳ Monitor performance metrics
7. ⏳ Collect user feedback + iterate

---

## Integration Points

### Frontend (user flow)
1. User uploads image(s)
2. User describes objective (branding/product/lifestyle/professional/etc)
3. System returns matched prompts + variants
4. User selects content format (carousel/reel/story/post)
5. AI generates customized content

### Backend (confidence scoring)
- Image type inference (portrait/product/graphic/food/animal/generic)
- Description → token overlap matching
- Batch relevance ranking
- Occasion filtering
- Content type optimization

---

## Batch Distribution

- **Batches 62-95**: 34 batches × 150 prompts = 5,100 parameterized templates
- **Coverage**: All original batches (28-61) have parameterized variants
- **Occasions**: trabajo/amigos/temática applied to each
- **Placeholder**: `[USER_IMAGE]` replaced at generation time
