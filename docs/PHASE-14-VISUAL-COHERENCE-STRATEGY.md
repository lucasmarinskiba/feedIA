# Phase 14: Visual Coherence + Brand Strategy Layer

## Extracted Patterns from Pinterest Research

### Design Principles
1. **Background Images + Text Overlay**
   - Hero image as background fill
   - Text overlay (semi-transparent dark background)
   - Contrast ratio 4.5:1 minimum for readability
   - Font sizes: Headline 36-48px, Body 16-20px

2. **Cross-Slide Visual Continuity**
   - Image split across slides (half on slide N, half on N+1)
   - Creates "line of time" or "unfolding narrative" effect
   - Objects positioned consistently (alignment rules)
   - Color palette flows seamlessly

3. **Typography Strategy**
   - Headline fonts: Montserrat, Poppins, Playfair Display
   - Body fonts: Inter, Open Sans, Lora
   - Script/Manuscript: Pacifico, Brushed fonts (accent only)
   - Adobe fonts: Proxima Nova, Futura
   - NEVER use: Helvetica, Arial (dated, corporate feel)
   - Font pairing rules: Bold + Light contrast

4. **Visual Elements**
   - Mockups (free: Figma, Canva, Mockup.co)
   - Textures + Patterns (not busy backgrounds)
   - Signage + Real-world angles
   - Packaging designs
   - Rounded corners (12-16px)
   - Subtle shadows (box-shadow: 0 2px 8px rgba)

### Content Strategy
1. **Sales Copy Triggers** (Digital Products)
   - "Limited time", "Exclusive", "For [audience] only"
   - Pain point → Solution → Proof → CTA
   - Social proof: "X people already...", "Join Y thousand..."
   - Urgency: "Last 3 spots", "Closes [date]"

2. **Brand Storytelling**
   - Origin story (why founded?)
   - Customer transformation stories
   - Behind-the-scenes authenticity
   - Values alignment with audience

3. **Content Correlation Rules**
   - Posts relate visually (not isolated)
   - Consistent tone across carousel (hook → value → CTA pattern)
   - Logo placement consistent
   - Color palette locked per account
   - Typography hierarchy locked

4. **Conversion Words** (for product/service posts)
   - "Transform your [problem]" (not "improve")
   - "Finally, a way to [desire]" (not "maybe achieve")
   - "See results in [timeframe]" (specific, not vague)
   - "[Benefit] without [pain point]" (contrast)

### Resource Sources
- **Design Inspiration**: Behance.net, Dribbble.com, Pinterest (above), Awwwards.com
- **Images**: Unsplash, Pexels, Pixabay, Envato, Adobe Stock
- **Fonts**: Google Fonts, Adobe Fonts, DaFont, Font.google.com, Fonts.com
- **Mockups**: Figma, Canva, Smartmockups, Mockup.co, Placeit
- **Color Tools**: Coolors.co, Adobe Color, Colordot.it
- **Apps to integrate**: CapCut (video), Canva (design), Figma (prototyping)

## Implementation Architecture for FeedIA

### 4 New Modules (Phase 14-16)

#### Phase 14: Visual Coherence Engine
```
Input: Carousel/Video slides
Process:
  1. Image selection (background rules)
  2. Text overlay positioning (safe zones: 20% margins)
  3. Cross-slide continuation (detect split images)
  4. Shadow/depth calculation
  5. Mockup insertion rules
Output: Visual specs + mockup URLs
```

#### Phase 15: Brand Consistency Enforcer
```
Input: Account brand kit
Process:
  1. Lock typography (headline + body fonts)
  2. Lock color palette (primary, secondary, accent, neutral)
  3. Logo placement rules
  4. Tone validation (matches brand voice)
  5. Content correlation check
Output: Consistency score (0-100) + warnings
```

#### Phase 16: Content Coherence Validator
```
Input: Multiple posts (carousel, video, story, reel)
Process:
  1. Visual cohesion (similar aesthetics?)
  2. Messaging alignment (same target audience?)
  3. Story continuity (related or jarring?)
  4. Posting sequence (logical order for feed?)
Output: Coherence score + recommendations
```

#### Phase 17: Resource Aggregator
```
Input: Design brief (style, emotion, industry)
Process:
  1. Scrape Behance/Dribbble for similar designs
  2. Extract color palettes (via image analysis)
  3. Extract typography (via OCR on images)
  4. Suggest mockup resources
  5. Suggest image sources (Unsplash, Pexels, etc)
Output: Curated design reference list
```

## Decision Points for FeedIA Brain

**When generating content, ask:**
1. Should this carousel have image backgrounds or flat design?
2. Which typeface hierarchy (Adobe? Google? Script)?
3. Are we creating visual continuity across posts?
4. Does tone match brand voice (validate via past posts)?
5. What resources should we fetch for reference?

**Content Coherence Checks:**
- Do all posts in queue use same color palette?
- Are fonts consistent across carousel/video?
- Does CTA tone match brand personality?
- Are we creating a cohesive "feed story"?

## Next Steps
1. Implement Visual Coherence Engine (Phase 14)
2. Build Brand Enforcer (Phase 15)
3. Add Content Validator (Phase 16)
4. Wire Resource Aggregator (Phase 17)
5. Update studioToolsAPI to use all layers
