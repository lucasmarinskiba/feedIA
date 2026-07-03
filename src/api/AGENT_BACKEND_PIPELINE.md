# Agent Backend Pipeline: Reasoning Before Generation

**Backend integration: agents load context → LLM plans → tool generates quality content.**

---

## PIPELINE FLOW

```
Tool Request
    ↓
Load Agent Frameworks (matching tool type)
    ↓
Extract Brief Variables [BRACKETS]
    ↓
Build Agent Context (copy templates, specs, metrics)
    ↓
Inject into System Prompt (reasoning)
    ↓
LLM Plans Before Generating (step-by-step)
    ↓
Tool Executes (carousel/photo/video/etc)
    ↓
Quality Output
```

---

## BACKEND INTEGRATION PATTERN

```typescript
// toolRequest: { type: 'carousel', brief: { subject: 'athlete', style: 'aspirational' } }

async function generateWithAgents(toolRequest: ToolRequest): Promise<Content> {
  // 1. LOAD AGENTS
  const relevantAgents = loadAgentsByToolType(toolRequest.type);
  // For carousel: [IdeationEngine, DesignDirector, TransformationArc, CopyEngine]
  
  // 2. BUILD CONTEXT
  const agentContext = {
    ideation: relevantAgents.ideation.getTemplates(), // 50+ mashups
    design: relevantAgents.design.getSpecs(), // visual specs + palette
    narrative: relevantAgents.transformation.getFramework(), // 5-stage arc
    copy: relevantAgents.copyEngine.getTemplates(), // hook/edu/conclusion
  };
  
  // 3. INJECT INTO SYSTEM PROMPT
  const systemPrompt = buildSystemPrompt({
    agents: agentContext,
    reasoning: true, // Enable CoT
  });
  
  // 4. LLM PLANS BEFORE GENERATING
  const plan = await llm({
    system: systemPrompt,
    user: `Brief: ${JSON.stringify(toolRequest.brief)}\n\nPlan first: What is the core concept? Which templates apply? Why?`,
    temperature: 0.7, // Creativity + reasoning
    maxTokens: 1000, // Planning budget
  });
  
  // 5. LLM GENERATES WITH PLAN
  const content = await llm({
    system: systemPrompt,
    user: `\n\nPlan: ${plan}\n\nNow generate the ${toolRequest.type} following the plan. Quality first.`,
    temperature: 0.6, // Focused execution
    maxTokens: 3000, // Generation budget
  });
  
  return parseContent(content, toolRequest.type);
}
```

---

## AGENT CONTEXT BY TOOL TYPE

### Carousel
Agents injected:
- **Ideation Engine**: Concept mashup templates
- **Design Director**: Spec template (palette/pose/typography/lens)
- **Transformation Arc**: 5-slide narrative structure
- **Copy Engine**: Psychology-driven copy (hook/education/CTA per slide)
- **Detail Obsession**: Micro-spec for hero images

System prompt includes:
```
You are designing a carousel with these constraints:
[IDEATION_MASHUPS]: Core concept options
[DESIGN_SPECS]: Visual direction (palette, pose, lighting)
[NARRATIVE_ARC]: 5-stage structure (beginning→struggle→breakthrough→dominance→legacy)
[COPY_TEMPLATES]: Psychology-driven messaging
[DETAIL_SPECS]: Hyperrealistic detail for hero images

Reason through:
1. Which concept (mashup) best fits brief?
2. Which design spec (palette/pose/mood) aligns?
3. How does narrative arc structure the 4-9 slides?
4. What copy psychology drives each slide?
5. What micro-details (jersey/sweat/lighting) elevate hero images?

Then generate carousel.
```

### Photo
Agents injected:
- **Design Director**: Lighting/lens/pose/background spec
- **Detail Obsession**: Crest/fabric/sweat texture (8K)
- **Icon Day Aesthetic**: Gradient positioning + psychological energy
- **Bench Sitting Portrait**: Posture/jersey/expression specs

System prompt includes:
```
You are directing a portrait with:
[DESIGN_SPEC]: Lighting, lens (mm/f-stop), pose, background
[DETAIL_SPECS]: Crest embroidery (stitch count), fabric texture, sweat zones
[ICON_AESTHETIC]: Gradient positioning (psychological energy)
[POSTURE_SPEC]: Jersey detail, arm position, facial expression

Reason:
1. What mood does [DESIGN_SPEC] create?
2. What micro-details (fabric/embroidery) justify 8K rendering?
3. How does gradient positioning reinforce psychological energy?
4. What posture communicates [TARGET_EMOTION]?

Then generate photo brief.
```

### Video/Reel
Agents injected:
- **Viral Humor**: Absurdist mashup + hook-first concept
- **Transformation Arc**: Emotional journey (5-stage)
- **Content Strategy**: Pillar alignment + platform format
- **Copy Engine**: Hook + retention + CTA

System prompt includes:
```
You are scripting a viral video with:
[VIRAL_CONCEPT]: Absurdist mashup (hook first 3 seconds)
[EMOTIONAL_ARC]: Beginning→struggle→breakthrough→dominance→legacy progression
[PLATFORM_SPECS]: Format (15-60sec), cadence, pillar %
[COPY]: Psychology-driven hook/retention/CTA

Reason:
1. Is hook hooking first 3 seconds? Why?
2. Does emotional arc sustain watch-through?
3. Does pillar alignment match brand?
4. What makes CTA irresistible?

Then generate script.
```

### Stories
Agents injected:
- **Brand Ecosystem**: Lifestyle context + environment
- **Environmental Context**: Locker room → street → home progression
- **Bench Sitting**: Authentic composure pose
- **Copy Engine**: Micro-copy (14-18px) for story overlay

System prompt includes:
```
You are creating a 3-5 story stack with:
[ECOSYSTEM]: Authentic lifestyle moment + environment
[PROGRESSION]: Locker room → street → home (emotional journey)
[POSE_SPEC]: Composure, authenticity, micro-expression
[COPY_SPECS]: Micro-copy for text overlay (14-18px)

Reason:
1. Which moment in progression feels most authentic?
2. What pose communicates unguarded composure?
3. What 2-3 word micro-copy hooks story viewer?
4. How does story stack build narrative tension?

Then generate story briefs.
```

---

## QUALITY CHECKPOINTS

Before returning content:

1. **Concept check**: Does output match ideation mashup?
2. **Design check**: Does palette/pose/lighting match design spec?
3. **Narrative check**: Does 5-stage arc structure content?
4. **Copy check**: Does psychology-driven messaging convert?
5. **Detail check**: Are micro-details (8K level) specified?

If fail: regenerate with stricter constraints.

---

## BACKEND INTEGRATION EXAMPLE (Carousel)

```typescript
async function carouselWithAgents(brief: CarouselBrief): Promise<CarouselOutput> {
  const agents = {
    ideation: await loadAgent('CREATIVE_IDEATION_ENGINE.md'),
    design: await loadAgent('DESIGN_DIRECTOR_SPECIFICATIONS.md'),
    narrative: await loadAgent('ACHIEVEMENT_TRANSFORMATION_ARC.md'),
    copy: await loadAgent('COPY_ENGINE.md'),
    detail: await loadAgent('DETAIL_OBSESSION_SPECIFICATIONS.md'),
  };
  
  const systemPrompt = `
    You are a carousel creator with expert knowledge:
    
    IDEATION CONCEPTS (choose one):
    ${agents.ideation.getMashups().map(m => `- ${m.title}: ${m.description}`).join('\n')}
    
    DESIGN SPECS (apply this):
    ${agents.design.formatSpec(brief.mood)}
    
    NARRATIVE STRUCTURE (follow this):
    ${agents.narrative.getFramework()}
    
    COPY PSYCHOLOGY (use this):
    ${agents.copy.getTemplates()}
    
    DETAIL OBSESSION (if hero image):
    ${agents.detail.getMicroSpecs()}
    
    Your job: Reason through the brief, plan the carousel, then generate.
  `;
  
  // Step 1: Plan
  const plan = await claude(systemPrompt, `
    Brief: ${JSON.stringify(brief)}
    
    Reason through:
    1. Core concept mashup?
    2. Design palette/pose/mood?
    3. Narrative arc structure (5-stage)?
    4. Copy psychology per slide?
    5. Hero image micro-details?
  `, { maxTokens: 1000 });
  
  // Step 2: Generate
  const carousel = await claude(systemPrompt, `
    Plan: ${plan}
    
    Now generate the full carousel (${brief.slides} slides):
    - Slide copy (psychology-driven)
    - Visual directions (design spec)
    - Micro-detail specifications (for AI image gen)
    - Animation timing
  `, { maxTokens: 3000 });
  
  return parseCarousel(carousel);
}
```

---

## BENEFITS

- **Better reasoning**: LLM plans before generating
- **Consistent quality**: Agents enforce brand/psychology/narrative standards
- **Reusable templates**: No prompt engineering per request
- **Measurable output**: Plan → execution traceable
- **Iteration**: Fail fast on planning phase before generation

Agent-fed backend thinking.
