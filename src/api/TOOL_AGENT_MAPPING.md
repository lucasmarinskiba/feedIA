# Tool-Agent Mapping: Complete Backend Architecture

**Which agents feed into which content creation tools.**

---

## MASTER MAPPING TABLE

| Tool | Type | Core Agents | Planning | Generation | Output Quality |
|------|------|-------------|----------|------------|-----------------|
| Carousel | Multi-slide | Ideation + Design + Transform Arc + Copy | Plan narrative arc | Generate per-slide copy + visual | 5-stage structure |
| Photo | Single image | Design Director + Detail Obsession + Icon Day | Plan visual mood | Generate pose/lighting/texture spec | 8K micro-detail |
| Video | Narrative | Transform Arc + Viral Humor + Copy | Plan emotional journey | Generate shot list + script + timing | Story-driven flow |
| Reel | Short viral | Viral Humor + Content Strategy + Copy | Plan 3-sec hook | Generate hook copy + trending format | Viral optimization |
| Stories | Stack (3-5) | Brand Ecosystem + Environmental + Bench Sitting + Copy | Plan progression | Generate stack sequence + overlay copy | Authentic momentum |
| Caption | Text | Copy Engine + Audience Psychology + CTR | Plan hook + benefit + CTA | Generate optimized copy | Psychology-driven |
| Hashtag | Meta | Content Strategy + Audience Psychology | Plan pillar alignment | Generate hashtag mix (trending + niche) | Reach + engagement |
| Thumbnail | Visual | Design Director + Viral Humor + Icon Day | Plan attention grab | Generate thumbnail spec + typography | Click-through rate |

---

## AGENT INITIALIZATION BY TOOL

### Carousel Tool
```
Agents loaded:
1. CREATIVE_IDEATION_ENGINE.md (50+ mashups)
2. DESIGN_DIRECTOR_SPECIFICATIONS.md (visual specs)
3. ACHIEVEMENT_TRANSFORMATION_ARC.md (5-slide narrative)
4. COPY_ENGINE.md (psychology-driven copy)
5. DETAIL_OBSESSION_SPECIFICATIONS.md (8K specs for hero)

System prompt includes:
- Which mashup concept?
- Which visual palette/mood?
- How does 5-stage arc structure slides?
- What psychology drives each slide's copy?
- What micro-details (if hero image)?
```

### Photo Tool
```
Agents loaded:
1. DESIGN_DIRECTOR_SPECIFICATIONS.md (pose/lighting/lens)
2. DETAIL_OBSESSION_SPECIFICATIONS.md (crest/fabric/sweat)
3. ICON_DAY_AESTHETIC.md (gradient/psychology)
4. BENCH_SITTING_PORTRAIT.md (posture/jersey)
5. EMOTIONAL_COLOR_PSYCHOLOGY.md (color → emotion)

System prompt includes:
- What mood/lighting/lens?
- What micro-details (embroidery stitch count)?
- What gradient positioning (psychology)?
- What posture/expression?
- What color psychology?
```

### Video Tool
```
Agents loaded:
1. ACHIEVEMENT_TRANSFORMATION_ARC.md (5-stage emotional journey)
2. VIRAL_HUMOR_CONCEPTS.md (absurdist hook)
3. CONTENT_STRATEGY_AGENT.md (pillar alignment)
4. COPY_ENGINE.md (hook/retention/CTA)
5. ENVIRONMENTAL_CONTEXT_STORYTELLING.md (location progression)

System prompt includes:
- What's the emotional journey?
- How does hook grab first 3 seconds?
- Does pillar alignment match brand strategy?
- What psychology drives retention?
- What locations tell authentic story?
```

### Reel Tool
```
Agents loaded:
1. VIRAL_HUMOR_CONCEPTS.md (absurdist mashup)
2. CONTENT_STRATEGY_AGENT.md (trending format)
3. MARKETING_FUNNEL_AGENT.md (awareness stage content)
4. COPY_ENGINE.md (hook-first copy)
5. AUDIENCE_PSYCHOLOGY_AGENT.md (segment resonance)

System prompt includes:
- Which viral concept hooks first 3 seconds?
- Is format matching trending sound/trend?
- Does content match awareness-stage funnel?
- What hook psychology matches audience?
- What CTA converts?
```

### Stories Tool
```
Agents loaded:
1. BRAND_ECOSYSTEM_ARCHITECTURE.md (lifestyle context)
2. ENVIRONMENTAL_CONTEXT_STORYTELLING.md (locker→street→home)
3. BENCH_SITTING_PORTRAIT.md (authentic posture)
4. COPY_ENGINE.md (micro-copy for overlay)
5. AUDIENCE_PSYCHOLOGY_AGENT.md (emotional trigger)

System prompt includes:
- What authentic moment reveals brand?
- How does location progression build story?
- What posture communicates composure?
- What 2-3 word micro-copy hooks?
- What emotion does story trigger?
```

### Caption Tool
```
Agents loaded:
1. COPY_ENGINE.md (psychology-driven structure)
2. AUDIENCE_PSYCHOLOGY_AGENT.md (pain → solution)
3. MARKETING_FUNNEL_AGENT.md (funnel stage messaging)
4. CTR_OPTIMIZER.md (word count, emoji, keywords)

System prompt includes:
- What emotion hook first sentence?
- What pain point does audience feel?
- What solution does content offer?
- What CTA converts?
- Optimal length/emoji/keywords for platform?
```

### Hashtag Tool
```
Agents loaded:
1. CONTENT_STRATEGY_AGENT.md (pillar % allocation)
2. AUDIENCE_PSYCHOLOGY_AGENT.md (audience segment tags)
3. HASHTAG_SCIENCE.md (trending + evergreen mix)

System prompt includes:
- What content pillar is this? (aspiration/authentic/education/etc)
- What segment is target audience?
- Trending hashtags this week?
- Niche hashtags for reach depth?
```

---

## QUALITY ENFORCEMENT

Each tool validates before output:

```typescript
function validateOutput(output: ContentOutput, agent_plan: Plan): boolean {
  // 1. Concept check
  if (!output.concept_matches_mashup(agent_plan.ideation)) return false;
  
  // 2. Design check
  if (!output.palette_matches_spec(agent_plan.design)) return false;
  
  // 3. Narrative check
  if (output.type === 'carousel' && !output.follows_5_stage_arc()) return false;
  
  // 4. Copy check
  if (!output.copy_matches_psychology(agent_plan.copy)) return false;
  
  // 5. Detail check
  if (output.has_hero_image && !output.includes_8k_specs()) return false;
  
  return true;
}
```

---

## BACKEND FLOW SUMMARY

```
User Request (carousel, photo, video, etc)
    ↓
Tool loads matching agents
    ↓
Build system prompt with agent context
    ↓
LLM STEP 1: Plans (concept, design, narrative, copy, detail)
    ↓
LLM STEP 2: Generates (following plan)
    ↓
Validate output against agent specs
    ↓
Return quality content
```

No frontend involvement. Pure backend reasoning + generation.
