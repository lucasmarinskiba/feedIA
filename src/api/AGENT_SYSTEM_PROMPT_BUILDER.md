# Agent System Prompt Builder: Reasoning-First Generation

**Factory function: build system prompts that inject agent context + enable reasoning.**

---

## BUILDER PATTERN

```typescript
class AgentSystemPromptBuilder {
  private agents: Map<string, AgentFramework> = new Map();
  private reasoning: boolean = true;
  
  addAgent(type: string, framework: AgentFramework): this {
    this.agents.set(type, framework);
    return this;
  }
  
  build(toolType: string, brief: BriefObject): string {
    const systemPrompt = [
      this.buildRoleStatement(toolType),
      this.buildAgentContext(toolType),
      this.buildReasoningInstructions(toolType),
      this.buildQualityChecks(toolType),
    ].join('\n\n');
    
    return systemPrompt;
  }
  
  private buildRoleStatement(toolType: string): string {
    return `You are a professional ${toolType} creator for FeedIA.
Your job: Think like a strategist first, then create like an artist.
Always reason before generating. Always reference agent frameworks.`;
  }
  
  private buildAgentContext(toolType: string): string {
    const contextParts = [];
    
    for (const [agentType, framework] of this.agents) {
      contextParts.push(`## ${agentType.toUpperCase()}\n${framework.getSummary()}`);
    }
    
    return contextParts.join('\n\n');
  }
  
  private buildReasoningInstructions(toolType: string): string {
    if (!this.reasoning) return '';
    
    return `## REASONING BEFORE GENERATION

Before you generate the ${toolType}:

1. CONCEPT CHECK
   - Which agent framework's concept/mashup best fits the brief?
   - Why does this concept work?

2. DESIGN CHECK
   - Which design spec (palette/pose/lighting) aligns?
   - What mood/energy does this create?

3. NARRATIVE CHECK (if applicable)
   - How does the 5-stage arc structure this content?
   - What emotion journey does viewer experience?

4. COPY CHECK
   - What psychology drives the copy?
   - Hook → benefit → CTA flow?

5. DETAIL CHECK (if hero image)
   - What 8K micro-details specify quality?
   - Crest/fabric/sweat texture realistic?

Then generate the ${toolType} following this reasoning.`;
  }
  
  private buildQualityChecks(toolType: string): string {
    return `## QUALITY GATES

Your output must satisfy:
✓ Concept: Matches chosen agent framework concept
✓ Design: Palette, pose, lighting per design spec
✓ Narrative: Follows 5-stage arc (if applicable)
✓ Copy: Psychology-driven, not generic
✓ Detail: 8K specs for hero images (if applicable)
✓ Brand: Aligns with [BRAND_GUIDELINES]
✓ Platform: Optimized for [PLATFORM] format/audience

If output fails any gate: regenerate.`;
  }
}
```

---

## USAGE EXAMPLES

### Carousel Generation
```typescript
const promptBuilder = new AgentSystemPromptBuilder();

promptBuilder
  .addAgent('ideation', CREATIVE_IDEATION_ENGINE)
  .addAgent('design', DESIGN_DIRECTOR)
  .addAgent('narrative', TRANSFORMATION_ARC)
  .addAgent('copy', COPY_ENGINE)
  .addAgent('detail', DETAIL_OBSESSION);

const systemPrompt = promptBuilder.build('carousel', {
  subject: 'athlete',
  style: 'aspirational',
  slides: 5,
});

// LLM call with reasoning
const plan = await llm({ system: systemPrompt, user: userBrief, temperature: 0.7 });
const carousel = await llm({ system: systemPrompt, user: `${userBrief}\n\nPlan: ${plan}`, temperature: 0.6 });
```

### Photo Generation
```typescript
const promptBuilder = new AgentSystemPromptBuilder();

promptBuilder
  .addAgent('design', DESIGN_DIRECTOR)
  .addAgent('detail', DETAIL_OBSESSION)
  .addAgent('aesthetic', ICON_DAY_AESTHETIC)
  .addAgent('posture', BENCH_SITTING);

const systemPrompt = promptBuilder.build('photo', {
  mood: 'premium',
  format: '4:5',
  resolution: '8K',
});

const plan = await llm({ system: systemPrompt, user: photoBrief, temperature: 0.7 });
const photo = await llm({ system: systemPrompt, user: `${photoBrief}\n\nPlan: ${plan}`, temperature: 0.6 });
```

### Reel Generation
```typescript
const promptBuilder = new AgentSystemPromptBuilder();

promptBuilder
  .addAgent('viral', VIRAL_HUMOR)
  .addAgent('strategy', CONTENT_STRATEGY)
  .addAgent('funnel', MARKETING_FUNNEL)
  .addAgent('copy', COPY_ENGINE);

const systemPrompt = promptBuilder.build('reel', {
  duration: '30sec',
  platform: 'tiktok',
  goal: 'awareness',
});

const plan = await llm({ system: systemPrompt, user: reelBrief });
const reel = await llm({ system: systemPrompt, user: `${reelBrief}\n\nPlan: ${plan}` });
```

---

## SYSTEM PROMPT OUTPUT EXAMPLE (Carousel)

```
You are a professional carousel creator for FeedIA.
Your job: Think like a strategist first, then create like an artist.
Always reason before generating. Always reference agent frameworks.

## IDEATION ENGINE
Core patterns: 50+ mashups (scale collision, inversion, emotion twist, temporal, context swap, tool mashup, multi-subject)
Example: "Athlete as FIFA card" + "Trophy as trophy" = "Athlete trading card with trophy stats"
Your task: Choose which mashup concept best fits brief

## DESIGN DIRECTOR SPECIFICATIONS
Palettes: Gold Legacy, Coral Energy, Purple Icon, Clean Editorial
Poses: Double exposure, bench sitting, icon day standing
Lighting: Cinematic, daylight, studio dramatic
Typography: 28-36px headline bold, 14-18px body regular
Your task: Apply palette/pose/lighting matching mood

## ACHIEVEMENT TRANSFORMATION ARC
5-stage structure: Beginning (grey) → Struggle (coral) → Breakthrough (orange) → Dominance (gold) → Legacy (purple)
Each stage has specific visual/psychological energy
Your task: Structure carousel slides following this arc

## COPY ENGINE
Hook: curiosity + mystery (first 2 slides)
Education: value + proof (middle 3 slides)
Conclusion: social proof + CTA (last slides)
Psychology: fear/hope/aspiration/belonging matching stage
Your task: Write psychology-driven copy per slide

## DETAIL OBSESSION SPECIFICATIONS
Hero images require: Crest embroidery (stitch count), fabric weave texture, sweat zones, lighting reflections
Rendering: 8K micro-detail specification
Your task: If carousel has hero image, specify 8K details

## REASONING BEFORE GENERATION

Before you generate the carousel:

1. CONCEPT CHECK
   - Which mashup concept (50+ options) best fits?
   - Why does this concept work for [SUBJECT]?

2. DESIGN CHECK
   - Which palette/pose/lighting aligns with [MOOD]?
   - What energy does this design create?

3. NARRATIVE CHECK
   - How does 5-stage arc structure [SLIDE_COUNT] slides?
   - What emotion journey does viewer experience?

4. COPY CHECK
   - What psychology drives each slide's copy?
   - Hook → benefit → CTA flow?

5. DETAIL CHECK
   - Are hero images specified at 8K level?
   - Crest/fabric/sweat texture realistic?

## QUALITY GATES

Your output must satisfy:
✓ Concept: Matches chosen mashup framework
✓ Design: Palette, pose, lighting per spec
✓ Narrative: Follows 5-stage arc
✓ Copy: Psychology-driven per slide
✓ Detail: 8K specs for hero images
✓ Brand: Aligns with [BRAND_GUIDELINES]
✓ Platform: Optimized for carousel format

If output fails any gate: regenerate.
```

---

## BACKEND INTEGRATION

```typescript
// In carouselEndpoint.ts
import { AgentSystemPromptBuilder } from './AGENT_SYSTEM_PROMPT_BUILDER';

router.post('/api/carousel/generate', async (req, res) => {
  const brief = req.body;
  
  // Load all agent frameworks
  const agents = await loadAgentFrameworks([
    'CREATIVE_IDEATION_ENGINE',
    'DESIGN_DIRECTOR',
    'ACHIEVEMENT_TRANSFORMATION_ARC',
    'COPY_ENGINE',
    'DETAIL_OBSESSION',
  ]);
  
  // Build system prompt with agents + reasoning
  const promptBuilder = new AgentSystemPromptBuilder();
  agents.forEach(agent => promptBuilder.addAgent(agent.type, agent));
  const systemPrompt = promptBuilder.build('carousel', brief);
  
  // Step 1: Plan
  const plan = await claude({
    system: systemPrompt,
    user: buildUserPrompt(brief, 'plan'),
    temperature: 0.7,
    maxTokens: 1000,
  });
  
  // Step 2: Generate
  const carousel = await claude({
    system: systemPrompt,
    user: buildUserPrompt(brief, 'generate', plan),
    temperature: 0.6,
    maxTokens: 3000,
  });
  
  // Validate + return
  if (validateCarousel(carousel, plan)) {
    res.json({ success: true, carousel });
  } else {
    res.status(400).json({ error: 'Output failed quality gates' });
  }
});
```

Agents think → LLM reasons → tool generates quality.
