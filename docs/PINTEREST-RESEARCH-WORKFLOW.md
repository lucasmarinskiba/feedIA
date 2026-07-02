# Pinterest Research Workflow for FeedIA

## Overview
Acceso directo a Pinterest bloqueado por auth. Solución: **Manual analysis → JSON import → FeedIA learns**

## Step-by-Step Workflow

### 1. Extract Data from Each Pinterest Pin

**For each pin URL, analyze:**

#### Typography
- **Headline fonts**: Look at largest text. Name the fonts (Poppins, Montserrat, Playfair Display, etc)
- **Body fonts**: Secondary text font
- **Script/Accent fonts**: Decorative fonts if any
- **Font sizes**: Estimate headline size (36-48px?) and body size (14-20px?)

Tools: 
- WhatFont Chrome extension (identify fonts on any webpage)
- Coolors.co (extract color palettes from images)

#### Colors
- **Palette**: Extract 3-5 primary colors. Use Coolors to get hex codes
- **Mood**: Describe the feeling (bold, playful, elegant, dark, warm, etc)
- **Contrast**: Is text readable on background? (high/medium/low)

#### Layout
- **Background**: Is it image? Gradient? Solid color? Pattern/texture?
- **Text placement**: Is text overlaid on image? Beside image? Bottom? Full-screen?
- **Alignment**: Left, center, or right aligned?

#### Elements
- Check boxes: Images? Mockups? Icons? Graphics/illustrations?

#### Strategy (What makes it work?)
- **Hooks**: What catches attention? (curiosity, fear, social proof, pattern interrupt?)
- **Copy techniques**: Listicle? Before-after? Story? Question? Hot take?
- **Emotional triggers**: Fear, hope, joy, anger, curiosity?
- **CTAs**: What does it ask you to do? (Follow, link in bio, DM, save?)

#### Tools & Resources Mentioned
- **Apps**: Canva? Figma? CapCut? Adobe? Mentioned in comments/description?
- **Image sources**: Unsplash? Pexels? Adobe Stock? Real photos?
- **Font sources**: Google Fonts? Adobe Fonts? Dafont?
- **Mockup tools**: Figma? Smartmockups? Placeit?

#### Scoring
- **Retention**: Does it make you want to see next slide? (0-100)
- **Visual attention**: Eye-catching? (0-100)
- **Readability**: Can you easily read text? (0-100)
- **Brand coherence**: Looks professional/intentional? (0-100)
- **Inspiration**: How useful for FeedIA? (0-100)

---

### 2. Fill JSON Template

Get template: `GET /api/research/pinterest/template`

Example for 1 pin:
```json
{
  "pinUrl": "https://pin.it/6v5npgCT2",
  "title": "10 Mistakes You're Making",
  "description": "High-engagement listicle with pattern interrupts. Each slide reveals mistake + fix.",
  "analysis": {
    "typography": {
      "headlineFonts": ["Poppins"],
      "bodyFonts": ["Inter"],
      "scriptFonts": ["Pacifico"],
      "fontSizes": [{"headline": 40, "body": 16}]
    },
    "colors": {
      "palette": ["#E91E8C", "#00D9FF", "#FFFFFF", "#1A1A1A"],
      "mood": "bold, playful, energetic",
      "contrast": "high"
    },
    "layout": {
      "backgroundStyle": "image",
      "textPlacement": "overlay",
      "alignment": "center"
    },
    "elements": {
      "hasImages": true,
      "hasMockups": false,
      "hasIcons": true,
      "hasGraphics": false
    },
    "strategy": {
      "hooks": ["Pattern interrupt", "Curiosity loop", "Numbered listicle"],
      "copyTechniques": ["Listicle", "Before-after revelation", "Controversial claim"],
      "emotionalTriggers": ["Fear of doing it wrong", "Hope for improvement", "Curiosity"],
      "ctas": ["Follow for more tips", "Save this carousel", "Tag someone"]
    },
    "apps": ["Canva", "Adobe Illustrator"],
    "resources": {
      "imageSources": ["Unsplash", "Adobe Stock"],
      "fontSources": ["Google Fonts", "Adobe Fonts"],
      "mockupSources": ["Figma", "Canva"]
    }
  },
  "retentionScore": 87,
  "engagement": {
    "visualAttention": 92,
    "readability": 85,
    "brandCoherence": 78
  },
  "inspirationLevel": 90
}
```

---

### 3. Import Pins to FeedIA

**One pin at a time:**
```bash
POST /api/research/pinterest/import
Body: {pin JSON from step 2}
```

**Or batch (5-10 pins):**
```bash
POST /api/research/pinterest/library
Body: {
  "pins": [{pin1}, {pin2}, {pin3}, ...]
}
```

Response includes:
- Top fonts (frequency ranked)
- Top colors (frequency ranked)
- Top strategies
- Top apps
- Average engagement score
- Recommended font pairings
- Recommended color palettes
- Brain rules (auto-generated FeedIA rules)

---

### 4. FeedIA Brain Learns

When you import research, FeedIA's brain:
1. **Locks typography** - Uses top fonts for new carousels
2. **Locks colors** - Uses top palettes by default
3. **Learns strategies** - Applies top copy techniques
4. **Recommends apps** - Suggests tools for execution
5. **Targets engagement** - Aims for average engagement score found in research

---

## Your Pinterest Pin List (Fill in per pin)

| Pin URL | Title | Fonts | Colors | Layout | Strategy | Apps | Inspiration % |
|---------|-------|-------|--------|--------|----------|------|--------------|
| https://pin.it/6v5npgCT2 | 10 Mistakes | Poppins, Inter | Pink, Cyan, White | Image+overlay, center | Listicle, curiosity | Canva | 90 |
| https://pin.it/3EyuMPfnC | | | | | | | |
| https://pin.it/112E5k0dv | | | | | | | |
| ... | | | | | | | |

---

## Tools to Speed Up Analysis

### Extract Fonts
- **WhatFont Chrome**: Hover over text, identify font + size
- **Font.google.com**: Browse fonts, find similar ones

### Extract Colors
- **Coolors.co**: Upload image → auto-extract palette
- **Adobe Color**: Upload image → color harmony
- **EyeDropper Chrome**: Click color on screen → get hex code

### Mockup Analysis
- **Figma Community**: Search "[industry] mockup" → analyze designs
- **Dribbble**: Search industry → see best practices
- **Behance**: Search niche → study top work

### Resource Finding
- **Unsplash**: Browse images by category, note URLs
- **Pexels**: Free stock photos
- **Adobe Stock**: Premium but high-quality
- **Google Fonts**: Free fonts library
- **Adobe Fonts**: Premium fonts
- **Smartmockups**: Free mockup generator

---

## Checklist: 50 Pins to FeedIA Brain

Process one pin every 5-10 minutes:
- [ ] 1-5 pins imported → Basic palette + fonts locked
- [ ] 6-15 pins → Strategies emerge, copy patterns clear
- [ ] 16-30 pins → Brain confident in recommendations
- [ ] 31-50 pins → Full coherence library built

**After 50 pins:**
- FeedIA knows exact fonts to use
- FeedIA knows color combos that work
- FeedIA knows which copy techniques resonate
- FeedIA knows which apps to recommend
- FeedIA targets engagement you found in research

---

## Next Steps

1. Open 1st Pinterest pin
2. Analyze typography, colors, layout, strategy
3. Fill JSON template
4. POST to `/api/research/pinterest/import`
5. Repeat for 10+ pins
6. POST batch to `/api/research/pinterest/library`
7. Review response → FeedIA brain updated
8. Generate new carousel → Uses learned patterns

**FeedIA is now trained on YOUR curated Pinterest research.**
