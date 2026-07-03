# Carousel Prompt Generator - Infinite Adaptations

**System: Take 50 base prompts, generate unlimited variations through substitution + remixing.**

---

## GENERATOR LOGIC

```
Base Prompt + Variable Substitution + Mashup = New Prompt
```

**Example Base:** 
```
S1: "[THING] - the most [PROBLEM] [NOUN]"
S2: "[BELIEF] BUT [REALITY]"
S3: "[BENEFIT] [DETAIL]"
S4: "[BENEFIT] [DETAIL]"
S5: "[ACTION] for [RESULT]"
```

**Substitution:**
```
THING = Fibre → Water → Sleep → Protein → Discipline
PROBLEM = ignored → misunderstood → overlooked → underrated → hidden
NOUN = nutrient → skill → asset → tool → habit
BELIEF = "More X = success" → "X is easy" → "Everyone does X" → "X is expensive"
REALITY = "Quality matters more" → "Timing critical" → "System beats willpower"
BENEFIT = improves → enables → prevents → accelerates → compounds
DETAIL = digestion → focus → recovery → compounding → retention
```

---

## GENERATOR TEMPLATES (Generate unlimited prompts)

### Template 1: Problem-Solution Arc
```
S1: "[HIDDEN_ASSET] - the most [QUALIFIER] [CATEGORY]"
S2: "[COMMON_MISTAKE] BUT [TRUTH]"
S3: "[MECHANISM_A]: [BENEFIT_A]"
S4: "[MECHANISM_B]: [BENEFIT_B]"
S5: "[ACTION] to [OUTCOME]"

Variables:
HIDDEN_ASSET: fibre, sleep, networking, focus, delegation, compound interest
QUALIFIER: ignored, underrated, overlooked, misunderstood, forgotten
CATEGORY: nutrient, skill, asset, force, lever
COMMON_MISTAKE: people assume X is simple/expensive/not needed
TRUTH: actually requires Y / only works with Z / changes when Q
MECHANISM_A/B: specific function, benefit description
BENEFIT_A/B: measurable improvement, health/wealth/performance metric
ACTION: actionable step, implementation detail
OUTCOME: quantified result, time frame
```

**100+ variations from substitution alone**

---

### Template 2: Contrast-Education Arc
```
S1: "[NARRATIVE]: [CONTRAST_VISUAL]"
S2: "[SPLIT_REALITY]: True vs False"
S3: "[POSITIVE_ASPECT_A] [DETAIL]"
S4: "[POSITIVE_ASPECT_B] [DETAIL]"
S5: "[TAKEAWAY]: Do [ACTION]"

Variables:
NARRATIVE: [TOPIC] - where misconception lives
CONTRAST_VISUAL: hero image showing split reality
SPLIT_REALITY: What people think vs what's true
POSITIVE_ASPECT: specific benefit, mechanism, outcome
DETAIL: numbers, timeline, science, example
ACTION: 30-day challenge, daily practice, one-time change
```

---

### Template 3: Progression Arc (Beginner to Expert)
```
S1: "[FOUNDATION] - Start here"
S2: "[INTERMEDIATE] - Once mastered, this"
S3: "[ADVANCED_A] - Then this technique"
S4: "[ADVANCED_B] - Finally, this optimization"
S5: "[MASTERY] - Result after 90 days"

Variables:
FOUNDATION: basic principle, entry point, minimum viable
INTERMEDIATE: next level, building on foundation
ADVANCED_A: optimization 1, compound effect
ADVANCED_B: optimization 2, synergistic benefit
MASTERY: transformation, measurable achievement
```

---

### Template 4: Myth-Busting Arc
```
S1: "[MYTH]: What everyone believes"
S2: "[EVIDENCE]: Why it's wrong (scientific)"
S3: "[REALITY_A]: What actually works"
S4: "[REALITY_B]: Why it's different"
S5: "[IMPLEMENTATION]: Change your approach"

Variables:
MYTH: common belief, folk wisdom, industry standard
EVIDENCE: study, data, logic contradiction
REALITY_A: mechanism that actually works
REALITY_B: surprising corollary, second benefit
IMPLEMENTATION: specific action, tracking method
```

---

### Template 5: Compound Effect Arc
```
S1: "[SMALL_ACTION]: Seems insignificant"
S2: "[DAILY_IMPACT]: Repeated compounds"
S3: "[1_YEAR]: Result after 12 months"
S4: "[5_YEAR]: Exponential result after 5 years"
S5: "[START_TODAY]: Begin your 5-year journey"

Variables:
SMALL_ACTION: 1% daily, $5/day, 10min/day, 1 rep/day
DAILY_IMPACT: [X] per day compounds to [Y] per year
1_YEAR: quantified result, comparison benchmark
5_YEAR: transformation metric, wealth/health/skill level
START_TODAY: lowest friction entry point
```

---

## MASHUP GENERATOR

**Combine elements from different base prompts:**

```
Base Prompt A: "Fibre - most ignored nutrient"
Base Prompt B: "Compound interest - wealth building"

Mashup: "Micro-habits - most underestimated wealth builder"

New S1: "Tiny habits - most ignored wealth accelerator"
New S2: "1% daily improvement compounds to 37x in 1 year"
New S3: "Reading 10min daily = 36 books/year = expertise"
New S4: "Saving $5/day = $1825/year = compound interest engine"
New S5: "Start 1 tiny habit today, 5 years transforms life"
```

**Mashup pairs:**
- Discipline + Compounding = Unstoppable growth
- Sleep + Performance = Athletic advantage
- Communication + Networking = Career acceleration
- Automation + Delegation = Business scaling
- Hydration + Metabolism = Body optimization

---

## GENERATION ALGORITHM

```typescript
function generateNewPrompt(baseTopic: string, newContext: string, template: number): Prompt {
  // Step 1: Load template structure
  const structure = TEMPLATES[template];
  
  // Step 2: Extract variables from base prompts related to baseTopic
  const baseVariables = extractVariables(BASE_PROMPTS, baseTopic);
  
  // Step 3: Substitute into template
  const newPrompt = substitute(structure, {
    ...baseVariables,
    CONTEXT: newContext,  // e.g., "for solopreneurs", "for parents", "for students"
    QUALIFIER: randomQualifier(),  // ignored/underrated/overlooked
    OUTCOME: generateOutcome(baseTopic)  // quantified result
  });
  
  // Step 4: Validate narrative flow
  if (validateNarrativeArc(newPrompt)) {
    return newPrompt;
  } else {
    return regenerate();  // Retry if arc doesn't flow
  }
}

// Generate 100 new prompts from 50 base + 5 templates + substitutions
const generatedPrompts = [];
for (const basePrompt of BASE_50) {
  for (const template of TEMPLATES) {
    for (const context of CONTEXTS) {  // e.g., "CEO", "student", "parent", "entrepreneur"
      generatedPrompts.push(generateNewPrompt(basePrompt.topic, context, template));
    }
  }
}
// 50 × 5 templates × 10 contexts = 2500 unique prompts automatically
```

---

## CONTEXT VARIATIONS (Multiply prompts by audience)

Same base prompt, different audience angle:

**Base:** "Sleep - most underrated performance tool"

**Context variations:**
- CEO version: "Sleep - why CEOs sacrifice performance"
- Student version: "Sleep - grades depend on this"
- Athlete version: "Sleep - where muscle actually grows"
- Entrepreneur version: "Sleep - affects decision quality"
- Parent version: "Sleep - modeling health for kids"

**5 audiences × 50 prompts = 250 audience-specific variations**

---

## VISUAL COMPANION MAPPING

Each slide type requires specific image guidance.

**Slide 1 (Hook) Images:**
- Problem visualization (dark, contrast-heavy)
- Stat/number (bold, minimal text overlay)
- Misconception (split screen showing false belief)
- Example (real-world instance of problem)

**Slide 2 (Setup) Images:**
- Split reality (before/after, true/false)
- Mechanism diagram (simplified visual of why)
- Proof (data visualization, study result)
- Scale (small → large progression)

**Slide 3 (Education A) Images:**
- Benefit visualization (person/product showing benefit)
- Process diagram (step-by-step mechanism)
- Real-world example (authentic context)
- Ingredient/component closeup

**Slide 4 (Education B) Images:**
- Secondary benefit visual (lifestyle shot)
- Measurement/metric visualization (chart, gauge)
- Alternative implementation (different approach)
- Result comparison (before/after dramatic)

**Slide 5 (CTA) Images:**
- Action shot (person doing the thing)
- Goal state (where they'll be after)
- 30-day challenge visual (calendar, progress)
- Community/movement (group energy)

---

## FEEDIA INTEGRATION

```typescript
// Load generator
import { CarouselPromptGenerator } from './CAROUSEL_PROMPT_GENERATOR';

// Generate infinite prompts
const generator = new CarouselPromptGenerator();

// Generate 10 new prompts based on user topic
const newPrompts = generator.generate(
  topic: 'productivity',
  audience: 'solopreneurs',
  quantity: 10,
  template: 'problem-solution'
);

// Use in carousel generation
for (const prompt of newPrompts) {
  const carousel = await generateCarouselWithAgents({
    structure: prompt,
    visualMapping: VISUAL_COMPANION_MAP[prompt.type],
  });
}
```

**Result:** From 50 base prompts → 2500+ unique carousel variations.

FeedIA brain learns patterns, generates infinite applications.
